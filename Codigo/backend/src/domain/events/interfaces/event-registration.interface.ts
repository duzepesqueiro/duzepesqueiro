import { IEventCard } from './event.interface';

export type EventRegistrationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'PAID';

export type EventPaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type PaymentStatus = EventPaymentStatus;

/**
 * Representa a inscrição de um usuário em um evento.
 */
export interface IEventRegistration {
  id: string;
  userId: string;
  eventId: string;
  status: EventRegistrationStatus;
  orderId?: string | null;
  paymentStatus?: EventPaymentStatus | null;
  registeredAt: Date;
  confirmedAt?: Date | null;
  cancelledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    username: string;
  };
}

/**
 * Contrato de criação de inscrição.
 */
export interface IEventRegistrationCreate {
  userId: string;
  eventId: string;
  status?: EventRegistrationStatus;
  orderId?: string | null;
  paymentStatus?: EventPaymentStatus | null;
}

/**
 * Retorno de inscrição para área do usuário final.
 */
export interface IUserEventRegistration {
  registrationId: string;
  status: EventRegistrationStatus;
  paymentStatus?: EventPaymentStatus | null;
  orderId?: string | null;
  registeredAt: Date;
  confirmedAt?: Date | null;
  cancelledAt?: Date | null;
  event: IEventCard;
}
