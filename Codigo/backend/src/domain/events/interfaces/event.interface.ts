export type EventStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'UPCOMING';

/**
 * Representa a entidade principal de Evento no domínio.
 */
export interface IEvent {
  id: string;
  title: string;
  description: string;
  rules: string;
  location: string;
  imageUrl: string;
  imageKey: string;
  images?: string[];
  imageKeys?: string[];
  totalSlots: number;
  availableSlots: number;
  eventDate: Date;
  eventTime: string;
  status: EventStatus;
  price?: number | null;
  isPaid: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  participantsCount?: number;
}

/**
 * Contrato de dados necessários para criação de evento.
 */
export interface IEventCreate {
  title: string;
  description: string;
  rules: string;
  location: string;
  imageUrl: string;
  imageKey: string;
  totalSlots: number;
  availableSlots?: number;
  eventDate: Date;
  eventTime: string;
  status?: EventStatus;
  price?: number | null;
  isPaid: boolean;
}

/**
 * Contrato de atualização parcial de evento.
 */
export interface IEventUpdate extends Partial<IEventCreate> {
  deletedAt?: Date | null;
}

/**
 * Contrato de filtros para consultas e listagens de eventos.
 */
export interface IEventFilter {
  search?: string;
  statuses?: EventStatus[];
  isPaid?: boolean;
  fromDate?: Date;
  toDate?: Date;
  minPrice?: number;
  maxPrice?: number;
  hasAvailableSlots?: boolean;
  includeDeleted?: boolean;
  page?: number;
  pageSize?: number;
  orderBy?: 'eventDate' | 'createdAt' | 'availableSlots' | 'price';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Contrato reduzido para cards/teasers de eventos.
 */
export interface IEventCard {
  id: string;
  title: string;
  imageUrl: string;
  location: string;
  eventDate: Date;
  eventTime: string;
  status: EventStatus;
  isPaid: boolean;
  price?: number | null;
  availableSlots: number;
  totalSlots: number;
}
