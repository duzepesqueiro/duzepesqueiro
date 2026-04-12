import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProductStatus, RentalStatus } from '@prisma/client';
import { LogsService } from '../../../../application/logs/services';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { CreateRentalBookingDto, FilterRentalDto } from '../../dto/user';
import { AluguelEventName } from '../../events';
import { IAluguel } from '../../interfaces';
import { AluguelRepository } from '../../repositories';

interface IPaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Category {
  name: string;
  totalItems: number;
}

export interface RentalAvailabilityResult {
  rentalId: string;
  startDate: Date;
  endDate: Date;
  available: boolean;
  reason?: string;
}

@Injectable()
export class AluguelUserService {
  private readonly cacheTtlMs = 60_000;
  private readonly categoriesCache = new Map<string, { expiresAt: number; data: Category[] }>();
  private readonly availableCache = new Map<string, { expiresAt: number; data: IPaginatedResult<IAluguel> }>();

  constructor(
    private readonly aluguelRepository: AluguelRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly logsService: LogsService,
    private readonly prisma: PrismaService,
  ) {}

  async getAvailableRentals(
    filters: FilterRentalDto,
  ): Promise<IPaginatedResult<IAluguel>> {
    const cacheKey = `available:${filters.status ?? 'ALL'}`;
    const cached = this.availableCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    const page = 1;
    const limit = 20;
    const items = await this.aluguelRepository.findByFilters({
      status: filters.status,
      page,
      limit,
    });
    const result = {
      items,
      total: items.length,
      page,
      limit,
      totalPages: 1,
    };
    this.availableCache.set(cacheKey, {
      expiresAt: Date.now() + this.cacheTtlMs,
      data: result,
    });
    return result;
  }

  async getRentalById(id: string): Promise<IAluguel> {
    const rental = await this.aluguelRepository.findById(id);
    if (!rental) {
      throw new NotFoundException('Aluguel não encontrado');
    }
    return rental;
  }

  async searchRentals(query: string): Promise<IAluguel[]> {
    const sanitizedQuery = this.sanitizeSearchQuery(query);
    if (!sanitizedQuery) {
      return [];
    }
    const prisma = this.prisma as any;
    const rentals = await prisma.rental.findMany({
      where: {
        deletedAt: null,
        OR: [
          { notes: { contains: sanitizedQuery, mode: 'insensitive' } },
          { paymentMethod: { contains: sanitizedQuery, mode: 'insensitive' } },
          { paymentId: { contains: sanitizedQuery, mode: 'insensitive' } },
          { userId: { contains: sanitizedQuery, mode: 'insensitive' } },
        ],
      },
      include: { items: { where: { deletedAt: null } } },
      orderBy: { createdAt: 'desc' },
    });
    return rentals.map((item: any) => ({
      id: item.id,
      userId: item.userId,
      origin: item.origin,
      paymentStatus: item.paymentStatus,
      status:
        item.items.find((entry: any) => entry.status !== RentalStatus.RETURNED)
          ?.status ?? item.items[0]?.status,
      totalAmount: Number(item.totalAmount),
      rentalDate: item.rentalDate,
      returnDate: item.returnDate,
      periodType: item.periodType,
      periodValue: item.periodValue,
      notes: item.notes,
      paymentMethod: item.paymentMethod,
      paymentId: item.paymentId,
      paidAt: item.paidAt,
      deletedAt: item.deletedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  }

  async getRentalCategories(): Promise<Category[]> {
    const cacheKey = 'categories';
    const cached = this.categoriesCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    const prisma = this.prisma as any;
    const grouped = await prisma.product.groupBy({
      by: ['category'],
      where: {
        deletedAt: null,
        status: ProductStatus.RENTAL,
      },
      _count: {
        category: true,
      },
      orderBy: {
        category: 'asc',
      },
    });
    const result = grouped.map((item: any) => ({
      name: item.category,
      totalItems: item._count.category,
    }));
    this.categoriesCache.set(cacheKey, {
      expiresAt: Date.now() + this.cacheTtlMs,
      data: result,
    });
    return result;
  }

  async checkRentalAvailability(
    id: string,
    startDate: Date,
    endDate: Date,
  ): Promise<RentalAvailabilityResult> {
    const rental = await this.aluguelRepository.findById(id);
    if (!rental) {
      throw new NotFoundException('Aluguel não encontrado');
    }
    if (endDate.getTime() <= startDate.getTime()) {
      throw new BadRequestException('Período inválido para verificação');
    }

    const prisma = this.prisma as any;
    const sourceItems = await prisma.rentalItem.findMany({
      where: {
        rentalId: id,
        deletedAt: null,
      },
      select: {
        productId: true,
      },
    });

    if (!sourceItems.length) {
      return {
        rentalId: id,
        startDate,
        endDate,
        available: true,
      };
    }

    const productIds = sourceItems.map((item: any) => item.productId);
    const conflicts = await prisma.rentalItem.count({
      where: {
        deletedAt: null,
        rentalId: { not: id },
        productId: { in: productIds },
        status: { in: ['PENDING', 'ACTIVE', 'OVERDUE'] },
        rental: {
          deletedAt: null,
          rentalDate: { lte: endDate },
          returnDate: { gte: startDate },
        },
      },
    });

    const available = conflicts === 0;
    return {
      rentalId: id,
      startDate,
      endDate,
      available,
      reason: available ? undefined : 'Existem conflitos para o período informado',
    };
  }

  async createRental(userId: string, dto: CreateRentalBookingDto): Promise<IAluguel> {
    const aluguel = await this.aluguelRepository.create({
      userId,
      rentalDate: dto.rentalDate,
      returnDate: dto.returnDate,
      periodType: dto.periodType,
      periodValue: dto.periodValue,
      totalAmount: dto.quantity * dto.unitPrice,
      origin: 'ONLINE',
    });
    this.eventEmitter.emit(
      AluguelEventName.CREATED,
      { aluguelId: aluguel.id, userId: aluguel.userId },
      { async: true },
    );
    void this.logsService.info('rental', 'RentalCreatedByUser', { aluguelId: aluguel.id, userId }, aluguel.id);
    this.invalidateCaches();
    return aluguel;
  }

  async listMyRentals(userId: string, filters: FilterRentalDto): Promise<IAluguel[]> {
    const alugueis = await this.aluguelRepository.findByFilters({ ...filters, userId });
    return alugueis.filter((item) => item.userId === userId);
  }

  async getMyRentalById(userId: string, id: string): Promise<IAluguel> {
    const aluguel = await this.aluguelRepository.findById(id);
    if (!aluguel || aluguel.userId !== userId) {
      throw new NotFoundException('Aluguel não encontrado');
    }
    return aluguel;
  }

  private sanitizeSearchQuery(value: string): string {
    return String(value ?? '')
      .trim()
      .replace(/[^\p{L}\p{N}\s@._-]/gu, '')
      .slice(0, 120);
  }

  private invalidateCaches(): void {
    this.availableCache.clear();
    this.categoriesCache.clear();
  }
}

export { AluguelUserService as RentalUserService };
