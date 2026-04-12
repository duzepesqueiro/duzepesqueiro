import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IPaymentDomain, IPaymentMethod } from '../../../../application/payment/interfaces';
import { LogsService } from '../../../../application/logs/services';
import { NotificationsService } from '../../../../application/notifications/services/notifications.service';
import { PaymentFacadeService } from '../../../../application/payment/services';
import {
  InventoryMovementRepository,
  RentalInventoryRepository,
} from '../../../inventory/repositories';
import { MovementReason, MovementType } from '../../../inventory/enums';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { CreateRentalBookingDto } from '../../dto/user';
import { RentalEvents } from '../../events';
import { IRentalBooking } from '../../interfaces';
import { AluguelRegistrationRepository, AluguelRepository } from '../../repositories';

const MAX_ACTIVE_BOOKINGS_PER_USER = 5;

@Injectable()
export class RentalBookingService {
  constructor(
    private readonly aluguelRepository: AluguelRepository,
    private readonly aluguelRegistrationRepository: AluguelRegistrationRepository,
    private readonly rentalInventoryRepository: RentalInventoryRepository,
    private readonly inventoryMovementRepository: InventoryMovementRepository,
    private readonly paymentFacadeService: PaymentFacadeService,
    private readonly notificationsService: NotificationsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logsService: LogsService,
    private readonly prisma: PrismaService,
  ) {}

  async createBooking(
    userId: string,
    data: CreateRentalBookingDto,
  ): Promise<IRentalBooking> {
    this.validatePeriod(data.periodType, data.periodValue);
    this.validateBookingDates(new Date(data.rentalDate), new Date(data.returnDate));
    await this.validateUserActiveBookingsLimit(userId);
    await this.ensureInventoryAvailable(data.productId, data.quantity);
    await this.validateAvailability(data.productId, new Date(data.rentalDate), new Date(data.returnDate));

    const baseAmount = this.calculateTotalPrice(data.unitPrice, data.quantity, data.periodValue);
    const discount = await this.getEventParticipantDiscount(userId, new Date(data.rentalDate));
    const totalAmount = Number((baseAmount * (1 - discount)).toFixed(2));
    let rentalId: string | null = null;
    let inventoryReserved = false;
    try {
      const rental = await this.aluguelRepository.create({
        userId,
        origin: 'ONLINE',
        rentalDate: data.rentalDate,
        returnDate: data.returnDate,
        periodType: data.periodType,
        periodValue: data.periodValue,
        totalAmount,
        notes: data.notes,
        items: [
          {
            productId: data.productId,
            quantity: data.quantity,
            unitPrice: data.unitPrice,
            subtotal: totalAmount,
          },
        ],
      });
      rentalId = rental.id;

      await this.reserveInventory(data.productId, data.quantity, userId, rental.id);
      inventoryReserved = true;

      let payment: any;
      let userEmail = '';
      let userName = '';
      try {
        const paymentResult = await this.createRentalPayment(userId, rental.id, totalAmount, data);
        payment = paymentResult.payment;
        userEmail = paymentResult.userEmail;
        userName = paymentResult.userName;
      } catch (error) {
        this.eventEmitter.emit(RentalEvents.PAYMENT_FAILED, {
          rentalId: rental.id,
          userId,
          amount: totalAmount,
          status: 'FAILED',
          method: IPaymentMethod.PIX,
          timestamp: new Date(),
          triggeredBy: userId,
        });
        throw error;
      }

      await this.aluguelRepository.update(rental.id, {
        paymentMethod: IPaymentMethod.PIX,
        paymentId: String(payment.id),
        paymentStatus: 'PENDING',
      } as any);

      const booking = await this.getBookingByRentalIdOrThrow(rental.id);
      this.eventEmitter.emit(RentalEvents.BOOKING_CREATED, {
        bookingId: booking.id,
        booking,
        rentalId: booking.rentalId,
        userId,
        userEmail,
        userName,
        period: data.periodValue,
        value: totalAmount,
        startDate: new Date(data.rentalDate),
        endDate: new Date(data.returnDate),
        status: booking.status,
        rentalDetails: {
          rentalNumber: booking.rentalId,
          startDate: data.rentalDate,
          endDate: data.returnDate,
          total: totalAmount,
          items: [{ name: `Item ${data.productId}`, quantity: data.quantity }],
        },
        discountApplied: discount,
        paymentId: payment.id,
        timestamp: new Date(),
        triggeredBy: userId,
      });
      this.notificationsService.sendToUser(userId, RentalEvents.BOOKING_CREATED, {
        bookingId: booking.id,
        rentalId: booking.rentalId,
        paymentId: payment.id,
      });
      void this.logsService.info(
        'rental',
        'RentalBookingCreated',
        { bookingId: booking.id, rentalId: booking.rentalId, userId, paymentId: payment.id },
        booking.id,
      );
      return booking;
    } catch (error) {
      if (rentalId && inventoryReserved) {
        await this.releaseInventory(
          data.productId,
          data.quantity,
          userId,
          rentalId,
          'Rollback automático de reserva',
        );
      }
      if (rentalId) {
        await this.aluguelRepository.softDelete(rentalId);
      }
      void this.logsService.error(
        'rental',
        'RentalBookingCreateFailed',
        {
          userId,
          rentalId,
          productId: data.productId,
          reason: (error as Error).message,
        },
        rentalId ?? undefined,
      );
      throw error;
    }
  }

  async getUserBookings(userId: string): Promise<IRentalBooking[]> {
    const items = await this.aluguelRegistrationRepository.findByUserId(userId);
    return items.filter((item) =>
      ['PENDING', 'ACTIVE', 'OVERDUE'].includes(item.status),
    );
  }

  async getBookingById(id: string): Promise<IRentalBooking> {
    const booking = await this.aluguelRegistrationRepository.findById(id);
    if (!booking) {
      throw new NotFoundException('Booking não encontrado');
    }
    return booking;
  }

  async getBookingByIdForUser(userId: string, id: string): Promise<IRentalBooking> {
    const booking = await this.getBookingById(id);
    await this.ensureBookingOwnership(userId, booking.rentalId);
    return booking;
  }

  async cancelBooking(userId: string, bookingId: string): Promise<IRentalBooking> {
    const booking = await this.getBookingById(bookingId);
    await this.ensureBookingOwnership(userId, booking.rentalId);
    const updated = await this.aluguelRegistrationRepository.updateStatus(
      bookingId,
      'CANCELLED',
    );
    await this.releaseInventory(booking.productId, booking.quantity, userId, booking.rentalId, 'Cancelamento de reserva');
    this.eventEmitter.emit(RentalEvents.BOOKING_CANCELLED, {
      booking: updated,
      bookingId: updated.id,
      rentalId: updated.rentalId,
      userId,
      timestamp: new Date(),
      triggeredBy: userId,
    });
    this.notificationsService.sendToUser(userId, RentalEvents.BOOKING_CANCELLED, {
      bookingId: updated.id,
      rentalId: updated.rentalId,
    });
    void this.logsService.warn(
      'rental',
      'RentalBookingCancelled',
      { bookingId: updated.id, rentalId: updated.rentalId, userId },
      updated.id,
    );
    return updated;
  }

  async extendBooking(
    userId: string,
    bookingId: string,
    newEndDate: Date,
  ): Promise<IRentalBooking> {
    const booking = await this.getBookingById(bookingId);
    const rental = await this.aluguelRepository.findById(booking.rentalId);
    if (!rental) {
      throw new NotFoundException('Aluguel não encontrado');
    }
    if (rental.userId !== userId) {
      throw new NotFoundException('Booking não encontrado para o usuário');
    }
    if (newEndDate.getTime() <= rental.returnDate.getTime()) {
      throw new BadRequestException('Nova data deve ser maior que a data atual de devolução');
    }

    await this.validateAvailability(
      booking.productId,
      rental.rentalDate,
      newEndDate,
      rental.id,
    );

    const nextPeriodValue = this.calculatePeriodValue(rental.rentalDate, newEndDate, rental.periodType);
    await this.aluguelRepository.update(rental.id, {
      returnDate: newEndDate.toISOString(),
      periodValue: nextPeriodValue,
    });

    const updated = await this.getBookingById(bookingId);
    this.eventEmitter.emit('rental.booking_extended', {
      booking: updated,
      userId,
      newEndDate,
      timestamp: new Date(),
    });
    this.notificationsService.sendToUser(userId, 'rental.booking_extended', {
      bookingId: updated.id,
      rentalId: updated.rentalId,
      newEndDate,
    });
    void this.logsService.info(
      'rental',
      'RentalBookingExtended',
      { bookingId: updated.id, rentalId: updated.rentalId, userId, newEndDate },
      updated.id,
    );
    return updated;
  }

  async getBookingHistory(userId: string): Promise<IRentalBooking[]> {
    const items = await this.aluguelRegistrationRepository.findByUserId(userId);
    return items.filter((item) =>
      ['RETURNED', 'CANCELLED'].includes(item.status),
    );
  }

  async getBookingPaymentInfo(userId: string, bookingId: string) {
    const booking = await this.getBookingById(bookingId);
    await this.ensureBookingOwnership(userId, booking.rentalId);
    const rental = await this.aluguelRepository.findById(booking.rentalId);
    if (!rental) {
      throw new NotFoundException('Aluguel não encontrado');
    }
    const payment = await this.paymentFacadeService.checkPaymentStatus(
      IPaymentDomain.RENTAL,
      rental.id,
    );
    return {
      bookingId: booking.id,
      rentalId: rental.id,
      paymentStatus: rental.paymentStatus,
      paymentId: rental.paymentId,
      payment,
    };
  }

  async registerReturn(userId: string, bookingId: string): Promise<IRentalBooking> {
    const booking = await this.getBookingById(bookingId);
    await this.ensureBookingOwnership(userId, booking.rentalId);
    const paymentInfo = await this.getBookingPaymentInfo(userId, bookingId);
    const paymentStatus = String(paymentInfo.payment?.status ?? '').toLowerCase();
    const isPaid =
      paymentStatus === 'approved' ||
      paymentStatus === 'authorized' ||
      paymentStatus === 'paid';
    if (!isPaid) {
      throw new ConflictException('Pagamento não confirmado para registrar devolução');
    }
    const updated = await this.aluguelRegistrationRepository.updateStatus(
      bookingId,
      'RETURNED',
    );
    await this.releaseInventory(booking.productId, booking.quantity, userId, booking.rentalId, 'Devolução concluída');
    await this.syncQualityInspection(booking.productId, booking.returnCondition);
    this.eventEmitter.emit(RentalEvents.BOOKING_COMPLETED, {
      booking: updated,
      bookingId: updated.id,
      rentalId: updated.rentalId,
      userId,
      userEmail: String(paymentInfo.payment?.payer?.email ?? ''),
      userName: 'Cliente',
      period: 0,
      value: Number(paymentInfo.payment?.transactionAmount ?? 0),
      startDate: new Date(),
      endDate: new Date(),
      status: updated.status,
      rentalDetails: {
        rentalNumber: updated.rentalId,
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        total: Number(paymentInfo.payment?.transactionAmount ?? 0),
        items: [],
      },
      timestamp: new Date(),
      triggeredBy: userId,
    });
    this.notificationsService.sendToUser(userId, RentalEvents.BOOKING_COMPLETED, {
      bookingId: updated.id,
      rentalId: updated.rentalId,
    });
    this.eventEmitter.emit(RentalEvents.PAYMENT_COMPLETED, {
      bookingId: updated.id,
      rentalId: updated.rentalId,
      userId,
      amount: Number(paymentInfo.payment?.transactionAmount ?? 0),
      status: String(paymentInfo.payment?.status ?? '').toUpperCase(),
      method: String(paymentInfo.payment?.paymentMethodId ?? IPaymentMethod.PIX),
      timestamp: new Date(),
      triggeredBy: userId,
    });
    void this.logsService.info(
      'rental',
      'RentalBookingCompleted',
      { bookingId: updated.id, rentalId: updated.rentalId, userId },
      updated.id,
    );
    return updated;
  }

  private validatePeriod(periodType: string, periodValue: number): void {
    if (periodValue < 1) {
      throw new BadRequestException('Período mínimo de aluguel é 1');
    }
    if (periodType === 'MONTHLY' && periodValue > 12) {
      throw new BadRequestException('Período máximo para mensal é 12 meses');
    }
    if (periodType === 'WEEKLY' && periodValue > 52) {
      throw new BadRequestException('Período máximo para semanal é 52 semanas');
    }
    if (periodType === 'DAILY' && periodValue > 365) {
      throw new BadRequestException('Período máximo para diário é 365 dias');
    }
  }

  private validateBookingDates(startDate: Date, endDate: Date): void {
    if (endDate.getTime() <= startDate.getTime()) {
      throw new BadRequestException('A data de devolução deve ser maior que a data de aluguel');
    }
  }

  private calculateTotalPrice(unitPrice: number, quantity: number, periodValue: number): number {
    return Number((unitPrice * quantity * periodValue).toFixed(2));
  }

  private async validateUserActiveBookingsLimit(userId: string): Promise<void> {
    const bookings = await this.aluguelRegistrationRepository.findByUserId(userId);
    const activeCount = bookings.filter((item) =>
      ['PENDING', 'ACTIVE', 'OVERDUE'].includes(item.status),
    ).length;
    if (activeCount >= MAX_ACTIVE_BOOKINGS_PER_USER) {
      throw new ConflictException(
        `Limite de ${MAX_ACTIVE_BOOKINGS_PER_USER} aluguéis simultâneos atingido`,
      );
    }
  }

  private async validateAvailability(
    productId: string,
    startDate: Date,
    endDate: Date,
    excludeRentalId?: string,
  ): Promise<void> {
    const prisma = this.prisma as any;
    const conflict = await prisma.rentalItem.findFirst({
      where: {
        deletedAt: null,
        productId,
        rentalId: excludeRentalId ? { not: excludeRentalId } : undefined,
        status: {
          in: ['PENDING', 'ACTIVE', 'OVERDUE'],
        },
        rental: {
          deletedAt: null,
          rentalDate: { lte: endDate },
          returnDate: { gte: startDate },
        },
      },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException('Equipamento indisponível para o período informado');
    }
  }

  private async getBookingByRentalIdOrThrow(rentalId: string): Promise<IRentalBooking> {
    const bookings = await this.aluguelRegistrationRepository.findByRentalId(rentalId);
    const booking = bookings[0];
    if (!booking) {
      throw new NotFoundException('Booking não encontrado após criação');
    }
    return booking;
  }

  private async ensureBookingOwnership(userId: string, rentalId: string): Promise<void> {
    const rental = await this.aluguelRepository.findById(rentalId);
    if (!rental || rental.userId !== userId) {
      throw new NotFoundException('Booking não encontrado para o usuário');
    }
  }

  private calculatePeriodValue(
    startDate: Date,
    endDate: Date,
    periodType: string,
  ): number {
    const diffInDays = Math.max(
      1,
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
    );
    if (periodType === 'MONTHLY') {
      return Math.min(12, Math.ceil(diffInDays / 30));
    }
    if (periodType === 'WEEKLY') {
      return Math.min(52, Math.ceil(diffInDays / 7));
    }
    return Math.min(365, diffInDays);
  }

  private async createRentalPayment(
    userId: string,
    rentalId: string,
    amount: number,
    data: CreateRentalBookingDto,
  ): Promise<{ payment: any; userEmail: string; userName: string }> {
    const prisma = this.prisma as any;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        emails: {
          select: {
            email: true,
            isPrimary: true,
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado para pagamento');
    }
    const email =
      user.emails?.find((item: any) => item.isPrimary)?.email ?? user.emails?.[0]?.email;
    if (!email) {
      throw new BadRequestException('Usuário sem e-mail para pagamento');
    }
    const payment = await this.paymentFacadeService.createRentalPayment(
      rentalId,
      amount,
      IPaymentMethod.PIX,
      {
        email,
        firstName: user.profile?.fullName ?? user.username,
        identification: {
          type: 'CPF',
          number: user.profile?.document ?? '00000000000',
        },
      },
      [
        {
          id: data.productId,
          title: `Aluguel ${data.productId}`,
          quantity: data.quantity,
          unitPrice: data.unitPrice,
        },
      ],
    );
    return {
      payment,
      userEmail: email,
      userName: user.profile?.fullName ?? user.username ?? 'Cliente',
    };
  }

  private async ensureInventoryAvailable(productId: string, quantity: number): Promise<void> {
    const record = await this.rentalInventoryRepository.findByProductId(productId);
    if (record.quality === 'BAD') {
      throw new ConflictException('Equipamento indisponível por condição de qualidade');
    }
    if (Number(record.product.stockQuantity) < quantity) {
      throw new ConflictException('Estoque insuficiente para reservar equipamento');
    }
  }

  private async reserveInventory(
    productId: string,
    quantity: number,
    userId: string,
    rentalId: string,
  ): Promise<void> {
    await this.inventoryMovementRepository.create(
      {
        productId,
        movementType: MovementType.OUTBOUND,
        movementReason: MovementReason.RENTAL,
        quantity,
        referenceId: rentalId,
        referenceType: 'rental_booking',
        note: 'Reserva de aluguel confirmada',
      },
      userId,
    );
  }

  private async releaseInventory(
    productId: string,
    quantity: number,
    userId: string,
    rentalId: string,
    note: string,
  ): Promise<void> {
    await this.inventoryMovementRepository.create(
      {
        productId,
        movementType: MovementType.INBOUND,
        movementReason: MovementReason.RENTAL_RETURN,
        quantity,
        referenceId: rentalId,
        referenceType: 'rental_booking',
        note,
      },
      userId,
    );
  }

  private async syncQualityInspection(productId: string, condition?: string | null): Promise<void> {
    if (!condition) {
      return;
    }
    const newQuality =
      condition === 'EXCELLENT' || condition === 'GOOD'
        ? 'GOOD'
        : condition === 'FAIR'
          ? 'MEDIUM'
          : 'BAD';
    await this.rentalInventoryRepository.performInspection(productId, {
      newQuality: newQuality as any,
      note: `Inspeção automática de devolução (${condition})`,
    });
  }

  private async getEventParticipantDiscount(userId: string, rentalDate: Date): Promise<number> {
    const prisma = this.prisma as any;
    const start = new Date(rentalDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(rentalDate);
    end.setHours(23, 59, 59, 999);

    const registration = await prisma.eventRegistration.findFirst({
      where: {
        userId,
        status: 'CONFIRMED',
        event: {
          deletedAt: null,
          eventDate: {
            gte: start,
            lte: end,
          },
        },
      },
      select: { id: true },
    });
    return registration ? 0.1 : 0;
  }
}

export { RentalBookingService as AluguelBookingService };
