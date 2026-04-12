import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const roles = (user?.roles as UserRole[] | undefined) ?? [];
    const role = user?.role as UserRole | undefined;

    if (!user || (roles.length === 0 && !role)) {
      return false;
    }

    if (roles.includes(UserRole.ADMIN) || role === UserRole.ADMIN) {
      return true;
    }

    return requiredRoles.some((requiredRole) =>
      roles.length > 0 ? roles.includes(requiredRole) : role === requiredRole,
    );
  }
}
