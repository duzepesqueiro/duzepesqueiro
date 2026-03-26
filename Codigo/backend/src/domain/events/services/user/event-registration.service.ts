import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventEvents } from '../../../../shared/events/event-type';
import {
  EventRegisteredPayload,
  EventRegistrationCancelledPayload,
  EventSoldOutPayload,
} from '../../../../shared/events/event-payload';
import { EventTypes } from '../../../../shared/events/event-types';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { EventRepository, EventRegistrationRepository } from '../../repositories';
import { IEventRegistration, IUserEventRegistration } from '../../interfaces';

@Injectable()
export class EventRegistrationService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly registrationRepository: EventRegistrationRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Realiza inscrição de usuário em evento com validações e reserva de vaga.
   */
  async registerForEvent(
    userId: string,
    eventId: string,
  ): Promise<IEventRegistration> {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }
    if (event.availableSlots <= 0) {
      throw new ConflictException('Não há vagas disponíveis para este evento');
    }

    const existing = await this.registrationRepository.findByUserAndEvent(userId, eventId);
    if (existing && existing.status !== 'CANCELLED') {
      throw new ConflictException('Usuário já inscrito neste evento');
    }

    try {
      const registration =
        await this.registrationRepository.createPendingWithSlotReservation(
          userId,
          eventId,
        );

      const [currentEvent, userSnapshot] = await Promise.all([
        this.eventRepository.findById(registration.eventId),
        this.resolveUserSnapshot(registration.userId),
      ]);
      if (!currentEvent || !userSnapshot) {
        throw new NotFoundException('Não foi possível resolver os dados da inscrição.');
      }

      const registeredPayload: EventRegisteredPayload = {
        registration,
        event: currentEvent,
        user: userSnapshot,
        timestamp: new Date(),
      };
      this.eventEmitter.emit(EventEvents.REGISTERED, registeredPayload);

      this.eventEmitter.emit(EventTypes.EVENT_BOOKED, {
        eventId: registration.eventId,
        userId: registration.userId,
        registrationId: registration.id,
        timestamp: new Date(),
        triggeredBy: 'events.domain',
      });

      if (currentEvent.availableSlots === 0) {
        const soldOutPayload: EventSoldOutPayload = {
          event: currentEvent,
          registration,
          timestamp: new Date(),
        };
        this.eventEmitter.emit(EventEvents.SOLD_OUT, soldOutPayload);
      }

      return registration;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'EVENT_NOT_FOUND') {
          throw new NotFoundException('Evento não encontrado');
        }
        if (error.message === 'EVENT_FULL') {
          throw new ConflictException('Não há vagas disponíveis para este evento');
        }
        if (error.message === 'ALREADY_REGISTERED') {
          throw new ConflictException('Usuário já inscrito neste evento');
        }
      }
      throw error;
    }
  }

  /**
   * Retorna todas as inscrições de um usuário com dados dos eventos.
   */
  async getUserRegistrations(userId: string): Promise<IUserEventRegistration[]> {
    return this.registrationRepository.findByUserId(userId);
  }

  /**
   * Cancela inscrição de um usuário e libera vaga do evento.
   */
  async cancelRegistration(userId: string, registrationId: string): Promise<void> {
    const registration = await this.registrationRepository.findById(registrationId);
    if (!registration) {
      throw new NotFoundException('Inscrição não encontrada');
    }
    if (registration.userId !== userId) {
      throw new ForbiddenException('A inscrição não pertence ao usuário informado');
    }

    try {
      const cancelled =
        await this.registrationRepository.cancelWithSlotRelease(registrationId);

      const [event, userSnapshot] = await Promise.all([
        this.eventRepository.findById(cancelled.eventId),
        this.resolveUserSnapshot(cancelled.userId),
      ]);
      if (event && userSnapshot) {
        const cancelledPayload: EventRegistrationCancelledPayload = {
          registration: cancelled,
          event,
          user: userSnapshot,
          timestamp: new Date(),
        };
        this.eventEmitter.emit(EventEvents.REGISTRATION_CANCELLED, cancelledPayload);
      }

      this.eventEmitter.emit(EventTypes.EVENT_CANCELLED, {
        eventId: cancelled.eventId,
        userId: cancelled.userId,
        registrationId: cancelled.id,
        timestamp: new Date(),
        triggeredBy: 'events.domain',
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'REGISTRATION_NOT_FOUND') {
          throw new NotFoundException('Inscrição não encontrada');
        }
        if (error.message === 'REGISTRATION_ALREADY_CANCELLED') {
          throw new ConflictException('Inscrição já está cancelada');
        }
      }
      throw error;
    }
  }

  /**
   * Consulta o status da inscrição de um usuário em um evento.
   */
  async getRegistrationStatus(
    userId: string,
    eventId: string,
  ): Promise<IEventRegistration | null> {
    return this.registrationRepository.findByUserAndEvent(userId, eventId);
  }

  /**
   * Retorna uma inscrição específica validando pertencimento do usuário.
   */
  async getRegistrationById(userId: string, registrationId: string): Promise<IEventRegistration> {
    const registration = await this.registrationRepository.findById(registrationId);
    if (!registration) {
      throw new NotFoundException('Inscrição não encontrada');
    }
    if (registration.userId !== userId) {
      throw new ForbiddenException('A inscrição não pertence ao usuário informado');
    }
    return registration;
  }

  private async resolveUserSnapshot(userId: string): Promise<{
    id: string;
    email: string;
    name: string;
  } | null> {
    const user = await this.prisma.user.findUnique({
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
      return null;
    }

    const email =
      user.emails.find((item) => item.isPrimary)?.email ?? user.emails[0]?.email;
    if (!email) {
      return null;
    }

    return {
      id: user.id,
      email,
      name: user.profile?.fullName ?? user.username,
    };
  }
}
