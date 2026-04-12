import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RentalStatus } from '@prisma/client';
import { LogsService } from '../../../application/logs/services';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  IAluguelRegistration,
  IRentalBookingCreate,
  IRentalBookingRepository,
} from '../interfaces';

@Injectable()
export class AluguelRegistrationRepository implements IRentalBookingRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  async create(data: IRentalBookingCreate): Promise<IAluguelRegistration> {
    const created = await this.prisma.rentalItem.create({
      data: {
        rentalId: data.rentalId,
        productId: data.productId,
        quantity: data.quantity,
        unitPrice: new Prisma.Decimal(data.unitPrice),
        subtotal: new Prisma.Decimal(data.subtotal),
        status: data.status,
        returnCondition: data.returnCondition,
        conditionNotes: data.conditionNotes,
        plannedDuration: data.plannedDuration,
        actualDuration: data.actualDuration,
        checkOutAt: data.checkOutAt ?? null,
        checkInAt: data.checkInAt ?? null,
      },
    });
    void this.logsService.info(
      'rental',
      'RentalBookingCreated',
      { bookingId: created.id, rentalId: created.rentalId },
      created.id,
    );
    return this.mapBooking(created);
  }

  async findById(id: string): Promise<IAluguelRegistration | null> {
    const booking = await this.prisma.rentalItem.findUnique({
      where: { id },
    });
    if (!booking || booking.deletedAt) {
      return null;
    }
    return this.mapBooking(booking);
  }

  async findByUserId(userId: string): Promise<IAluguelRegistration[]> {
    const items = await this.prisma.rentalItem.findMany({
      where: {
        deletedAt: null,
        rental: {
          userId,
          deletedAt: null,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((item) => this.mapBooking(item));
  }

  async findByRentalId(rentalId: string): Promise<IAluguelRegistration[]> {
    const items = await this.prisma.rentalItem.findMany({
      where: { rentalId, deletedAt: null, rental: { deletedAt: null } },
      orderBy: { createdAt: 'asc' },
    });
    return items.map((item) => this.mapBooking(item));
  }

  async findByAluguelId(aluguelId: string): Promise<IAluguelRegistration[]> {
    return this.findByRentalId(aluguelId);
  }

  async findOverlappingBookings(
    rentalId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<IAluguelRegistration[]> {
    const items = await this.prisma.rentalItem.findMany({
      where: {
        rentalId: { not: rentalId },
        deletedAt: null,
        rental: {
          deletedAt: null,
          rentalDate: { lte: endDate },
          returnDate: { gte: startDate },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((item) => this.mapBooking(item));
  }

  async updateStatus(
    id: string,
    status: RentalStatus,
  ): Promise<IAluguelRegistration> {
    await this.ensureExists(id);
    const updated = await this.prisma.rentalItem.update({
      where: { id },
      data: {
        status,
        checkInAt:
          status === RentalStatus.RETURNED ? new Date() : undefined,
      },
    });
    void this.logsService.info(
      'rental',
      'RentalBookingStatusUpdated',
      { bookingId: id, status },
      id,
    );
    return this.mapBooking(updated);
  }

  async countActiveBookings(): Promise<number> {
    return this.prisma.rentalItem.count({
      where: {
        status: {
          in: [RentalStatus.PENDING, RentalStatus.ACTIVE, RentalStatus.OVERDUE],
        },
        deletedAt: null,
        rental: {
          deletedAt: null,
        },
      },
    });
  }

  async createMany(items: IRentalBookingCreate[]): Promise<void> {
    if (!items.length) {
      return;
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.rentalItem.createMany({
        data: items.map((item) => ({
          rentalId: item.rentalId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: new Prisma.Decimal(item.unitPrice),
          subtotal: new Prisma.Decimal(item.subtotal),
          status: item.status,
          returnCondition: item.returnCondition,
          conditionNotes: item.conditionNotes,
          plannedDuration: item.plannedDuration,
          actualDuration: item.actualDuration,
          checkOutAt: item.checkOutAt ?? null,
          checkInAt: item.checkInAt ?? null,
        })),
      });
    });
    void this.logsService.info(
      'rental',
      'RentalBookingBatchCreated',
      { total: items.length, rentalId: items[0]?.rentalId },
    );
  }

  private async ensureExists(id: string): Promise<void> {
    const exists = await this.prisma.rentalItem.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    });
    if (!exists || exists.deletedAt) {
      throw new NotFoundException('Rental booking not found');
    }
  }

  private mapBooking(
    booking: Prisma.RentalItemGetPayload<Record<string, never>>,
  ): IAluguelRegistration {
    return {
      id: booking.id,
      rentalId: booking.rentalId,
      productId: booking.productId,
      quantity: booking.quantity,
      unitPrice: Number(booking.unitPrice),
      subtotal: Number(booking.subtotal),
      checkOutAt: booking.checkOutAt,
      checkInAt: booking.checkInAt,
      status: booking.status,
      returnCondition: booking.returnCondition,
      conditionNotes: booking.conditionNotes,
      plannedDuration: booking.plannedDuration,
      actualDuration: booking.actualDuration,
      deletedAt: booking.deletedAt,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  }
}

export { AluguelRegistrationRepository as RentalBookingRepository };
