import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Server } from '../server/server.entity';
import { XuiApiResponse, XuiClientTraffic } from './vpn.types';

@Injectable()
export class VpnService {
  private readonly logger = new Logger(VpnService.name);
  private sessionCookies = new Map<number, string>(); // serverId -> cookie

  private getBaseUrl(server: Server): string {
    return `https://${server.host}:${server.apiPort}`;
  }

  private async login(server: Server): Promise<string> {
    const url = `${this.getBaseUrl(server)}/login`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `username=${encodeURIComponent(server.username)}&password=${encodeURIComponent(server.password)}`,
    });

    const cookies = res.headers.getSetCookie?.() || [];
    const sessionCookie = cookies.map((c) => c.split(';')[0]).join('; ');

    if (!sessionCookie) {
      throw new Error(`Не удалось авторизоваться в 3X-UI: ${server.host}`);
    }

    this.sessionCookies.set(server.id, sessionCookie);
    return sessionCookie;
  }

  private async apiCall<T>(
    server: Server,
    path: string,
    body?: any,
    method = 'POST',
  ): Promise<XuiApiResponse<T>> {
    let cookie = this.sessionCookies.get(server.id);
    if (!cookie) {
      cookie = await this.login(server);
    }

    const url = `${this.getBaseUrl(server)}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    let res = await fetch(url, options);

    // Если сессия истекла, перелогиниваемся (одна попытка)
    if (res.status === 401 || res.status === 307) {
      this.sessionCookies.delete(server.id);
      cookie = await this.login(server);
      options.headers = { ...(options.headers as any), Cookie: cookie };
      res = await fetch(url, options);
      if (res.status === 401 || res.status === 307) {
        throw new Error(`3X-UI auth failed after re-login: ${server.host}`);
      }
    }

    return res.json();
  }

  async createClient(
    server: Server,
    options: {
      telegramId: number;
      trafficLimitGB: number;
      expiryDays: number;
      maxDevices: number;
    },
  ): Promise<{ clientId: string; email: string; connectionLink: string }> {
    const clientId = uuidv4();
    const email = `tg_${options.telegramId}_${Date.now()}`;
    const totalBytes =
      options.trafficLimitGB > 0
        ? options.trafficLimitGB * 1024 * 1024 * 1024
        : 0;
    const expiryTime =
      options.expiryDays > 0
        ? Date.now() + options.expiryDays * 24 * 60 * 60 * 1000
        : 0;

    const clientSettings = {
      id: clientId,
      flow: 'xtls-rprx-vision',
      email,
      limitIp: options.maxDevices,
      totalGB: totalBytes,
      expiryTime,
      enable: true,
      tgId: String(options.telegramId),
      subId: '',
    };

    const result = await this.apiCall(server, `/panel/api/inbounds/addClient`, {
      id: server.inboundId,
      settings: JSON.stringify({ clients: [clientSettings] }),
    });

    if (!result.success) {
      throw new Error(`Ошибка создания VPN-клиента: ${result.msg}`);
    }

    // Получаем настройки inbound для генерации ссылки
    const connectionLink = await this.generateConnectionLink(server, clientId);

    this.logger.log(`Создан VPN-клиент: ${email} на сервере ${server.name}`);

    return { clientId, email, connectionLink };
  }

  async deleteClient(server: Server, clientId: string): Promise<void> {
    const result = await this.apiCall(
      server,
      `/panel/api/inbounds/${server.inboundId}/delClient/${clientId}`,
    );

    if (!result.success) {
      this.logger.warn(`Ошибка удаления клиента ${clientId}: ${result.msg}`);
    }
  }

  async toggleClient(
    server: Server,
    clientId: string,
    email: string,
    enable: boolean,
  ): Promise<void> {
    const result = await this.apiCall(
      server,
      `/panel/api/inbounds/updateClient/${clientId}`,
      {
        id: server.inboundId,
        settings: JSON.stringify({
          clients: [{ id: clientId, email, enable }],
        }),
      },
    );

    if (!result.success) {
      this.logger.warn(
        `Ошибка ${enable ? 'включения' : 'выключения'} клиента ${clientId}: ${result.msg}`,
      );
    }
  }

  async getClientTraffic(
    server: Server,
    email: string,
  ): Promise<XuiClientTraffic | null> {
    const result = await this.apiCall<XuiClientTraffic>(
      server,
      `/panel/api/inbounds/getClientTraffics/${email}`,
      undefined,
      'GET',
    );

    if (!result.success || !result.obj) return null;
    return result.obj;
  }

  async checkServerHealth(
    server: Server,
  ): Promise<{ online: boolean; version?: string }> {
    try {
      // Use login endpoint — more reliable than root URL
      // Also tests that 3X-UI is actually responding to API calls
      const url = `${this.getBaseUrl(server)}/login`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `username=${encodeURIComponent(server.username)}&password=${encodeURIComponent(server.password)}`,
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok || res.status === 302) {
        // Cache session cookie from health check
        const cookies = res.headers.getSetCookie?.() || [];
        const sessionCookie = cookies.map((c) => c.split(';')[0]).join('; ');
        if (sessionCookie) {
          this.sessionCookies.set(server.id, sessionCookie);
        }
        return { online: true };
      }
      return { online: false };
    } catch {
      return { online: false };
    }
  }

  private async generateConnectionLink(
    server: Server,
    clientId: string,
  ): Promise<string> {
    // Получаем inbound для параметров подключения
    const result = await this.apiCall<any>(
      server,
      `/panel/api/inbounds/get/${server.inboundId}`,
      undefined,
      'GET',
    );

    if (!result.success || !result.obj) {
      return `vless://${clientId}@${server.host}:${server.port}?type=tcp&security=reality&flow=xtls-rprx-vision#VPN`;
    }

    const inbound = result.obj;
    const stream = JSON.parse(inbound.streamSettings || '{}');
    const reality = stream?.realitySettings || {};
    const serverNames = reality?.serverNames?.[0] || 'google.com';
    const publicKey = reality?.settings?.publicKey || '';
    const shortId = reality?.shortIds?.[0] || '';
    const fingerprint =
      stream?.tlsSettings?.fingerprint ||
      reality?.settings?.fingerprint ||
      'chrome';

    const params = new URLSearchParams({
      type: stream?.network || 'tcp',
      security: 'reality',
      pbk: publicKey,
      fp: fingerprint,
      sni: serverNames,
      sid: shortId,
      flow: 'xtls-rprx-vision',
    });

    return `vless://${clientId}@${server.host}:${server.port}?${params.toString()}#VPN-${server.location}`;
  }
}
