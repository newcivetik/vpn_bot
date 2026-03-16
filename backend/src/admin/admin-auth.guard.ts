import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing auth token');
    }

    const token = authHeader.slice(7);
    try {
      const payload = await this.jwtService.verifyAsync(token);
      if (payload.role !== 'admin') {
        throw new UnauthorizedException('Invalid role');
      }
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
