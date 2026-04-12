import {
  createParamDecorator,
  ExecutionContext,
  Inject,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const CURRENT_USER_KEY = 'currentUser';

export const CurrentUser = () => Inject(CURRENT_USER_KEY);

export const CurrentUserIsAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): boolean => {
    const request = ctx.switchToHttp().getRequest();
    const roles = request.user?.roles as UserRole[] | undefined;
    const role = request.user?.role as UserRole | undefined;
    return Boolean(roles?.includes(UserRole.ADMIN) || role === UserRole.ADMIN);
  },
);
