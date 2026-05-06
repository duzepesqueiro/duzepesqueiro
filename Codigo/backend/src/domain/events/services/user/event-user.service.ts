import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FilterEventsDto } from '../../dto/user';
import { EventRepository } from '../../repositories';
import {
  IEvent,
  IEventCard,
  IEventFilter,
  IPaginatedResult,
} from '../../interfaces';

type UserStatusFilter = 'ALL' | 'UPCOMING' | 'CANCELLED';

@Injectable()
export class EventUserService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Lista eventos para usuários com aplicação de filtros e paginação.
   */
  async getEvents(filters: FilterEventsDto): Promise<IPaginatedResult<IEventCard>> {
    const domainFilters = this.buildDomainFilters(filters);
    const events = await this.eventRepository.findByFilters(domainFilters);
    const filteredEvents = this.applyUserFilters(events, filters);

    if (
      filters.time &&
      filteredEvents.length === 0 &&
      filters.date
    ) {
      const nearest = await this.eventRepository.findNearestByTime(
        filters.time,
        this.parseBrDate(filters.date),
      );
      if (nearest) {
        return this.paginateCards([this.toEventCard(nearest)], filters.page, filters.limit);
      }
    }

    const cards = filteredEvents.map((event) => this.toEventCard(event));
    this.eventEmitter.emit('event.user.listed', {
      filters,
      total: cards.length,
      timestamp: new Date(),
    });
    return this.paginateCards(cards, filters.page, filters.limit);
  }

  /**
   * Obtém um evento específico para visualização de usuário.
   */
  async getEventById(id: string): Promise<IEventCard> {
    const event = await this.eventRepository.findById(id);
    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }
    const card = this.toEventCard(event);
    this.eventEmitter.emit('event.user.detail.viewed', {
      eventId: id,
      timestamp: new Date(),
    });
    return card;
  }

  /**
   * Lista eventos por status público.
   */
  async getEventsByStatus(status: UserStatusFilter): Promise<IEventCard[]> {
    const filterStatus = this.mapUserStatusToDomainStatuses(status);
    const events = await this.eventRepository.findByFilters({
      statuses: filterStatus,
    });
    return events.map((event) => this.toEventCard(event));
  }

  private buildDomainFilters(filters: FilterEventsDto): IEventFilter {
    const statusFilter = this.mapUserStatusToDomainStatuses(filters.status ?? 'ALL');
    const date = filters.date ? this.parseBrDate(filters.date) : undefined;
    const fromDate = date ? new Date(date.setHours(0, 0, 0, 0)) : undefined;
    const toDate = date ? new Date(date.setHours(23, 59, 59, 999)) : undefined;

    return {
      search: filters.name,
      statuses: statusFilter,
      fromDate,
      toDate,
      hasAvailableSlots: true,
      orderBy: 'eventDate',
      orderDirection: 'asc',
    };
  }

  private applyUserFilters(events: IEvent[], filters: FilterEventsDto): IEvent[] {
    return events.filter((event) => {
      if (filters.capacity && event.totalSlots !== filters.capacity) {
        return false;
      }
      if (filters.time && event.eventTime !== filters.time) {
        return false;
      }
      return true;
    });
  }

  private mapUserStatusToDomainStatuses(status: UserStatusFilter): IEvent['status'][] | undefined {
    if (status === 'ALL') {
      return undefined;
    }
    if (status === 'CANCELLED') {
      return ['CANCELLED'];
    }
    return ['UPCOMING', 'SCHEDULED'];
  }

  private paginateCards(
    items: IEventCard[],
    pageInput?: number,
    limitInput?: number,
  ): IPaginatedResult<IEventCard> {
    const page = pageInput ?? 1;
    const limit = limitInput ?? 10;
    const offset = (page - 1) * limit;
    const pagedItems = items.slice(offset, offset + limit);
    return {
      items: pagedItems,
      total: items.length,
      page,
      pageSize: limit,
    };
  }

  private parseBrDate(input: string): Date {
    const [day, month, year] = input.split('/').map((value) => Number(value));
    return new Date(year, month - 1, day);
  }

  private toEventCard(event: IEvent): IEventCard {
    const currentAttendees = Math.max(0, event.totalSlots - event.availableSlots);
    const images = Array.isArray(event.images) && event.images.length
      ? event.images
      : event.imageUrl
      ? [event.imageUrl]
      : [];

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      rules: event.rules,
      imageUrl: event.imageUrl,
      image: event.imageUrl || images[0],
      images,
      location: event.location,
      eventDate: event.eventDate,
      date: event.eventDate,
      eventTime: event.eventTime,
      time: event.eventTime,
      status: event.status,
      isPaid: event.isPaid,
      price: event.price ?? null,
      availableSlots: event.availableSlots,
      totalSlots: event.totalSlots,
      totalCapacity: event.totalSlots,
      currentAttendees,
    };
  }
}
