import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LogsService } from '../../../application/logs/services';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  CreateRentalInventoryDto,
  PerformInspectionDto,
  RentalInventoryResponseDto,
  UpdateRentalInventoryDto,
} from '../dto';
import { RentalInventoryRepository } from '../repositories';

type CurrentUser = {
  id: string;
  email?: string;
  role?: string;
};

type RentalInventoryFilters = {
  page?: number;
  limit?: number;
  quality?: string;
};

type QualityReport = {
  generatedAt: Date;
  summary: {
    totalItems: number;
    good: number;
    medium: number;
    bad: number;
  };
  items: RentalInventoryResponseDto[];
};

@Injectable()
export class RentalInventoryService {
  constructor(
    private readonly rentalInventoryRepository: RentalInventoryRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly logsService: LogsService,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateRentalInventoryDto,
    user: CurrentUser,
  ): Promise<RentalInventoryResponseDto> {
    const created = await this.rentalInventoryRepository.create(dto);
    const full = await this.rentalInventoryRepository.findByProductId(created.productId);

    this.eventEmitter.emit('rental.inventory.created', {
      productId: full.productId,
      quality: full.quality,
      userId: user.id,
    });

    const createdAuthor = await this.resolveAuditAuthor(user);
    await this.logsService.info(
      'inventory',
      'RentalInventoryCreated',
      {
        action: 'CREATE',
        entity: 'RentalInventory',
        entityId: full.productId,
        sku: full.product.sku,
        author: createdAuthor,
        changes: {
          rentalInventory: {
            old: null,
            new: {
              productId: full.productId,
              quality: full.quality,
              note: full.note,
            },
          },
        },
        description: `Rental inventory created for product ${full.product.sku}`,
      },
      full.productId,
      {
        source: 'inventory.rental-inventory.service',
        userId: createdAuthor.userId,
      },
    );

    return this.toResponse(full);
  }

  async update(
    productId: string,
    dto: UpdateRentalInventoryDto,
    user: CurrentUser,
  ): Promise<RentalInventoryResponseDto> {
    const previous = await this.rentalInventoryRepository.findByProductId(productId);
    const updated = await this.rentalInventoryRepository.update(productId, dto);
    const full = await this.rentalInventoryRepository.findByProductId(updated.productId);

    this.eventEmitter.emit('rental.inventory.updated', {
      productId: full.productId,
      quality: full.quality,
      userId: user.id,
    });

    const updatedAuthor = await this.resolveAuditAuthor(user);
    await this.logsService.info(
      'inventory',
      'RentalInventoryUpdated',
      {
        action: 'UPDATE',
        entity: 'RentalInventory',
        entityId: full.productId,
        sku: full.product.sku,
        author: updatedAuthor,
        changes: {
          quality: { old: previous.quality, new: full.quality },
          note: { old: previous.note, new: full.note },
        },
        description: `Rental inventory updated for product ${full.product.sku}`,
      },
      full.productId,
      {
        source: 'inventory.rental-inventory.service',
        userId: updatedAuthor.userId,
      },
    );

    return this.toResponse(full);
  }

  async list(filters: RentalInventoryFilters): Promise<{
    items: RentalInventoryResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const result = await this.rentalInventoryRepository.findAll(filters);
    return {
      items: result.items.map((item: any) => this.toResponse(item)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  async performInspection(
    productId: string,
    dto: PerformInspectionDto,
    user: CurrentUser,
  ): Promise<RentalInventoryResponseDto> {
    const previous = await this.rentalInventoryRepository.findByProductId(productId);
    await this.rentalInventoryRepository.performInspection(productId, dto);
    const full = await this.rentalInventoryRepository.findByProductId(productId);

    this.eventEmitter.emit('rental.inventory.inspected', {
      productId,
      previousQuality: previous.quality,
      newQuality: full.quality,
      userId: user.id,
    });

    const inspectedAuthor = await this.resolveAuditAuthor(user);
    await this.logsService.info(
      'inventory',
      'RentalInventoryInspected',
      {
        action: 'UPDATE',
        entity: 'RentalInventory',
        entityId: full.productId,
        sku: full.product.sku,
        author: inspectedAuthor,
        changes: {
          quality: { old: previous.quality, new: full.quality },
          note: { old: previous.note, new: full.note },
          lastVerification: { old: previous.lastVerification, new: full.lastVerification },
        },
        description: `Inspection performed for product ${full.product.sku}`,
      },
      full.productId,
      {
        source: 'inventory.rental-inventory.service',
        userId: inspectedAuthor.userId,
      },
    );

    return this.toResponse(full);
  }

  async getByProduct(productId: string): Promise<RentalInventoryResponseDto> {
    const item = await this.rentalInventoryRepository.findByProductId(productId);
    return this.toResponse(item);
  }

  async generateQualityReport(filters: RentalInventoryFilters): Promise<QualityReport> {
    const result = await this.rentalInventoryRepository.findAll({
      ...filters,
      page: 1,
      limit: 10000,
    });
    const items = result.items.map((item: any) => this.toResponse(item));
    const summary = items.reduce(
      (acc, item) => {
        if (item.quality === 'GOOD') {
          acc.good += 1;
        } else if (item.quality === 'MEDIUM') {
          acc.medium += 1;
        } else if (item.quality === 'BAD') {
          acc.bad += 1;
        }
        return acc;
      },
      { totalItems: items.length, good: 0, medium: 0, bad: 0 },
    );

    return {
      generatedAt: new Date(),
      summary,
      items,
    };
  }

  private toResponse(item: any): RentalInventoryResponseDto {
    return {
      productId: item.productId,
      productName: item.product?.name ?? '',
      productSku: item.product?.sku ?? '',
      stockQuantity: Number(item.product?.stockQuantity ?? 0),
      quality: item.quality as any,
      lastInspectionAt: item.lastVerification,
      note: item.note ?? undefined,
    };
  }

  private async resolveAuditAuthor(user: CurrentUser): Promise<{
    userId: string;
    name: string;
    email: string;
  }> {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        profile: true,
        emails: { orderBy: { isPrimary: 'desc' }, take: 1 },
      },
    });
    const email = dbUser?.emails[0]?.email ?? user.email ?? '';
    return {
      userId: dbUser?.id ?? user.id,
      name: dbUser?.profile?.fullName ?? dbUser?.username ?? user.id,
      email,
    };
  }
}
