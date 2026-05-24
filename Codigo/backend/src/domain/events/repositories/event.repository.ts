import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  IEvent,
  IEventCreate,
  IEventFilter,
  IEventRepository,
  IPaginatedResult,
  IPagination,
  IEventUpdate,
} from '../interfaces';

@Injectable()
export class EventRepository implements IEventRepository {
  private readonly logger = new Logger(EventRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: IEventCreate): Promise<IEvent> {
    try {
      const prisma = this.prisma as any;
      const created = await prisma.event.create({
        data: {
          title: data.title,
          description: data.description,
          rules: data.rules,
          location: data.location,
          imageUrl: data.imageUrl,
          imageKey: data.imageKey,
          totalSlots: data.totalSlots,
          availableSlots: data.availableSlots ?? data.totalSlots,
          eventDate: data.eventDate,
          eventTime: data.eventTime,
          status: data.status ?? 'SCHEDULED',
          price: data.price ?? null,
          isPaid: data.isPaid,
        },
        include: {
          eventImages: { orderBy: { createdAt: 'asc' } },
        },
      });
      this.logger.log(`Evento criado com sucesso id=${created.id}`);
      return this.mapEvent(created);
    } catch (error) {
      this.logger.error('Falha ao criar evento', error as Error);
      throw error;
    }
  }

  async findById(id: string): Promise<IEvent | null> {
    try {
      const prisma = this.prisma as any;
      const row = await prisma.event.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        include: {
          eventImages: { orderBy: { createdAt: 'asc' } },
        },
      });
      return row ? this.mapEvent(row) : null;
    } catch (error) {
      this.logger.error(`Falha ao buscar evento id=${id}`, error as Error);
      throw error;
    }
  }

  async findAll(
    filters: IEventFilter,
    pagination: IPagination,
  ): Promise<IPaginatedResult<IEvent>> {
    try {
      const prisma = this.prisma as any;
      const where = this.buildWhere(filters);
      const page = pagination.page;
      const limit = pagination.limit;
      const skip = (page - 1) * limit;
      const orderBy = this.buildOrderBy(filters);

      const [items, total] = await prisma.$transaction([
        prisma.event.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            eventImages: { orderBy: { createdAt: 'asc' } },
          },
        }),
        prisma.event.count({ where }),
      ]);

      return {
        items: items.map((item: any) => this.mapEvent(item)),
        total,
        page,
        pageSize: limit,
      };
    } catch (error) {
      this.logger.error('Falha ao listar eventos paginados', error as Error);
      throw error;
    }
  }

  async countImages(eventId: string): Promise<number> {
    const prisma = this.prisma as any;
    return prisma.eventImage.count({
      where: { eventId },
    });
  }

  async addImages(
    eventId: string,
    images: Array<{ imageUrl: string; imageKey: string }>,
  ): Promise<void> {
    if (!images.length) {
      return;
    }
    const prisma = this.prisma as any;
    await prisma.eventImage.createMany({
      data: images.map((image) => ({
        eventId,
        imageUrl: image.imageUrl,
        imageKey: image.imageKey,
      })),
    });
  }

  async listImageKeys(eventId: string): Promise<string[]> {
    const prisma = this.prisma as any;
    const rows = await prisma.eventImage.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
      select: { imageKey: true },
    });
    return rows.map((row: any) => row.imageKey);
  }

  async findByFilters(filters: IEventFilter): Promise<IEvent[]> {
    try {
      const prisma = this.prisma as any;
      const where = this.buildWhere(filters);
      const orderBy = this.buildOrderBy(filters);
      const rows = await prisma.event.findMany({
        where,
        orderBy,
        include: {
          eventImages: { orderBy: { createdAt: 'asc' } },
        },
      });
      return rows.map((item: any) => this.mapEvent(item));
    } catch (error) {
      this.logger.error('Falha ao listar eventos por filtros', error as Error);
      throw error;
    }
  }

  async findNearestByTime(time: string, date: Date): Promise<IEvent | null> {
    try {
      const prisma = this.prisma as any;
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const row = await prisma.event.findFirst({
        where: {
          deletedAt: null,
          eventDate: { gte: startOfDay, lte: endOfDay },
          eventTime: { gte: time },
          status: { in: ['SCHEDULED', 'UPCOMING', 'IN_PROGRESS'] },
        },
        orderBy: [{ eventDate: 'asc' }, { eventTime: 'asc' }],
        include: {
          eventImages: { orderBy: { createdAt: 'asc' } },
        },
      });
      return row ? this.mapEvent(row) : null;
    } catch (error) {
      this.logger.error('Falha ao buscar evento mais próximo', error as Error);
      throw error;
    }
  }

  async update(id: string, data: IEventUpdate): Promise<IEvent> {
    try {
      const prisma = this.prisma as any;
      const updated = await prisma.event.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description,
          rules: data.rules,
          location: data.location,
          imageUrl: data.imageUrl,
          imageKey: data.imageKey,
          totalSlots: data.totalSlots,
          availableSlots: data.availableSlots,
          eventDate: data.eventDate,
          eventTime: data.eventTime,
          status: data.status,
          price: data.price,
          isPaid: data.isPaid,
          deletedAt: data.deletedAt,
        },
        include: {
          eventImages: { orderBy: { createdAt: 'asc' } },
        },
      });
      this.logger.log(`Evento atualizado id=${id}`);
      return this.mapEvent(updated);
    } catch (error) {
      this.logger.error(`Falha ao atualizar evento id=${id}`, error as Error);
      throw error;
    }
  }

  async softDelete(id: string): Promise<void> {
    try {
      const prisma = this.prisma as any;
      await prisma.event.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      this.logger.warn(`Evento removido logicamente id=${id}`);
    } catch (error) {
      this.logger.error(`Falha no soft delete do evento id=${id}`, error as Error);
      throw error;
    }
  }

  async restore(id: string): Promise<void> {
    try {
      const prisma = this.prisma as any;
      await prisma.event.update({
        where: { id },
        data: { deletedAt: null },
      });
      this.logger.log(`Evento restaurado id=${id}`);
    } catch (error) {
      this.logger.error(`Falha ao restaurar evento id=${id}`, error as Error);
      throw error;
    }
  }

  async countByStatus(status: IEvent['status']): Promise<number> {
    try {
      const prisma = this.prisma as any;
      return prisma.event.count({
        where: {
          status,
          deletedAt: null,
        },
      });
    } catch (error) {
      this.logger.error(`Falha ao contar eventos por status=${status}`, error as Error);
      throw error;
    }
  }

  async countByMonth(month: number, year: number): Promise<number> {
    try {
      const prisma = this.prisma as any;
      const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      return prisma.event.count({
        where: {
          deletedAt: null,
          eventDate: {
            gte: start,
            lte: end,
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `Falha ao contar eventos do mês=${month} ano=${year}`,
        error as Error,
      );
      throw error;
    }
  }

  async findSoldOutEvents(month: number, year: number): Promise<IEvent[]> {
    try {
      const prisma = this.prisma as any;
      const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      const rows = await prisma.event.findMany({
        where: {
          deletedAt: null,
          eventDate: { gte: start, lte: end },
          availableSlots: 0,
        },
        orderBy: [{ eventDate: 'asc' }, { eventTime: 'asc' }],
        include: {
          eventImages: { orderBy: { createdAt: 'asc' } },
        },
      });
      return rows.map((item: any) => this.mapEvent(item));
    } catch (error) {
      this.logger.error('Falha ao buscar eventos lotados', error as Error);
      throw error;
    }
  }

  private computeStatus(eventDate: Date, eventTime: string | null, storedStatus: string): IEvent['status'] {
    if (storedStatus === 'CANCELLED') return 'CANCELLED';
    if (!eventDate) return 'SCHEDULED';
    const datePart = eventDate.toISOString().split('T')[0];
    const dateStr = eventTime ? `${datePart}T${eventTime}:00` : `${datePart}T00:00:00`;
    const eventDateTime = new Date(dateStr);
    if (isNaN(eventDateTime.getTime())) return 'SCHEDULED';
    const diffMs = eventDateTime.getTime() - Date.now();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffMs < 0) return 'COMPLETED';
    if (diffDays <= 3) return 'UPCOMING';
    return 'SCHEDULED';
  }

  private mapEvent(row: any): IEvent {
    const mappedImages = Array.isArray(row?.eventImages)
      ? row.eventImages.map((image: any) => image.imageUrl)
      : row?.imageUrl
      ? [row.imageUrl]
      : [];
    const mappedImageKeys = Array.isArray(row?.eventImages)
      ? row.eventImages.map((image: any) => image.imageKey)
      : row?.imageKey
      ? [row.imageKey]
      : [];
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      rules: row.rules,
      location: row.location,
      imageUrl: row.imageUrl,
      imageKey: row.imageKey,
      images: mappedImages,
      imageKeys: mappedImageKeys,
      totalSlots: row.totalSlots,
      availableSlots: row.availableSlots,
      eventDate: row.eventDate,
      eventTime: row.eventTime,
      status: this.computeStatus(row.eventDate, row.eventTime, row.status),
      price: row.price ? Number(row.price) : null,
      isPaid: row.isPaid,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    };
  }

  private buildWhere(filters: IEventFilter): Record<string, unknown> {
    const where: Record<string, unknown> = {
      deletedAt: filters.includeDeleted ? undefined : null,
    };

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { location: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.statuses?.length) {
      where.status = { in: filters.statuses };
    }
    if (typeof filters.isPaid === 'boolean') {
      where.isPaid = filters.isPaid;
    }
    if (filters.fromDate || filters.toDate) {
      where.eventDate = {
        ...(filters.fromDate ? { gte: filters.fromDate } : {}),
        ...(filters.toDate ? { lte: filters.toDate } : {}),
      };
    }
    if (typeof filters.minPrice === 'number' || typeof filters.maxPrice === 'number') {
      where.price = {
        ...(typeof filters.minPrice === 'number' ? { gte: filters.minPrice } : {}),
        ...(typeof filters.maxPrice === 'number' ? { lte: filters.maxPrice } : {}),
      };
    }
    if (filters.hasAvailableSlots) {
      where.availableSlots = { gt: 0 };
    }

    return where;
  }

  private buildOrderBy(filters: IEventFilter): Record<string, 'asc' | 'desc'> {
    const field = filters.orderBy ?? 'eventDate';
    const direction = filters.orderDirection ?? 'asc';
    return { [field]: direction };
  }
}
