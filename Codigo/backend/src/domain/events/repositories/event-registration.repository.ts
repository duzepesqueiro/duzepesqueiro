import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  EventRegistrationStatus,
  IEventRegistration,
  IEventRegistrationCreate,
  IEventRegistrationRepository,
  IUserEventRegistration,
  PaymentStatus,
} from '../interfaces';

@Injectable()
export class EventRegistrationRepository implements IEventRegistrationRepository {
  private readonly logger = new Logger(EventRegistrationRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async createPendingWithSlotReservation(
    userId: string,
    eventId: string,
  ): Promise<IEventRegistration> {
    try {
      const prisma = this.prisma as any;
      const created = await prisma.$transaction(async (tx: any) => {
        const event = await tx.event.findFirst({
          where: { id: eventId, deletedAt: null },
          select: { id: true, availableSlots: true },
        });
        if (!event) {
          throw new Error('EVENT_NOT_FOUND');
        }
        if (event.availableSlots <= 0) {
          throw new Error('EVENT_FULL');
        }

        const existing = await tx.eventRegistration.findFirst({
          where: {
            userId,
            eventId,
            status: { in: ['PENDING', 'CONFIRMED', 'PAID'] },
          },
          select: { id: true },
        });
        if (existing) {
          throw new Error('ALREADY_REGISTERED');
        }

        const registration = await tx.eventRegistration.create({
          data: {
            userId,
            eventId,
            status: 'PENDING',
          },
        });

        await tx.event.update({
          where: { id: eventId },
          data: {
            availableSlots: {
              decrement: 1,
            },
          },
        });

        return registration;
      });

      this.logger.log(
        `Inscrição criada com reserva de vaga user=${userId} event=${eventId}`,
      );
      return this.mapRegistration(created);
    } catch (error) {
      this.logger.error(
        `Falha na inscrição com reserva de vaga user=${userId} event=${eventId}`,
        error as Error,
      );
      throw error;
    }
  }

  async cancelWithSlotRelease(id: string): Promise<IEventRegistration> {
    try {
      const prisma = this.prisma as any;
      const updated = await prisma.$transaction(async (tx: any) => {
        const registration = await tx.eventRegistration.findUnique({
          where: { id },
        });
        if (!registration) {
          throw new Error('REGISTRATION_NOT_FOUND');
        }
        if (registration.status === 'CANCELLED') {
          throw new Error('REGISTRATION_ALREADY_CANCELLED');
        }

        const cancelled = await tx.eventRegistration.update({
          where: { id },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
          },
        });

        await tx.event.update({
          where: { id: registration.eventId },
          data: {
            availableSlots: {
              increment: 1,
            },
          },
        });

        return cancelled;
      });

      this.logger.log(`Inscrição cancelada com liberação de vaga id=${id}`);
      return this.mapRegistration(updated);
    } catch (error) {
      this.logger.error(
        `Falha ao cancelar inscrição com liberação de vaga id=${id}`,
        error as Error,
      );
      throw error;
    }
  }

  async create(data: IEventRegistrationCreate): Promise<IEventRegistration> {
    try {
      const prisma = this.prisma as any;
      const created = await prisma.eventRegistration.create({
        data: {
          userId: data.userId,
          eventId: data.eventId,
          status: data.status ?? 'PENDING',
          orderId: data.orderId ?? null,
          paymentStatus: data.paymentStatus ?? null,
        },
      });
      this.logger.log(
        `Inscrição criada id=${created.id} user=${created.userId} event=${created.eventId}`,
      );
      return this.mapRegistration(created);
    } catch (error) {
      this.logger.error('Falha ao criar inscrição de evento', error as Error);
      throw error;
    }
  }

  async findById(id: string): Promise<IEventRegistration | null> {
    try {
      const prisma = this.prisma as any;
      const row = await prisma.eventRegistration.findUnique({ where: { id } });
      return row ? this.mapRegistration(row) : null;
    } catch (error) {
      this.logger.error(`Falha ao buscar inscrição id=${id}`, error as Error);
      throw error;
    }
  }

  async findByUserAndEvent(
    userId: string,
    eventId: string,
  ): Promise<IEventRegistration | null> {
    try {
      const prisma = this.prisma as any;
      const row = await prisma.eventRegistration.findFirst({
        where: { userId, eventId },
      });
      return row ? this.mapRegistration(row) : null;
    } catch (error) {
      this.logger.error(
        `Falha ao buscar inscrição por user/event user=${userId} event=${eventId}`,
        error as Error,
      );
      throw error;
    }
  }

  async findByUserId(userId: string): Promise<IUserEventRegistration[]> {
    try {
      const prisma = this.prisma as any;
      const rows = await prisma.eventRegistration.findMany({
        where: { userId },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
              location: true,
              eventDate: true,
              eventTime: true,
              status: true,
              isPaid: true,
              price: true,
              availableSlots: true,
              totalSlots: true,
            },
          },
        },
        orderBy: { registeredAt: 'desc' },
      });

      return rows.map((row: any) => ({
        registrationId: row.id,
        status: row.status,
        paymentStatus: row.paymentStatus,
        orderId: row.orderId,
        registeredAt: row.registeredAt,
        confirmedAt: row.confirmedAt,
        cancelledAt: row.cancelledAt,
        event: {
          id: row.event.id,
          title: row.event.title,
          imageUrl: row.event.imageUrl,
          location: row.event.location,
          eventDate: row.event.eventDate,
          eventTime: row.event.eventTime,
          status: row.event.status,
          isPaid: row.event.isPaid,
          price: row.event.price ? Number(row.event.price) : null,
          availableSlots: row.event.availableSlots,
          totalSlots: row.event.totalSlots,
        },
      }));
    } catch (error) {
      this.logger.error(
        `Falha ao buscar inscrições do usuário user=${userId}`,
        error as Error,
      );
      throw error;
    }
  }

  async findByEventId(eventId: string): Promise<IEventRegistration[]> {
    try {
      const prisma = this.prisma as any;
      const rows = await prisma.eventRegistration.findMany({
        where: { eventId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: { registeredAt: 'desc' },
      });
      return rows.map((row: any) => this.mapRegistration(row));
    } catch (error) {
      this.logger.error(
        `Falha ao buscar inscrições por evento event=${eventId}`,
        error as Error,
      );
      throw error;
    }
  }

  async updateStatus(
    id: string,
    status: EventRegistrationStatus,
  ): Promise<IEventRegistration> {
    try {
      const prisma = this.prisma as any;
      const updated = await prisma.eventRegistration.update({
        where: { id },
        data: {
          status,
          confirmedAt: status === 'CONFIRMED' || status === 'PAID' ? new Date() : null,
          cancelledAt: status === 'CANCELLED' ? new Date() : null,
        },
      });
      this.logger.log(`Status de inscrição atualizado id=${id} status=${status}`);
      return this.mapRegistration(updated);
    } catch (error) {
      this.logger.error(
        `Falha ao atualizar status da inscrição id=${id}`,
        error as Error,
      );
      throw error;
    }
  }

  async updatePaymentStatus(
    id: string,
    paymentStatus: PaymentStatus,
    orderId?: string,
  ): Promise<IEventRegistration> {
    try {
      const prisma = this.prisma as any;
      const updated = await prisma.eventRegistration.update({
        where: { id },
        data: {
          paymentStatus,
          orderId: orderId ?? undefined,
          status: paymentStatus === 'PAID' ? 'PAID' : undefined,
          confirmedAt: paymentStatus === 'PAID' ? new Date() : undefined,
        },
      });
      this.logger.log(
        `Pagamento da inscrição atualizado id=${id} paymentStatus=${paymentStatus}`,
      );
      return this.mapRegistration(updated);
    } catch (error) {
      this.logger.error(
        `Falha ao atualizar pagamento da inscrição id=${id}`,
        error as Error,
      );
      throw error;
    }
  }

  async countByEventId(eventId: string): Promise<number> {
    try {
      const prisma = this.prisma as any;
      return prisma.eventRegistration.count({
        where: { eventId, status: { not: 'CANCELLED' } },
      });
    } catch (error) {
      this.logger.error(
        `Falha ao contar inscrições por evento event=${eventId}`,
        error as Error,
      );
      throw error;
    }
  }

  async countByMonth(month: number, year: number): Promise<number> {
    try {
      const prisma = this.prisma as any;
      const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      return prisma.eventRegistration.count({
        where: {
          registeredAt: {
            gte: start,
            lte: end,
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `Falha ao contar inscrições por mês=${month} ano=${year}`,
        error as Error,
      );
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const prisma = this.prisma as any;
      await prisma.eventRegistration.delete({
        where: { id },
      });
      this.logger.warn(`Inscrição removida id=${id}`);
    } catch (error) {
      this.logger.error(`Falha ao remover inscrição id=${id}`, error as Error);
      throw error;
    }
  }

  private mapRegistration(row: any): IEventRegistration {
    return {
      id: row.id,
      userId: row.userId,
      eventId: row.eventId,
      status: row.status,
      orderId: row.orderId,
      paymentStatus: row.paymentStatus,
      registeredAt: row.registeredAt,
      confirmedAt: row.confirmedAt,
      cancelledAt: row.cancelledAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      user: row.user
        ? {
            id: row.user.id,
            username: row.user.username,
          }
        : undefined,
    };
  }
}
