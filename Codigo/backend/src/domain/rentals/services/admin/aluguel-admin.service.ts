import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ItemCondition, PaymentStatus, ProductStatus, RentalStatus } from '@prisma/client';
import { LogsService } from '../../../../application/logs/services';
import { IPaymentDomain } from '../../../../application/payment/interfaces';
import { PaymentFacadeService } from '../../../../application/payment/services';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  CreateAluguelDto,
  CreateRentalDto,
  FilterAluguelAdminDto,
  FilterRentalAdminDto,
  UpdateAluguelDto,
  UpdateRentalDto,
} from '../../dto/admin';
import { AluguelEventName } from '../../events';
import { DateRange, IAluguel, IRental, IRentalBooking } from '../../interfaces';
import { AluguelRegistrationRepository, AluguelRepository } from '../../repositories';

export interface IPaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type EquipmentCondition = ItemCondition;

export interface AvailabilityReport {
  period: DateRange;
  totalRentals: number;
  activeRentals: number;
  overdueRentals: number;
  bookedItems: number;
  availableItems: number;
  availabilityRate: number;
  byCategory: Array<{
    category: string;
    booked: number;
  }>;
}

export interface ConditionReport {
  totalInspected: number;
  pendingInspection: number;
  byCondition: Array<{
    condition: EquipmentCondition | 'NOT_INFORMED';
    total: number;
  }>;
}

@Injectable()
export class AluguelAdminService {
  constructor(
    private readonly aluguelRepository: AluguelRepository,
    private readonly aluguelRegistrationRepository: AluguelRegistrationRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly logsService: LogsService,
    private readonly paymentFacadeService: PaymentFacadeService,
    private readonly prisma: PrismaService,
  ) {}

  async createRental(
    data: CreateRentalDto,
    images?: any[],
  ): Promise<IRental> {
    let rental = await this.aluguelRepository.create(data);
    if (images?.length) {
      await this.uploadImagesInternal(rental.id, images);
    }
    rental = await this.syncAmountWithPayment(rental);
    this.emitEvent(AluguelEventName.CREATED, rental.id, {
      rental,
      timestamp: new Date(),
    });
    void this.logsService.info(
      'rental',
      'RentalAdminCreated',
      { rentalId: rental.id, withImages: Boolean(images?.length) },
      rental.id,
    );
    return this.getRentalById(rental.id);
  }

  async updateRental(
    id: string,
    data: UpdateRentalDto,
    images?: any[],
  ): Promise<IRental> {
    await this.getRentalById(id);
    let rental = await this.aluguelRepository.update(id, data);
    if (images?.length) {
      await this.uploadImagesInternal(id, images);
    }
    rental = await this.syncAmountWithPayment(rental);
    this.emitEvent(AluguelEventName.UPDATED, id, {
      rental,
      timestamp: new Date(),
    });
    void this.logsService.info(
      'rental',
      'RentalAdminUpdated',
      { rentalId: id, withImages: Boolean(images?.length) },
      id,
    );
    return this.getRentalById(id);
  }

  async getRentalById(id: string): Promise<IRental> {
    const rental = await this.aluguelRepository.findById(id);
    if (!rental) {
      throw new NotFoundException('Rental not found');
    }
    return rental;
  }

  async getAllRentals(
    filters: FilterRentalAdminDto,
  ): Promise<IPaginatedResult<IRental>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const [allItems, paginatedItems] = await Promise.all([
      this.aluguelRepository.findByFilters({
        ...filters,
        page: undefined,
        limit: undefined,
      }),
      this.aluguelRepository.findByFilters(filters),
    ]);
    return {
      items: paginatedItems,
      total: allItems.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(allItems.length / limit)),
    };
  }

  async deleteRental(id: string): Promise<void> {
    await this.aluguelRepository.softDelete(id);
    this.emitEvent(AluguelEventName.DELETED, id, {
      rentalId: id,
      timestamp: new Date(),
    });
    void this.logsService.warn('rental', 'RentalAdminDeleted', { rentalId: id }, id);
  }

  async restoreRental(id: string): Promise<IRental> {
    const prisma = this.prisma as any;
    await prisma.$transaction(async (tx: any) => {
      const rental = await tx.rental.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!rental) {
        throw new NotFoundException('Rental not found');
      }
      await tx.rental.update({
        where: { id },
        data: { deletedAt: null },
      });
      await tx.rentalItem.updateMany({
        where: { rentalId: id, deletedAt: { not: null } },
        data: { deletedAt: null },
      });
    });
    void this.logsService.info('rental', 'RentalAdminRestored', { rentalId: id }, id);
    return this.getRentalById(id);
  }

  async updateRentalStatus(id: string, status: RentalStatus): Promise<IRental> {
    await this.getRentalById(id);
    const prisma = this.prisma as any;
    await prisma.rentalItem.updateMany({
      where: { rentalId: id, deletedAt: null },
      data: {
        status,
        checkInAt: status === RentalStatus.RETURNED ? new Date() : undefined,
      },
    });
    this.emitEvent(AluguelEventName.STATUS_CHANGED, id, {
      rentalId: id,
      status,
      timestamp: new Date(),
    });
    void this.logsService.info(
      'rental',
      'RentalStatusUpdated',
      { rentalId: id, status },
      id,
    );
    return this.getRentalById(id);
  }

  async uploadRentalImages(id: string, files: any[]): Promise<IRental> {
    await this.getRentalById(id);
    await this.uploadImagesInternal(id, files);
    return this.getRentalById(id);
  }

  async generateAvailabilityReport(
    startDate: Date,
    endDate: Date,
  ): Promise<AvailabilityReport> {
    const period = { startDate, endDate };
    const [totalRentals, activeRentals, overdueRentals, rentalItems, totalAvailableItems] =
      await Promise.all([
        this.aluguelRepository.countByPeriod(startDate, endDate),
        this.aluguelRepository.countByStatus(RentalStatus.ACTIVE),
        this.aluguelRepository.countByStatus(RentalStatus.OVERDUE),
        (this.prisma as any).rentalItem.findMany({
          where: {
            deletedAt: null,
            rental: {
              deletedAt: null,
              rentalDate: { lte: endDate },
              returnDate: { gte: startDate },
            },
          },
          include: {
            product: { select: { category: true } },
          },
        }),
        (this.prisma as any).product.count({
          where: {
            status: ProductStatus.RENTAL,
            deletedAt: null,
          },
        }),
      ]);

    const bookedItems = rentalItems.length;
    const categoryMap = new Map<string, number>();
    for (const item of rentalItems) {
      const category = item.product.category;
      categoryMap.set(category, (categoryMap.get(category) ?? 0) + 1);
    }

    const availableItems = Math.max(0, totalAvailableItems - bookedItems);
    const availabilityRate =
      totalAvailableItems > 0 ? Number(((availableItems / totalAvailableItems) * 100).toFixed(2)) : 0;

    return {
      period,
      totalRentals,
      activeRentals,
      overdueRentals,
      bookedItems,
      availableItems,
      availabilityRate,
      byCategory: Array.from(categoryMap.entries()).map(([category, booked]) => ({
        category,
        booked,
      })),
    };
  }

  async checkEquipmentCondition(
    id: string,
    condition: EquipmentCondition,
  ): Promise<IRental> {
    await this.getRentalById(id);
    const prisma = this.prisma as any;
    await prisma.rentalItem.updateMany({
      where: { rentalId: id, deletedAt: null },
      data: {
        returnCondition: condition,
      },
    });
    this.emitEvent(AluguelEventName.CONDITION_UPDATED, id, {
      rentalId: id,
      condition,
      timestamp: new Date(),
    });
    void this.logsService.info(
      'rental',
      'RentalConditionUpdated',
      { rentalId: id, condition },
      id,
    );
    return this.getRentalById(id);
  }

  async getBookingsByRentalId(rentalId: string): Promise<IRentalBooking[]> {
    await this.getRentalById(rentalId);
    return this.aluguelRegistrationRepository.findByRentalId(rentalId);
  }

  async generateConditionReport(): Promise<ConditionReport> {
    const prisma = this.prisma as any;
    const [totalInspected, pendingInspection, grouped] = await Promise.all([
      prisma.rentalItem.count({
        where: {
          deletedAt: null,
          returnCondition: { not: null },
          rental: { deletedAt: null },
        },
      }),
      prisma.rentalItem.count({
        where: {
          deletedAt: null,
          returnCondition: null,
          rental: { deletedAt: null },
        },
      }),
      prisma.rentalItem.groupBy({
        by: ['returnCondition'],
        where: {
          deletedAt: null,
          rental: { deletedAt: null },
        },
        _count: { returnCondition: true },
      }),
    ]);
    const byCondition = grouped.map(
      (item: { returnCondition: EquipmentCondition | null; _count: { returnCondition: number } }) => ({
        condition: item.returnCondition ?? 'NOT_INFORMED',
        total: item._count.returnCondition,
      }),
    );
    return {
      totalInspected,
      pendingInspection,
      byCondition,
    };
  }

  async createAluguel(dto: CreateAluguelDto): Promise<IAluguel> {
    return this.createRental(dto);
  }

  async listAlugueis(filters: FilterAluguelAdminDto): Promise<IAluguel[]> {
    const result = await this.getAllRentals(filters);
    return result.items;
  }

  async updateAluguel(id: string, dto: UpdateAluguelDto): Promise<IAluguel> {
    return this.updateRental(id, dto);
  }

  private async syncAmountWithPayment(rental: IRental): Promise<IRental> {
    const payment = await this.paymentFacadeService.checkPaymentStatus(
      IPaymentDomain.RENTAL,
      rental.id,
    );
    if (!payment) {
      return rental;
    }
    const paidStatuses = new Set<PaymentStatus>([
      PaymentStatus.APPROVED,
      PaymentStatus.AUTHORIZED,
    ]);
    if (!paidStatuses.has(rental.paymentStatus)) {
      return rental;
    }
    const paymentAmount = Number(payment.transactionAmount);
    if (paymentAmount === rental.totalAmount) {
      return rental;
    }
    return this.aluguelRepository.update(rental.id, {
      totalAmount: paymentAmount,
    });
  }

  private async uploadImagesInternal(
    id: string,
    files: any[],
  ): Promise<void> {
    if (!files.length) {
      return;
    }
    const processedFiles = files.map((file) => this.validateAndNormalizeFile(file));
    const prisma = this.prisma as any;
    try {
      await prisma.$transaction(async (tx: any) => {
        await tx.rentalAuditLog.create({
          data: {
            rentalId: id,
            action: 'IMAGE_UPLOAD',
            newValue: {
              images: processedFiles,
            },
          },
        });
      });
      void this.logsService.info(
        'rental',
        'RentalImagesUploaded',
        { rentalId: id, totalFiles: processedFiles.length },
        id,
      );
    } catch (error) {
      void this.logsService.error(
        'rental',
        'RentalImagesUploadFailed',
        { rentalId: id, reason: (error as Error).message },
        id,
      );
      throw new BadRequestException('Falha ao processar upload de imagens do aluguel');
    }
  }

  private validateAndNormalizeFile(file: any) {
    if (!file) {
      throw new BadRequestException('Arquivo de imagem não informado');
    }
    const isValidType = /image\/(jpg|jpeg|png|webp|gif)$/i.test(file.mimetype);
    if (!isValidType) {
      throw new BadRequestException('Formato de imagem inválido');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Imagem excede o limite de 5MB');
    }
    return {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };
  }

  private emitEvent(eventName: string, rentalId: string, payload: Record<string, unknown>) {
    this.eventEmitter.emit(eventName, {
      ...payload,
      rentalId,
    });
  }
}

export { AluguelAdminService as RentalAdminService };
