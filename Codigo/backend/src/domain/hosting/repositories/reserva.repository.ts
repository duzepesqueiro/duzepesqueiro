import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChaleStatus, Prisma, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { CreateReservaDTO, ReservaFiltersDTO, UpdateReservaDTO } from '../dto';

export type Reserva = Prisma.HostingReservationGetPayload<Record<string, never>>;

@Injectable()
export class ReservaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters?: ReservaFiltersDTO): Promise<Reserva[]> {
    const where: Prisma.HostingReservationWhereInput = {
      deletedAt: null,
      status: filters?.status,
      userId: filters?.userId,
      chaletId: filters?.chaleId,
      code: filters?.codigo ? { contains: filters.codigo, mode: 'insensitive' } : undefined,
      checkInDate:
        filters?.checkinFrom || filters?.checkinTo
          ? {
              gte: filters?.checkinFrom ? new Date(filters.checkinFrom) : undefined,
              lte: filters?.checkinTo ? new Date(filters.checkinTo) : undefined,
            }
          : undefined,
    };

    return this.prisma.hostingReservation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<Reserva | null> {
    return this.prisma.hostingReservation.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  async findByCodigo(codigo: string): Promise<Reserva | null> {
    return this.prisma.hostingReservation.findFirst({
      where: {
        code: codigo,
        deletedAt: null,
      },
    });
  }

  async findByUserId(userId: string): Promise<Reserva[]> {
    return this.prisma.hostingReservation.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: { checkInDate: 'desc' },
    });
  }

  async findByChaleId(chaleId: string): Promise<Reserva[]> {
    return this.prisma.hostingReservation.findMany({
      where: {
        chaletId: chaleId,
        deletedAt: null,
      },
      orderBy: { checkInDate: 'desc' },
    });
  }

  async findOverlappingReservations(
    chaleId: string,
    checkin: Date,
    checkout: Date,
    excludeId?: string,
  ): Promise<Reserva[]> {
    return this.prisma.hostingReservation.findMany({
      where: {
        chaletId: chaleId,
        deletedAt: null,
        status: { in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.OCCUPIED] },
        id: excludeId ? { not: excludeId } : undefined,
        checkInDate: { lt: checkout },
        checkOutDate: { gt: checkin },
      },
      orderBy: { checkInDate: 'asc' },
    });
  }

  async findActiveReservations(): Promise<Reserva[]> {
    return this.prisma.hostingReservation.findMany({
      where: {
        deletedAt: null,
        status: { in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.OCCUPIED] },
      },
      orderBy: { checkInDate: 'asc' },
    });
  }

  async findReservationsByStatus(status: ReservationStatus): Promise<Reserva[]> {
    return this.prisma.hostingReservation.findMany({
      where: {
        status,
        deletedAt: null,
      },
      orderBy: { checkInDate: 'desc' },
    });
  }

  async findCompletedInPeriod(startDate: Date, endDate: Date): Promise<Reserva[]> {
    return this.prisma.hostingReservation.findMany({
      where: {
        deletedAt: null,
        status: ReservationStatus.COMPLETED,
        OR: [
          { checkedOutAt: { gte: startDate, lte: endDate } },
          { checkOutDate: { gte: startDate, lte: endDate } },
        ],
      },
      orderBy: { checkOutDate: 'desc' },
    });
  }

  async create(data: CreateReservaDTO): Promise<Reserva> {
    const checkInDate = new Date(data.checkInDate);
    const checkOutDate = new Date(data.checkOutDate);
    this.validateDateRange(checkInDate, checkOutDate);

    return this.prisma.$transaction(async (tx) => {
      await this.ensureChaleDisponivel(tx, data.chaletId, checkInDate, checkOutDate);
      const reservationCode = await this.generateRandomReservationCode(tx);

      const adults = data.adults ?? 1;
      const children = data.children ?? 0;
      const baseAmount = await this.calculateBaseAmount(tx, data.chaletId, checkInDate, checkOutDate, adults + children);
      const discountAmount = data.discountAmount ?? 0;
      const surchargeAmount = data.surchargeAmount ?? 0;
      const extraBedFee = data.extraBedFee ?? 0;
      const totalAmount = this.calculateTotal(baseAmount, discountAmount, surchargeAmount, extraBedFee);

      return tx.hostingReservation.create({
        data: {
          code: reservationCode,
          chaletId: data.chaletId,
          userId: data.userId,
          pricingRuleId: data.pricingRuleId,
          cancellationPolicyId: data.cancellationPolicyId,
          status: data.status ?? ReservationStatus.PENDING,
          origin: data.origin ?? 'ONLINE',
          guestName: data.guestName,
          guestEmail: data.guestEmail,
          guestPhone: data.guestPhone,
          checkInDate,
          checkOutDate,
          adults,
          children,
          baseAmount: new Prisma.Decimal(baseAmount),
          discountAmount: new Prisma.Decimal(discountAmount),
          surchargeAmount: new Prisma.Decimal(surchargeAmount),
          totalAmount: new Prisma.Decimal(totalAmount),
          paymentStatus: data.paymentStatus ?? 'PENDING',
          paymentMethod: data.paymentMethod,
          paymentId: data.paymentId,
          paidAt: data.paidAt ? new Date(data.paidAt) : undefined,
          extraBedRequested: data.extraBedRequested ?? false,
          extraBedFee: new Prisma.Decimal(extraBedFee),
          negotiationNotes: data.negotiationNotes,
          contactChannel: data.contactChannel,
          contactNotes: data.contactNotes,
          policiesAccepted: data.policiesAccepted ?? false,
          policiesAcceptedAt: data.policiesAcceptedAt ? new Date(data.policiesAcceptedAt) : undefined,
          policyVersion: data.policyVersion,
          policyTerm: data.policyTerm,
          notes: data.notes,
          createdById: data.createdById,
        },
      });
    });
  }

  async update(id: string, data: UpdateReservaDTO): Promise<Reserva> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException('Reserva não encontrada.');
    }

    return this.prisma.$transaction(async (tx) => {
      const nextChaleId = data.chaletId ?? existing.chaletId;
      const nextCheckIn = data.checkInDate ? new Date(data.checkInDate) : existing.checkInDate;
      const nextCheckOut = data.checkOutDate ? new Date(data.checkOutDate) : existing.checkOutDate;
      this.validateDateRange(nextCheckIn, nextCheckOut);

      await this.ensureChaleDisponivel(tx, nextChaleId, nextCheckIn, nextCheckOut, id);

      const adults = data.adults ?? existing.adults;
      const children = data.children ?? existing.children;
      const baseAmount = await this.calculateBaseAmount(tx, nextChaleId, nextCheckIn, nextCheckOut, adults + children);
      const discountAmount = data.discountAmount ?? Number(existing.discountAmount);
      const surchargeAmount = data.surchargeAmount ?? Number(existing.surchargeAmount);
      const extraBedFee = data.extraBedFee ?? Number(existing.extraBedFee);
      const totalAmount = this.calculateTotal(baseAmount, discountAmount, surchargeAmount, extraBedFee);

      return tx.hostingReservation.update({
        where: { id },
        data: {
          chaletId: data.chaletId,
          userId: data.userId,
          pricingRuleId: data.pricingRuleId,
          cancellationPolicyId: data.cancellationPolicyId,
          status: data.status,
          origin: data.origin,
          guestName: data.guestName,
          guestEmail: data.guestEmail,
          guestPhone: data.guestPhone,
          checkInDate: data.checkInDate ? new Date(data.checkInDate) : undefined,
          checkOutDate: data.checkOutDate ? new Date(data.checkOutDate) : undefined,
          adults: data.adults,
          children: data.children,
          baseAmount: new Prisma.Decimal(baseAmount),
          discountAmount: new Prisma.Decimal(discountAmount),
          surchargeAmount: new Prisma.Decimal(surchargeAmount),
          totalAmount: new Prisma.Decimal(totalAmount),
          paymentStatus: data.paymentStatus,
          paymentMethod: data.paymentMethod,
          paymentId: data.paymentId,
          paidAt: data.paidAt === null ? null : data.paidAt ? new Date(data.paidAt) : undefined,
          cancellationReason: data.cancellationReason,
          notes: data.notes,
          extraBedRequested: data.extraBedRequested,
          extraBedFee: data.extraBedFee !== undefined ? new Prisma.Decimal(data.extraBedFee) : undefined,
          negotiationNotes: data.negotiationNotes,
          contactChannel: data.contactChannel,
          contactNotes: data.contactNotes,
          policiesAccepted: data.policiesAccepted,
          policiesAcceptedAt:
            data.policiesAcceptedAt === null
              ? null
              : data.policiesAcceptedAt
                ? new Date(data.policiesAcceptedAt)
                : undefined,
          policyVersion: data.policyVersion,
          policyTerm: data.policyTerm,
          updatedById: data.updatedById,
        },
      });
    });
  }

  async updateStatus(id: string, status: ReservationStatus): Promise<Reserva> {
    await this.ensureExists(id);
    return this.prisma.hostingReservation.update({
      where: { id },
      data: { status },
    });
  }

  async processCheckin(id: string, horaReal: Date): Promise<Reserva> {
    await this.ensureExists(id);
    return this.prisma.hostingReservation.update({
      where: { id },
      data: {
        status: ReservationStatus.OCCUPIED,
        checkedInAt: horaReal,
      },
    });
  }

  async processCheckout(id: string, horaReal: Date): Promise<Reserva> {
    await this.ensureExists(id);
    return this.prisma.hostingReservation.update({
      where: { id },
      data: {
        status: ReservationStatus.COMPLETED,
        checkedOutAt: horaReal,
      },
    });
  }

  async processCancellation(id: string, motivo: string, cancelledBy: string): Promise<Reserva> {
    await this.ensureExists(id);
    return this.prisma.hostingReservation.update({
      where: { id },
      data: {
        status: ReservationStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: motivo,
        updatedById: cancelledBy,
      },
    });
  }

  async processNoShow(id: string): Promise<Reserva> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException('Reserva não encontrada.');
    }

    const feeAmount = Number(existing.totalAmount);
    return this.prisma.hostingReservation.update({
      where: { id },
      data: {
        status: ReservationStatus.NO_SHOW,
        noShowAt: new Date(),
        noShowFeeAmount: new Prisma.Decimal(feeAmount),
        noShowReason: 'Guest did not show up on check-in date.',
      },
    });
  }

  async count(): Promise<number> {
    return this.prisma.hostingReservation.count({
      where: {
        deletedAt: null,
      },
    });
  }

  async countByStatus(): Promise<Record<ReservationStatus, number>> {
    const rows = await this.prisma.hostingReservation.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { _all: true },
    });

    const base: Record<ReservationStatus, number> = {
      [ReservationStatus.PENDING]: 0,
      [ReservationStatus.CONFIRMED]: 0,
      [ReservationStatus.OCCUPIED]: 0,
      [ReservationStatus.COMPLETED]: 0,
      [ReservationStatus.CANCELLED]: 0,
      [ReservationStatus.NO_SHOW]: 0,
    };

    for (const row of rows) {
      base[row.status] = row._count._all;
    }

    return base;
  }

  private async ensureExists(id: string): Promise<void> {
    const existing = await this.prisma.hostingReservation.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Reserva não encontrada.');
    }
  }

  private async generateRandomReservationCode(tx: Prisma.TransactionClient): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const suffix = Math.floor(100000 + Math.random() * 900000).toString();
      const code = `RES-${suffix}`;
      const exists = await tx.hostingReservation.findFirst({
        where: { code },
        select: { id: true },
      });
      if (!exists) {
        return code;
      }
    }

    throw new BadRequestException('Não foi possível gerar um código único de reserva.');
  }

  private validateDateRange(checkInDate: Date, checkOutDate: Date): void {
    if (!(checkInDate instanceof Date) || Number.isNaN(checkInDate.getTime())) {
      throw new BadRequestException('Data de check-in inválida.');
    }
    if (!(checkOutDate instanceof Date) || Number.isNaN(checkOutDate.getTime())) {
      throw new BadRequestException('Data de check-out inválida.');
    }
    if (checkOutDate <= checkInDate) {
      throw new BadRequestException('Check-out deve ser posterior ao check-in.');
    }
  }

  private async ensureChaleDisponivel(
    tx: Prisma.TransactionClient,
    chaleId: string,
    checkInDate: Date,
    checkOutDate: Date,
    excludeId?: string,
  ): Promise<void> {
    const chale = await tx.hostingChalet.findFirst({
      where: { id: chaleId, deletedAt: null, isActive: true },
      select: { id: true, status: true },
    });

    if (!chale) {
      throw new NotFoundException('Chalé não encontrado.');
    }

    const blockedStatuses = new Set<ChaleStatus>([
      ChaleStatus.MAINTENANCE,
      ChaleStatus.CLEANING,
      ChaleStatus.ADMIN,
      ChaleStatus.INTERDICTED,
    ]);

    if (blockedStatuses.has(chale.status)) {
      throw new BadRequestException('Chalé indisponível para reserva.');
    }

    const overlaps = await tx.hostingReservation.findMany({
      where: {
        chaletId: chaleId,
        deletedAt: null,
        status: { in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.OCCUPIED] },
        id: excludeId ? { not: excludeId } : undefined,
        checkInDate: { lt: checkOutDate },
        checkOutDate: { gt: checkInDate },
      },
      select: { id: true },
    });

    if (overlaps.length > 0) {
      throw new BadRequestException('Já existe reserva no período informado para o chalé.');
    }

    const blocks = await tx.hostingChaletBlock.findMany({
      where: {
        chaletId: chaleId,
        isActive: true,
        startDate: { lte: checkOutDate },
        endDate: { gte: checkInDate },
      },
      select: { id: true },
    });

    if (blocks.length > 0) {
      throw new BadRequestException('Existem bloqueios no período informado para o chalé.');
    }
  }

  private async calculateBaseAmount(
    tx: Prisma.TransactionClient,
    chaleId: string,
    checkInDate: Date,
    checkOutDate: Date,
    guestCount: number,
  ): Promise<number> {
    try {
      const rows = await tx.$queryRaw<Array<{ total: Prisma.Decimal | number | string }>>`
        SELECT calculate_total_reservation(${chaleId}, ${checkInDate}::date, ${checkOutDate}::date, ${guestCount}) AS total
      `;
      const total = rows?.[0]?.total;
      if (total === undefined || total === null) {
        return 0;
      }
      return Number(total);
    } catch {
      const chale = await tx.hostingChalet.findUnique({
        where: { id: chaleId },
        select: { basePrice: true },
      });
      return Number(chale?.basePrice ?? 0);
    }
  }

  private calculateTotal(baseAmount: number, discountAmount: number, surchargeAmount: number, extraBedFee: number): number {
    const total = baseAmount - discountAmount + surchargeAmount + extraBedFee;
    if (total < 0) {
      throw new BadRequestException('Valor total da reserva não pode ser negativo.');
    }
    return total;
  }
}
