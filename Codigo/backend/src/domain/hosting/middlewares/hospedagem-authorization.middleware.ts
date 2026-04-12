import {
  ForbiddenException,
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { verify } from 'jsonwebtoken';

type Role = UserRole;

type AuthorizationRule = {
  method: string;
  path: RegExp;
  allowAnonymous?: boolean;
  allowedRoles?: Role[];
};

type JwtPayload = {
  sub?: string;
  role?: Role;
};

@Injectable()
export class HospedagemAuthorizationMiddleware implements NestMiddleware {
  private static readonly OPERATOR_ROLES: Role[] = [UserRole.EMPLOYEE, UserRole.MANAGER];
  private static readonly ADMIN_ROLES: Role[] = [UserRole.ADMIN];
  private static readonly AUTHENTICATED_ROLES: Role[] = [
    UserRole.CUSTOMER,
    UserRole.EMPLOYEE,
    UserRole.MANAGER,
    UserRole.ADMIN,
  ];

  private readonly rules: AuthorizationRule[] = [
    { method: 'GET', path: /^\/chales$/, allowAnonymous: true },
    { method: 'GET', path: /^\/chales\/[^/]+$/, allowAnonymous: true },
    { method: 'POST', path: /^\/chales$/, allowedRoles: HospedagemAuthorizationMiddleware.ADMIN_ROLES },
    { method: 'PUT', path: /^\/chales\/[^/]+$/, allowedRoles: HospedagemAuthorizationMiddleware.ADMIN_ROLES },
    { method: 'DELETE', path: /^\/chales\/[^/]+$/, allowedRoles: HospedagemAuthorizationMiddleware.ADMIN_ROLES },
    {
      method: 'PATCH',
      path: /^\/chales\/[^/]+\/status$/,
      allowedRoles: [...HospedagemAuthorizationMiddleware.ADMIN_ROLES, ...HospedagemAuthorizationMiddleware.OPERATOR_ROLES],
    },
    {
      method: 'GET',
      path: /^\/reservas$/,
      allowedRoles: HospedagemAuthorizationMiddleware.AUTHENTICATED_ROLES,
    },
    {
      method: 'POST',
      path: /^\/reservas$/,
      allowedRoles: HospedagemAuthorizationMiddleware.AUTHENTICATED_ROLES,
    },
    {
      method: 'POST',
      path: /^\/reservas\/manual$/,
      allowedRoles: [...HospedagemAuthorizationMiddleware.ADMIN_ROLES, ...HospedagemAuthorizationMiddleware.OPERATOR_ROLES],
    },
    {
      method: 'POST',
      path: /^\/reservas\/[^/]+\/checkin$/,
      allowedRoles: [...HospedagemAuthorizationMiddleware.ADMIN_ROLES, ...HospedagemAuthorizationMiddleware.OPERATOR_ROLES],
    },
    {
      method: 'POST',
      path: /^\/reservas\/[^/]+\/checkout$/,
      allowedRoles: [...HospedagemAuthorizationMiddleware.ADMIN_ROLES, ...HospedagemAuthorizationMiddleware.OPERATOR_ROLES],
    },
    {
      method: 'POST',
      path: /^\/reservas\/[^/]+\/cancelar$/,
      allowedRoles: HospedagemAuthorizationMiddleware.AUTHENTICATED_ROLES,
    },
    {
      method: 'GET',
      path: /^\/bloqueios$/,
      allowedRoles: [...HospedagemAuthorizationMiddleware.ADMIN_ROLES, ...HospedagemAuthorizationMiddleware.OPERATOR_ROLES],
    },
    {
      method: 'POST',
      path: /^\/bloqueios$/,
      allowedRoles: [...HospedagemAuthorizationMiddleware.ADMIN_ROLES, ...HospedagemAuthorizationMiddleware.OPERATOR_ROLES],
    },
    {
      method: 'GET',
      path: /^\/precos\/regras$/,
      allowedRoles: HospedagemAuthorizationMiddleware.ADMIN_ROLES,
    },
    {
      method: 'POST',
      path: /^\/precos\/regras$/,
      allowedRoles: HospedagemAuthorizationMiddleware.ADMIN_ROLES,
    },
    {
      method: 'PUT',
      path: /^\/precos\/regras\/[^/]+$/,
      allowedRoles: HospedagemAuthorizationMiddleware.ADMIN_ROLES,
    },
    {
      method: 'DELETE',
      path: /^\/precos\/regras\/[^/]+$/,
      allowedRoles: HospedagemAuthorizationMiddleware.ADMIN_ROLES,
    },
  ];

  constructor(private readonly configService: ConfigService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const rule = this.resolveRule(req.method, req.path);
    if (!rule) {
      next();
      return;
    }

    if (rule.allowAnonymous) {
      next();
      return;
    }

    const user = this.extractUser(req);
    if (!rule.allowedRoles?.includes(user.role)) {
      throw new ForbiddenException('Usuário sem permissão para acessar este recurso de hospedagem.');
    }

    (req as Request & { user?: Record<string, unknown> }).user = {
      ...((req as Request & { user?: Record<string, unknown> }).user ?? {}),
      id: user.id,
      role: user.role,
    };

    next();
  }

  private resolveRule(method: string, path: string): AuthorizationRule | undefined {
    const normalizedPath = this.normalizePath(path);
    return this.rules.find((rule) => rule.method === method.toUpperCase() && rule.path.test(normalizedPath));
  }

  private normalizePath(path: string): string {
    const withoutQuery = path.split('?')[0] ?? '/';
    const withoutApiPrefix = withoutQuery.startsWith('/api/')
      ? withoutQuery.slice('/api'.length)
      : withoutQuery;
    const trimmed = withoutApiPrefix.replace(/\/+$/, '');
    return trimmed.length > 0 ? trimmed : '/';
  }

  private extractUser(req: Request): { id: string; role: Role } {
    const existingUser = (req as Request & { user?: { id?: string; role?: Role } }).user;
    if (existingUser?.id && existingUser?.role) {
      return {
        id: existingUser.id,
        role: existingUser.role,
      };
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autenticação não informado.');
    }

    const token = authHeader.slice('Bearer '.length).trim();
    const secret = this.configService.get<string>('jwt.secret');
    if (!secret) {
      throw new UnauthorizedException('Configuração de autenticação indisponível.');
    }

    let payload: JwtPayload;
    try {
      payload = verify(token, secret) as JwtPayload;
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }

    if (!payload?.sub || !payload?.role) {
      throw new UnauthorizedException('Token sem credenciais de usuário.');
    }

    return {
      id: payload.sub,
      role: payload.role,
    };
  }
}
