import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { PaginationDto } from '../../../shared/dto';

type SortDirection = 'asc' | 'desc';

export abstract class BaseRepository<T, CreateDto, UpdateDto> {
  protected abstract readonly prisma: PrismaService;
  protected abstract readonly modelName: string;
  protected abstract readonly includeRelations: Record<string, boolean | object>;

  async findAll<TPaginationResult>(
    pagination: PaginationDto & Record<string, unknown>,
    filters?: Record<string, unknown>,
  ): Promise<TPaginationResult> {
    const model = this.getModelDelegate();
    const page = Number((pagination.page as number) ?? (pagination.pagina as number) ?? 1);
    const limit = Number((pagination.limit as number) ?? (pagination.itensPorPagina as number) ?? 10);
    const sortBy = String(
      (pagination.sortBy as string) ??
        (pagination.ordenacao as string) ??
        'createdAt',
    );
    const sortDirection = String(
      (pagination.sortDirection as string) ??
        (pagination.direcaoOrdenacao as string) ??
        'desc',
    ) as SortDirection;

    const where: Record<string, unknown> = {
      ...(filters ?? {}),
      deletedAt:
        filters && 'includeDeleted' in filters && filters.includeDeleted
          ? undefined
          : null,
    };

    delete where.includeDeleted;
    delete where.incluirDeletados;

    const [items, total] = await Promise.all([
      model.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortDirection },
        include: this.includeRelations,
      }),
      model.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    } as TPaginationResult;
  }

  async findById(id: string): Promise<T> {
    const model = this.getModelDelegate();
    const item = await model.findUnique({
      where: { id },
      include: this.includeRelations,
    });
    if (!item || item.deletedAt !== null) {
      throw new NotFoundException(`${this.modelName} not found`);
    }
    return item as T;
  }

  async findByIdWithDeleted(id: string): Promise<T> {
    const model = this.getModelDelegate();
    const item = await model.findUnique({
      where: { id },
      include: this.includeRelations,
    });
    if (!item) {
      throw new NotFoundException(`${this.modelName} not found`);
    }
    return item as T;
  }

  async create(dto: CreateDto, userId: string): Promise<T> {
    const model = this.getModelDelegate();
    const data = this.prepareCreateData(dto, userId);
    const item = await model.create({
      data,
      include: this.includeRelations,
    });
    return item as T;
  }

  async update(id: string, dto: UpdateDto, userId: string): Promise<T> {
    const model = this.getModelDelegate();
    await this.ensureExists(id);
    const data = this.prepareUpdateData(dto, userId);
    const item = await model.update({
      where: { id },
      data,
      include: this.includeRelations,
    });
    return item as T;
  }

  async softDelete(id: string): Promise<void> {
    const model = this.getModelDelegate();
    await this.ensureExists(id);
    await model.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  protected abstract prepareCreateData(dto: CreateDto, userId: string): unknown;
  protected abstract prepareUpdateData(dto: UpdateDto, userId: string): unknown;

  protected async ensureExists(id: string): Promise<void> {
    const model = this.getModelDelegate();
    const exists = await model.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    });
    if (!exists || exists.deletedAt !== null) {
      throw new NotFoundException(`${this.modelName} not found`);
    }
  }

  protected async ensureExistsWithLock(id: string): Promise<Record<string, unknown>> {
    const model = this.getModelDelegate();
    const item = await model.findUnique({
      where: { id },
    });
    if (!item || item.deletedAt !== null) {
      throw new NotFoundException(`${this.modelName} not found`);
    }
    return item as Record<string, unknown>;
  }

  protected getModelDelegate(): any {
    return (this.prisma as any)[this.modelName];
  }
}
