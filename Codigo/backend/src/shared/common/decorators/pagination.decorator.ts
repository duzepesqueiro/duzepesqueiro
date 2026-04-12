import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PaginationDto } from '../../dto/pagination.dto';

type Direction = 'asc' | 'desc';

export type PaginationParamsDto = PaginationDto & {
  sortBy: string;
  sortDirection: Direction;
};

export const PaginationParams = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PaginationParamsDto => {
    const request = ctx.switchToHttp().getRequest();
    const query = request.query as Record<string, string | undefined>;
    const pageRaw = Number.parseInt(query.page ?? '1', 10);
    const limitRaw = Number.parseInt(query.limit ?? '10', 10);
    const sortBy = query.sortBy ?? 'createdAt';
    const sortDirection = query.sortDirection === 'asc' ? 'asc' : 'desc';

    return {
      page: Number.isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw,
      limit:
        Number.isNaN(limitRaw) || limitRaw < 1
          ? 10
          : limitRaw > 100
            ? 100
            : limitRaw,
      sortBy,
      sortDirection,
    };
  },
);
