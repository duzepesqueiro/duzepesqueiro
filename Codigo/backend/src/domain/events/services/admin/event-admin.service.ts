import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CreateEventDto,
  FilterEventsAdminDto,
  UpdateEventDto,
} from '../../dto/admin';
import { EventEvents } from '../../../../shared/events/events/event-types';
import { EventRepository, EventRegistrationRepository } from '../../repositories';
import {
  IEvent,
  IEventFilter,
  IEventRegistration,
  IPaginatedResult,
} from '../../interfaces';
import { FileUploadService } from './file-upload.service';

@Injectable()
export class EventAdminService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly registrationRepository: EventRegistrationRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly fileUploadService: FileUploadService,
  ) {}

  /**
   * Cria um evento administrativo com upload opcional de imagem.
   */
  async createEvent(
    data: CreateEventDto,
    images: Express.Multer.File[] = [],
  ): Promise<IEvent> {
    let uploadedImages: Array<{ key: string; url: string }> = [];
    try {
      if (images.length > 10) {
        throw new BadRequestException('Máximo de 10 imagens por evento.');
      }
      uploadedImages = await this.fileUploadService.uploadEventImages(images);

      const created = await this.eventRepository.create({
        title: data.title,
        description: data.description,
        rules: data.rules,
        location: data.location,
        imageUrl: uploadedImages[0]?.url ?? '',
        imageKey: uploadedImages[0]?.key ?? '',
        totalSlots: data.totalSlots,
        availableSlots: data.totalSlots,
        eventDate: new Date(data.eventDate),
        eventTime: data.eventTime,
        price: data.price ?? null,
        isPaid: data.isPaid,
      });
      if (uploadedImages.length) {
        await this.eventRepository.addImages(
          created.id,
          uploadedImages.map((image) => ({ imageUrl: image.url, imageKey: image.key })),
        );
      }
      const hydrated = await this.eventRepository.findById(created.id);
      if (!hydrated) {
        throw new NotFoundException('Evento criado, mas não foi possível recarregar os dados.');
      }

      this.eventEmitter.emit(EventEvents.CREATED, {
        event: hydrated,
        createdBy: 'admin',
        timestamp: new Date(),
      });

      return hydrated;
    } catch (error) {
      if (uploadedImages.length) {
        await Promise.all(uploadedImages.map((image) => this.fileUploadService.deleteFile(image.key)));
      }
      throw error;
    }
  }

  /**
   * Atualiza evento e opcionalmente substitui imagem.
   */
  async updateEvent(
    id: string,
    data: UpdateEventDto,
    images: Express.Multer.File[] = [],
  ): Promise<IEvent> {
    const current = await this.eventRepository.findById(id);
    if (!current) {
      throw new NotFoundException('Evento não encontrado');
    }

    let uploadedImages: Array<{ key: string; url: string }> = [];
    try {
      if (images.length > 10) {
        throw new BadRequestException('Máximo de 10 imagens por evento.');
      }
      const storedImagesCount = await this.eventRepository.countImages(id);
      const currentImagesCount =
        storedImagesCount > 0 ? storedImagesCount : current.imageUrl ? 1 : 0;
      if (currentImagesCount + images.length > 10) {
        throw new BadRequestException('Limite de 10 imagens por evento excedido.');
      }
      uploadedImages = await this.fileUploadService.uploadEventImages(images);
      if (uploadedImages.length) {
        await this.eventRepository.addImages(
          id,
          uploadedImages.map((image) => ({ imageUrl: image.url, imageKey: image.key })),
        );
      }
      const primaryImage = uploadedImages[0];

      const updated = await this.eventRepository.update(id, {
        title: data.title,
        description: data.description,
        rules: data.rules,
        location: data.location,
        totalSlots: data.totalSlots,
        eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
        eventTime: data.eventTime,
        price: data.price,
        isPaid: data.isPaid,
        status: data.status,
        imageUrl: primaryImage?.url ?? undefined,
        imageKey: primaryImage?.key ?? undefined,
      });

      this.eventEmitter.emit(EventEvents.UPDATED, {
        event: updated,
        updatedBy: 'admin',
        timestamp: new Date(),
      });

      return updated;
    } catch (error) {
      if (uploadedImages.length) {
        await Promise.all(uploadedImages.map((image) => this.fileUploadService.deleteFile(image.key)));
      }
      throw error;
    }
  }

  /**
   * Busca evento por id com total de participantes.
   */
  async getEventById(id: string): Promise<IEvent> {
    const event = await this.eventRepository.findById(id);
    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }
    const participantsCount = await this.registrationRepository.countByEventId(id);
    return {
      ...event,
      participantsCount,
    };
  }

  /**
   * Lista eventos administrativos com filtros e paginação.
   */
  async getAllEvents(
    filters: FilterEventsAdminDto,
  ): Promise<IPaginatedResult<IEvent>> {
    const domainFilters = this.buildAdminFilters(filters);
    const events = await this.eventRepository.findByFilters(domainFilters);

    const eventsWithParticipants = await Promise.all(
      events.map(async (event) => {
        const participantsCount = await this.registrationRepository.countByEventId(
          event.id,
        );
        return {
          ...event,
          participantsCount,
        };
      }),
    );

    const byTime = filters.time
      ? eventsWithParticipants.filter((event) => event.eventTime === filters.time)
      : eventsWithParticipants;

    const byParticipants =
      typeof filters.participants === 'number'
        ? byTime.filter(
            (event) => (event.participantsCount ?? 0) >= filters.participants!,
          )
        : byTime;

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;
    const items = byParticipants.slice(offset, offset + limit);

    return {
      items,
      total: byParticipants.length,
      page,
      pageSize: limit,
    };
  }

  /**
   * Realiza soft delete de evento.
   */
  async deleteEvent(id: string): Promise<void> {
    const event = await this.eventRepository.findById(id);
    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }

    await this.eventRepository.softDelete(id);
    this.eventEmitter.emit(EventEvents.DELETED, {
      eventId: id,
      deletedBy: 'admin',
      timestamp: new Date(),
    });
  }

  /**
   * Restaura evento removido logicamente.
   */
  async restoreEvent(id: string): Promise<IEvent> {
    await this.eventRepository.restore(id);
    const restored = await this.eventRepository.findById(id);
    if (!restored) {
      throw new NotFoundException('Evento não encontrado para restauração');
    }
    this.eventEmitter.emit(EventEvents.RESTORED, {
      event: restored,
      restoredBy: 'admin',
      timestamp: new Date(),
    });
    return restored;
  }

  /**
   * Retorna participantes inscritos no evento.
   */
  async getEventParticipants(eventId: string): Promise<IEventRegistration[]> {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }
    return this.registrationRepository.findByEventId(eventId);
  }

  /**
   * Atualiza status de evento e publica evento de domínio.
   */
  async updateEventStatus(id: string, status: IEvent['status']): Promise<IEvent> {
    const event = await this.eventRepository.findById(id);
    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }
    if (event.status === status) {
      throw new ConflictException('O evento já está com este status');
    }

    const updated = await this.eventRepository.update(id, { status });
    this.eventEmitter.emit(EventEvents.STATUS_UPDATED, {
      eventId: id,
      previousStatus: event.status,
      status,
      updatedBy: 'admin',
      timestamp: new Date(),
    });
    return updated;
  }

  /**
   * Faz upload/substituição de imagem de evento.
   */
  async uploadEventImages(id: string, files: Express.Multer.File[]): Promise<IEvent> {
    const event = await this.eventRepository.findById(id);
    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }
    if (!files.length) {
      throw new BadRequestException('Envie ao menos uma imagem.');
    }
    if (files.length > 10) {
      throw new BadRequestException('Máximo de 10 imagens por envio.');
    }
    const storedImagesCount = await this.eventRepository.countImages(id);
    const currentImagesCount =
      storedImagesCount > 0 ? storedImagesCount : event.imageUrl ? 1 : 0;
    if (currentImagesCount + files.length > 10) {
      throw new BadRequestException('Limite de 10 imagens por evento excedido.');
    }

    const uploaded = await this.fileUploadService.uploadEventImages(files);
    try {
      await this.eventRepository.addImages(
        id,
        uploaded.map((image) => ({ imageUrl: image.url, imageKey: image.key })),
      );
      const updated = await this.eventRepository.update(id, {
        imageUrl: uploaded[0]?.url ?? event.imageUrl,
        imageKey: uploaded[0]?.key ?? event.imageKey,
      });

      this.eventEmitter.emit('event.image.updated', {
        eventId: id,
        imageKeys: uploaded.map((item) => item.key),
        timestamp: new Date(),
      });
      return updated;
    } catch (error) {
      await Promise.all(uploaded.map((item) => this.fileUploadService.deleteFile(item.key)));
      throw error;
    }
  }

  private buildAdminFilters(filters: FilterEventsAdminDto): IEventFilter {
    const fromDate = filters.date ? this.parseBrDate(filters.date) : undefined;
    const toDate = filters.date ? this.endOfDay(this.parseBrDate(filters.date)) : undefined;
    return {
      search: filters.title,
      statuses: filters.status ? [filters.status] : undefined,
      fromDate,
      toDate,
      orderBy: 'eventDate',
      orderDirection: 'asc',
    };
  }

  private parseBrDate(value: string): Date {
    const [day, month, year] = value.split('/').map((item) => Number(item));
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  private endOfDay(date: Date): Date {
    const out = new Date(date);
    out.setHours(23, 59, 59, 999);
    return out;
  }
}
