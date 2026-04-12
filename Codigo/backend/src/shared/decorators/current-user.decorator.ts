import { createParamDecorator, ExecutionContext } from '@nestjs/common';

type IUser = {
  id: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
};

export const CurrentUser = createParamDecorator(
  (data: keyof IUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as IUser | undefined;
    return data ? user?.[data] : user;
  },
);
