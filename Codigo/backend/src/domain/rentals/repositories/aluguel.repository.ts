import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RentalStatus } from '@prisma/client';
import { LogsService } from '../../../application/logs/services';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  DateRange,
  IAluguel,
  IRentalCreate,
  IRentalFilter,
  IRentalRepository,
  IRentalUpdate,
} from '../interfaces';

@Injectable()
export class AluguelRepository implements IRentalRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  async create(data: IRentalCreate): Promise<IAluguel> {
    const prisma = this.prisma as any;
    const rental = await prisma.$transaction(async (tx: any) => {
      const createdRental = await tx.rental.create({
        data: {
          userId: data.userId,
          origin: data.origin,
          paymentStatus: data.paymentStatus ?? 'PENDING',
          totalAmount: new Prisma.Decimal(data.totalAmount),
          rentalDate: new Date(data.rentalDate),
          returnDate: new Date(data.returnDate),
          periodType: data.periodType,
          periodValue: data.periodValue,
          notes: data.notes,
        },
      });

      if (data.items?.length) {
        await tx.rentalItem.createMany({
          data: data.items.map((item) => ({
            rentalId: createdRental.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(item.unitPrice),
            subtotal: new Prisma.Decimal(item.subtotal ?? item.quantity * item.unitPrice),
            status: RentalStatus.PENDING,
          })),
        });
      }

      return tx.rental.findUniqueOrThrow({
        where: { id: createdRental.id },
        include: { items: { where: { deletedAt: null } } },
      });
    });

    void this.logsService.info(
      'rental',
      'RentalCreated',
      { rentalId: rental.id, userId: rental.userId },
      rental.id,
    );

    return this.mapRental(rental);
  }

  async findById(id: string): Promise<IAluguel | null> {
    const prisma = this.prisma as any;
    const rental = await prisma.rental.findFirst({
      where: { id, deletedAt: null },
      include: { items: { where: { deletedAt: null } } },
    });
    return rental ? this.mapRental(rental) : null;
  }

  async findByFilters(filters: IRentalFilter): Promise<IAluguel[]> {
    const prisma = this.prisma as any;
    const where: Prisma.RentalWhereInput = {
      deletedAt: null,
      userId: filters.userId,
      origin: filters.origin,
      rentalDate: this.buildDateFilter(filters),
      items: filters.status
        ? { some: { status: filters.status, deletedAt: null } }
        : undefined,
    };

    const rentals = await prisma.rental.findMany({
      where,
      include: { items: { where: { deletedAt: null } } },
      skip:
        filters.page && filters.limit
          ? (filters.page - 1) * filters.limit
          : undefined,
      take: filters.limit,
      orderBy: { createdAt: 'desc' },
    });
    return rentals.map((item: any) => this.mapRental(item));
  }

  async update(id: string, data: IRentalUpdate): Promise<IAluguel> {
    const prisma = this.prisma as any;
    const updateData = data as any;
    await this.ensureExists(id);
    const rental = await prisma.rental.update({
      where: { id },
      data: {
        origin: updateData.origin,
        paymentStatus: updateData.paymentStatus,
        totalAmount:
          updateData.totalAmount !== undefined
            ? new Prisma.Decimal(updateData.totalAmount)
            : undefined,
        rentalDate: updateData.rentalDate ? new Date(updateData.rentalDate) : undefined,
        returnDate: updateData.returnDate ? new Date(updateData.returnDate) : undefined,
        periodType: updateData.periodType,
        periodValue: updateData.periodValue,
        notes: updateData.notes,
        paymentMethod: updateData.paymentMethod,
        paymentId: updateData.paymentId,
        paidAt: updateData.paidAt ? new Date(updateData.paidAt) : undefined,
      },
      include: { items: { where: { deletedAt: null } } },
    });
    void this.logsService.info(
      'rental',
      'RentalUpdated',
      { rentalId: id },
      id,
    );
    return this.mapRental(rental);
  }

  async softDelete(id: string): Promise<void> {
    const prisma = this.prisma as any;
    await this.ensureExists(id);
    await prisma.$transaction(async (tx: any) => {
      await tx.rental.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      await tx.rentalItem.updateMany({
        where: { rentalId: id, deletedAt: null },
        data: { deletedAt: new Date() },
      });
    });
    void this.logsService.warn('rental', 'RentalSoftDeleted', { rentalId: id }, id);
  }

  async findAvailableItems(
    category?: string,
    dates?: DateRange,
  ): Promise<IAluguel[]> {
    const prisma = this.prisma as any;
    const rentals = await prisma.rental.findMany({
      where: {
        deletedAt: null,
        ...(dates
          ? {
              OR: [
                {
                  rentalDate: {
                    lte: dates.endDate,
                  },
                  returnDate: {
                    gte: dates.startDate,
                  },
                },
              ],
            }
          : {}),
        items: category
          ? {
              some: {
                deletedAt: null,
                product: {
                  category: category as any,
                },
              },
            }
          : undefined,
      },
      include: { items: { where: { deletedAt: null } } },
      orderBy: { rentalDate: 'asc' },
    });
    return rentals.map((item: any) => this.mapRental(item));
  }

  async countByStatus(status: RentalStatus): Promise<number> {
    const prisma = this.prisma as any;
    return prisma.rentalItem.count({
      where: {
        status,
        deletedAt: null,
        rental: { deletedAt: null },
      },
    });
  }

  async countByPeriod(startDate: Date, endDate: Date): Promise<number> {
    const prisma = this.prisma as any;
    return prisma.rental.count({
      where: {
        deletedAt: null,
        rentalDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
  }

  private async ensureExists(id: string): Promise<void> {
    const prisma = this.prisma as any;
    const existing = await prisma.rental.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Rental not found');
    }
  }

  private buildDateFilter(filters: IRentalFilter): Prisma.DateTimeFilter | undefined {
    if (!filters.rentalDateFrom && !filters.rentalDateTo) {
      return undefined;
    }
    const fromDate = filters.rentalDateFrom
      ? new Date(filters.rentalDateFrom)
      : undefined;
    const toDate = filters.rentalDateTo
      ? new Date(filters.rentalDateTo)
      : undefined;
    return {
      gte: fromDate,
      lte: toDate,
    };
  }

  private mapRental(
    rental: Prisma.RentalGetPayload<{ include: { items: true } }>,
  ): IAluguel {
    const currentStatus =
      rental.items.find((item: any) => item.status !== RentalStatus.RETURNED)?.status ??
      rental.items[0]?.status;
    return {
      id: rental.id,
      userId: rental.userId,
      origin: rental.origin,
      paymentStatus: rental.paymentStatus,
      status: currentStatus,
      totalAmount: Number(rental.totalAmount),
      rentalDate: rental.rentalDate,
      returnDate: rental.returnDate,
      periodType: rental.periodType,
      periodValue: rental.periodValue,
      notes: rental.notes,
      paymentMethod: rental.paymentMethod,
      paymentId: rental.paymentId,
      paidAt: rental.paidAt,
      deletedAt: rental.deletedAt,
      createdAt: rental.createdAt,
      updatedAt: rental.updatedAt,
    };
  }
}

export { AluguelRepository as RentalRepository };
