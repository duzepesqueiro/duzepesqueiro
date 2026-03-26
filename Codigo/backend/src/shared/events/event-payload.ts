import type { IEvent, IEventRegistration } from '../../domain/events/interfaces';

export interface EventUserSnapshot {
  id: string;
  email: string;
  name: string;
}

export interface EventCreatedPayload {
  event: IEvent;
  createdBy: string;
  timestamp: Date;
}

export interface EventUpdatedPayload {
  event: IEvent;
  updatedBy: string;
  timestamp: Date;
}

export interface EventDeletedPayload {
  eventId: string;
  deletedBy: string;
  timestamp: Date;
}

export interface EventRestoredPayload {
  event: IEvent;
  restoredBy: string;
  timestamp: Date;
}

export interface EventStatusUpdatedPayload {
  eventId: string;
  previousStatus: IEvent['status'];
  status: IEvent['status'];
  updatedBy: string;
  timestamp: Date;
}

export interface EventRegisteredPayload {
  registration: IEventRegistration;
  event: IEvent;
  user: EventUserSnapshot;
  timestamp: Date;
}

export interface EventRegistrationCancelledPayload {
  registration: IEventRegistration;
  event: IEvent;
  user: EventUserSnapshot;
  timestamp: Date;
}

export interface EventRegistrationPaidPayload {
  registration: IEventRegistration;
  event: IEvent;
  user: EventUserSnapshot;
  amount: number;
  timestamp: Date;
}

export interface EventSoldOutPayload {
  event: IEvent;
  registration?: IEventRegistration;
  timestamp: Date;
}
