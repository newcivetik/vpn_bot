export interface XuiClientSettings {
  id: string; // UUID
  flow: string;
  email: string;
  limitIp: number;
  totalGB: number; // bytes
  expiryTime: number; // timestamp ms (0 = never)
  enable: boolean;
  tgId: string;
  subId: string;
}

export interface XuiInbound {
  id: number;
  remark: string;
  port: number;
  protocol: string;
  settings: string; // JSON string
  streamSettings: string; // JSON string
  tag: string;
}

export interface XuiClientTraffic {
  id: number;
  inboundId: number;
  enable: boolean;
  email: string;
  up: number; // bytes
  down: number; // bytes
  expiryTime: number;
  total: number;
}

export interface XuiApiResponse<T = any> {
  success: boolean;
  msg: string;
  obj: T;
}
