import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';

export const authorized = (header?: string): boolean => {
  const token = process.env.ADMIN_TOKEN;
  if (!token || typeof header !== 'string') return false;
  const expected = Buffer.from(`Bearer ${token}`);
  const provided = Buffer.from(header);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
};

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (!authorized(context.switchToHttp().getRequest().headers.authorization)) throw new UnauthorizedException();
    return true;
  }
}
