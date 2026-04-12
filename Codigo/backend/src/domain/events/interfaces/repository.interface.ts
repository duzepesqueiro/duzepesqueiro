import {
  IEvent,
  IEventCreate,
  IEventFilter,
  IEventUpdate,
} from './event.interface';
import {
  EventRegistrationStatus,
  IEventRegistration,
  IEventRegistrationCreate,
  PaymentStatus,
  IUserEventRegistration,
} from './event-registration.interface';
import { IKpiGoal, IKpiGoalInput, KpiType } from './event-kpi.interface';

/**
 * Resultado genérico paginado para listagens de repositório.
 */
export interface IPaginatedResult<TItem> {
  items: TItem[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Contrato de paginação para consultas.
 */
export interface IPagination {
  page: number;
  limit: number;
}

/**
 * Contrato de persistência e consulta de eventos.
 */
export interface IEventRepository {
  create(data: IEventCreate): Promise<IEvent>;
  findById(id: string): Promise<IEvent | null>;
  findAll(
    filters: IEventFilter,
    pagination: IPagination,
  ): Promise<IPaginatedResult<IEvent>>;
  findByFilters(filters: IEventFilter): Promise<IEvent[]>;
  findNearestByTime(time: string, date: Date): Promise<IEvent | null>;
  update(id: string, data: IEventUpdate): Promise<IEvent>;
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  countByStatus(status: IEvent['status']): Promise<number>;
  countByMonth(month: number, year: number): Promise<number>;
  findSoldOutEvents(month: number, year: number): Promise<IEvent[]>;
  countImages(eventId: string): Promise<number>;
  addImages(eventId: string, images: Array<{ imageUrl: string; imageKey: string }>): Promise<void>;
  listImageKeys(eventId: string): Promise<string[]>;
}

/**
 * Contrato de persistência e consulta de inscrições em eventos.
 */
export interface IEventRegistrationRepository {
  create(data: IEventRegistrationCreate): Promise<IEventRegistration>;
  findById(id: string): Promise<IEventRegistration | null>;
  findByUserAndEvent(
    userId: string,
    eventId: string,
  ): Promise<IEventRegistration | null>;
  findByUserId(userId: string): Promise<IUserEventRegistration[]>;
  findByEventId(eventId: string): Promise<IEventRegistration[]>;
  updateStatus(
    id: string,
    status: EventRegistrationStatus,
  ): Promise<IEventRegistration>;
  updatePaymentStatus(
    id: string,
    paymentStatus: PaymentStatus,
    orderId?: string,
  ): Promise<IEventRegistration>;
  countByEventId(eventId: string): Promise<number>;
  countByMonth(month: number, year: number): Promise<number>;
  delete(id: string): Promise<void>;
}

/**
 * Contrato de persistência e consulta de metas e resultados de KPI.
 */
export interface IEventKpiRepository {
  setGoal(data: IKpiGoalInput): Promise<IKpiGoal>;
  getGoal(kpiType: KpiType, month: number, year: number): Promise<IKpiGoal | null>;
  getAllGoals(month: number, year: number): Promise<IKpiGoal[]>;
  updateGoal(id: string, targetValue: number): Promise<IKpiGoal>;
  deleteGoal(id: string): Promise<void>;
}
