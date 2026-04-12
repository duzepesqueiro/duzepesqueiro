import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Prisma,
  Product,
  ProductCategory,
  ProductStatus,
  UserRole,
} from '@prisma/client';
import { LogsService } from '../../../application/logs/services';
import { MailService } from '../../../application/mail/services/mail.service';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { EventTypes } from '../../../shared/events/event-types';
import {
  CreateProductDto,
  MovementHistoryDto,
  ProductListFilterDto,
  ProductListResponseDto,
  ProductResponseDto,
  SupplierSummaryDto,
  UpdateProductDto,
  UpdateStockDto,
} from '../dto';
import {
  ConcurrencyControlRepository,
  ProductRepository,
  RentalInventoryRepository,
  SupplierRepository,
} from '../repositories';
import { ProductImageStorageService } from './product-image-storage.service';

type CurrentUser = {
  id: string;
  email?: string;
  role?: string;
  username?: string;
};

type AuditAuthor = {
  userId: string;
  name: string;
  email: string;
};

@Injectable()
export class ProductService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly supplierRepository: SupplierRepository,
    private readonly concurrencyControlRepository: ConcurrencyControlRepository,
    private readonly rentalInventoryRepository: RentalInventoryRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly logsService: LogsService,
    private readonly mailService: MailService,
    private readonly prisma: PrismaService,
    private readonly productImageStorageService: ProductImageStorageService,
  ) {}

  async create(dto: CreateProductDto, user: CurrentUser): Promise<ProductResponseDto> {
    await this.supplierRepository.findById(dto.supplierId);
    const processedImage = null;
    const created = await this.prisma.$transaction(async (tx) => {
      const sku = await this.generateSku(dto.category as ProductCategory);
      const stockQuantity = dto.stockQuantity ?? 0;
      const minimumLimit = dto.minimumLimit ?? 0;
      const suggestedQuantity = dto.suggestedQuantity ?? 0;

      const product = await tx.product.create({
        data: {
          sku,
          name: dto.name,
          description: dto.description,
          image: processedImage,
          status: dto.status as ProductStatus,
          category: dto.category as ProductCategory,
          unitMeasure: dto.unitMeasure as any,
          stockQuantity: new Prisma.Decimal(stockQuantity),
          minimumLimit: new Prisma.Decimal(minimumLimit),
          suggestedQuantity: new Prisma.Decimal(suggestedQuantity),
          costPrice: new Prisma.Decimal(dto.costPrice),
          salePrice: new Prisma.Decimal(dto.salePrice),
          location: dto.location,
          restockDate: dto.restockDate ? new Date(dto.restockDate) : null,
          supplierId: dto.supplierId,
          createdById: user.id,
          turnoverRate: (dto.turnoverRate as any) ?? 'MEDIUM',
        } as any,
      });

      await tx.inventoryConcurrencyControl.upsert({
        where: { productId: product.id },
        create: { productId: product.id, version: 0 },
        update: {},
      });

      if (dto.status === 'RENTAL') {
        await tx.rentalInventory.create({
          data: {
            productId: product.id,
            quality: 'GOOD',
            lastVerification: new Date(),
          },
        });
      }

      if (stockQuantity > 0) {
        await tx.inventoryMovement.create({
          data: {
            productId: product.id,
            movementType: 'INBOUND',
            movementReason: 'PURCHASE',
            quantity: new Prisma.Decimal(stockQuantity),
            previousBalance: new Prisma.Decimal(0),
            nextBalance: new Prisma.Decimal(stockQuantity),
            userId: user.id,
            note: 'Initial stock',
          },
        });
      }

      return product;
    });

    const createdWithRelations = await this.productRepository.findById(created.id);
    this.eventEmitter.emit('product.created', {
      productId: createdWithRelations.id,
      sku: createdWithRelations.sku,
      name: createdWithRelations.name,
      userId: user.id,
    });

    const createdAuthor = await this.resolveAuditAuthor(user);
    await this.logsService.info(
      'inventory',
      'ProductCreated',
      {
        action: 'CREATE',
        entity: 'Product',
        entityId: createdWithRelations.id,
        sku: createdWithRelations.sku,
        author: createdAuthor,
        changes: {
          product: {
            old: null,
            new: {
              id: createdWithRelations.id,
              sku: createdWithRelations.sku,
              name: createdWithRelations.name,
              status: createdWithRelations.status,
              category: createdWithRelations.category,
            },
          },
        },
        description: `Product ${createdWithRelations.sku} created`,
      },
      createdWithRelations.id,
      {
        source: 'inventory.product.service',
        userId: createdAuthor.userId,
      },
    );

    await this.notifyAdmins('CREATION', createdWithRelations, user);
    return this.mapToResponse(createdWithRelations as any);
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    user: CurrentUser,
    isAdmin: boolean,
  ): Promise<ProductResponseDto> {
    const currentProduct = await this.productRepository.findById(id);
    const previous = { ...currentProduct };
    const data: UpdateProductDto = { ...dto };

    if (!isAdmin) {
      delete data.costPrice;
      delete data.salePrice;
    }

    const lockInfo = await this.prisma.inventoryConcurrencyControl.findUnique({
      where: { productId: id },
      select: { version: true },
    });

    const updated = await this.productRepository.updateWithOptimisticLock(
      id,
      data,
      lockInfo?.version ?? 0,
      user.id,
    );

    this.eventEmitter.emit('product.updated', {
      productId: updated.id,
      sku: updated.sku,
      changedFields: Object.keys(data),
      userId: user.id,
    });

    const updatedAuthor = await this.resolveAuditAuthor(user);
    await this.logsService.info(
      'inventory',
      'ProductUpdated',
      {
        action: 'UPDATE',
        entity: 'Product',
        entityId: updated.id,
        sku: updated.sku,
        author: updatedAuthor,
        changes: this.calculateDifferences(previous, updated),
        description: `Product ${updated.sku} updated`,
      },
      updated.id,
      {
        source: 'inventory.product.service',
        userId: updatedAuthor.userId,
      },
    );

    await this.notifyAdmins('UPDATE', updated, user);
    return this.mapToResponse(updated as any);
  }

  async uploadImage(
    id: string,
    file: any,
    user: CurrentUser,
  ): Promise<ProductResponseDto> {
    const [image] = await this.uploadImagesInternal(id, [file], user);
    const updated = await this.productRepository.updateImage(id, image ?? null, user.id);
    const updatedAuthor = await this.resolveAuditAuthor(user);
    await this.logsService.info(
      'inventory',
      'ProductImageUpdated',
      {
        action: 'UPDATE_IMAGE',
        entity: 'Product',
        entityId: updated.id,
        sku: updated.sku,
        author: updatedAuthor,
        changes: {
          image: { old: null, new: image },
        },
        description: `Imagem do produto ${updated.sku} atualizada`,
      },
      updated.id,
      {
        source: 'inventory.product.service',
        userId: updatedAuthor.userId,
      },
    );
    return this.mapToResponse(updated as any);
  }

  async uploadImages(
    id: string,
    files: Express.Multer.File[],
    user: CurrentUser,
  ): Promise<ProductResponseDto> {
    const images = await this.uploadImagesInternal(id, files, user);
    const firstImage = images[0] ?? null;
    const updated = await this.productRepository.updateImage(id, firstImage, user.id);
    return this.mapToResponse(updated as any);
  }

  async delete(id: string, user: CurrentUser, isAdmin: boolean): Promise<void> {
    if (!isAdmin) {
      throw new ForbiddenException('Only administrators can delete products');
    }

    const product = await this.productRepository.findById(id);
    await this.productRepository.softDelete(id, user.id);

    const deletedAuthor = await this.resolveAuditAuthor(user);
    await this.logsService.warn(
      'inventory',
      'ProductSoftDeleted',
      {
        action: 'SOFT_DELETE',
        entity: 'Product',
        entityId: product.id,
        sku: product.sku,
        author: deletedAuthor,
        changes: {
          deletedAt: { old: null, new: new Date() },
        },
        description: `Product ${product.sku} soft deleted`,
      },
      product.id,
      {
        source: 'inventory.product.service',
        userId: deletedAuthor.userId,
      },
    );

    this.eventEmitter.emit('product.deleted', {
      productId: product.id,
      sku: product.sku,
      userId: user.id,
    });

    await this.notifyAdmins('DELETION', product, user);
  }

  async adjustStock(
    id: string,
    dto: UpdateStockDto,
    user: CurrentUser,
  ): Promise<MovementHistoryDto> {
    const product = await this.productRepository.findById(id);
    await this.concurrencyControlRepository.acquireLock(id, user.id, 30_000);

    try {
      const movement = await this.prisma.$transaction(async (tx) => {
        const latestProduct = await tx.product.findUnique({
          where: { id },
          select: {
            id: true,
            deletedAt: true,
            stockQuantity: true,
            minimumLimit: true,
            sku: true,
          },
        });
        if (!latestProduct || latestProduct.deletedAt) {
          throw new NotFoundException('Product not found');
        }

        const previousBalance = Number(latestProduct.stockQuantity);
        const adjustment = Math.abs(dto.quantity);
        const nextBalance =
          dto.movementType === 'OUTBOUND'
            ? previousBalance - adjustment
            : previousBalance + adjustment;

        if (nextBalance < 0) {
          throw new BadRequestException(
            `Insufficient stock. Available: ${previousBalance}, requested: ${adjustment}`,
          );
        }

        await tx.product.update({
          where: { id },
          data: { stockQuantity: new Prisma.Decimal(nextBalance), editedById: user.id },
        });

        const createdMovement = await tx.inventoryMovement.create({
          data: {
            productId: id,
            movementType: dto.movementType as any,
            movementReason: dto.movementReason as any,
            quantity: new Prisma.Decimal(adjustment),
            previousBalance: new Prisma.Decimal(previousBalance),
            nextBalance: new Prisma.Decimal(nextBalance),
            userId: user.id,
            referenceId: dto.referenceId,
            referenceType: dto.referenceType,
            note: dto.note,
          },
        });

        return {
          movement: createdMovement,
          nextBalance,
          minimumLimit: Number(latestProduct.minimumLimit),
          sku: latestProduct.sku,
        };
      });

      this.eventEmitter.emit(EventTypes.INVENTORY_UPDATED, {
        productId: id,
        movementType: dto.movementType,
        movementReason: dto.movementReason,
        quantity: dto.quantity,
        previousBalance: Number(movement.movement.previousBalance),
        newBalance: Number(movement.movement.nextBalance),
      });

      if (movement.nextBalance < movement.minimumLimit) {
        this.eventEmitter.emit(EventTypes.INVENTORY_LOW_STOCK, {
          productId: id,
          sku: movement.sku,
          currentQuantity: movement.nextBalance,
          minimumQuantity: movement.minimumLimit,
          suggestedReorderQuantity:
            Number(product.suggestedQuantity) > 0
              ? Number(product.suggestedQuantity)
              : movement.minimumLimit,
        });
      }

      return {
        id: movement.movement.id,
        movementType: movement.movement.movementType as any,
        movementReason: movement.movement.movementReason as any,
        quantity: Number(movement.movement.quantity),
        previousBalance: Number(movement.movement.previousBalance),
        nextBalance: Number(movement.movement.nextBalance),
        userId: movement.movement.userId,
        referenceId: movement.movement.referenceId ?? undefined,
        referenceType: movement.movement.referenceType ?? undefined,
        note: movement.movement.note ?? undefined,
        createdAt: movement.movement.createdAt,
      };
    } finally {
      await this.concurrencyControlRepository.releaseLock(id);
    }
  }

  async list(filters: ProductListFilterDto): Promise<ProductListResponseDto> {
    const result = await this.productRepository.findAll(filters);
    return {
      items: result.items.map((item: any) => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        image: item.image ?? undefined,
        category: item.category,
        status: item.status,
        stockQuantity: Number(item.stockQuantity),
        minimumLimit: Number(item.minimumLimit),
        salePrice: Number(item.salePrice),
        supplierName: item.supplier?.name ?? '',
        isLowStock: Number(item.stockQuantity) < Number(item.minimumLimit),
      })),
      total: result.total,
      page: result.page,
      itemsPerPage: result.limit,
      totalPages: result.totalPages,
    };
  }

  async get(id: string): Promise<ProductResponseDto> {
    const product = await this.productRepository.findById(id);
    return this.mapToResponse(product as any);
  }

  async getBySku(sku: string): Promise<ProductResponseDto> {
    const product = await this.productRepository.findBySku(sku);
    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }
    return this.mapToResponse(product as any);
  }

  private mapToResponse(product: Product & { supplier?: SupplierSummaryDto }): ProductResponseDto {
    const stockQuantity = Number(product.stockQuantity);
    const minimumLimit = Number(product.minimumLimit);
    const images = ((product as any).productImages ?? [])
      .map((item: any) => item?.imageUrl)
      .filter((value: unknown): value is string => typeof value === 'string' && value.length > 0);
    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: (product as any).description ?? undefined,
      image: (product as any).image ?? undefined,
      images,
      status: product.status as any,
      category: product.category as any,
      unitMeasure: product.unitMeasure as any,
      stockQuantity,
      minimumLimit,
      suggestedQuantity: Number(product.suggestedQuantity),
      costPrice: Number(product.costPrice),
      salePrice: Number(product.salePrice),
      location: product.location ?? undefined,
      restockDate: product.restockDate ?? undefined,
      turnoverRate: product.turnoverRate as any,
      supplier: product.supplier
        ? {
            id: product.supplier.id,
            name: (product.supplier as any).name,
            cnpj: (product.supplier as any).cnpj,
          }
        : undefined,
      createdBy: product.createdById,
      editedBy: product.editedById ?? undefined,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      deletedAt: product.deletedAt ?? undefined,
      isLowStock: stockQuantity < minimumLimit,
      totalValue: stockQuantity * Number(product.costPrice),
    };
  }

  private async uploadImagesInternal(
    id: string,
    files: Express.Multer.File[],
    user: CurrentUser,
  ): Promise<string[]> {
    await this.productRepository.findById(id);
    if (!files?.length) {
      throw new BadRequestException('Nenhuma imagem enviada.');
    }
    if (files.length > 10) {
      throw new BadRequestException('Máximo de 10 imagens por envio.');
    }
    const existingCount = await this.productRepository.countImages(id);
    if (existingCount + files.length > 10) {
      throw new BadRequestException('Limite máximo de 10 imagens por produto excedido.');
    }
    const urls: string[] = [];
    for (const file of files) {
      const imageUrl = await this.processProductImage(file);
      if (imageUrl) {
        await this.productRepository.addImage(id, imageUrl);
        urls.push(imageUrl);
      }
    }
    void this.logsService.info(
      'inventory',
      'ProductImagesUploaded',
      {
        action: 'UPLOAD_IMAGES',
        entity: 'Product',
        entityId: id,
        totalImages: urls.length,
        author: {
          userId: user.id,
          username: user.username,
        },
      },
      id,
    );
    return urls;
  }

  private calculateDifferences(
    previous: Record<string, unknown>,
    current: Record<string, unknown>,
  ): Record<string, { old: unknown; new: unknown }> {
    const fields = [
      'name',
      'description',
      'image',
      'status',
      'category',
      'stockQuantity',
      'costPrice',
      'salePrice',
      'location',
      'minimumLimit',
      'suggestedQuantity',
      'restockDate',
      'turnoverRate',
    ];

    return fields.reduce<Record<string, { old: unknown; new: unknown }>>(
      (acc, field) => {
        const oldValue = previous[field];
        const newValue = current[field];
        if (String(oldValue) !== String(newValue)) {
          acc[field] = { old: oldValue, new: newValue };
        }
        return acc;
      },
      {},
    );
  }

  private async notifyAdmins(
    action: 'CREATION' | 'UPDATE' | 'DELETION',
    product: Product,
    user: CurrentUser,
  ): Promise<void> {
    const actor = await this.resolveAuditAuthor(user);
    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.ADMIN, isActive: true },
      include: {
        profile: true,
        emails: {
          where: { isVerified: true },
          orderBy: { isPrimary: 'desc' },
          take: 1,
        },
      },
    });

    await Promise.all(
      admins
        .map((admin) => ({
          email: admin.emails[0]?.email,
          name: admin.profile?.fullName ?? admin.username,
        }))
        .filter((admin) => Boolean(admin.email))
        .map((admin) =>
          this.mailService.sendProductLifecycleNotification({
            email: admin.email as string,
            adminName: admin.name,
            action,
            productName: product.name,
            sku: product.sku,
            productStatus: product.status,
            category: product.category,
            stockQuantity: Number(product.stockQuantity),
            salePrice: Number(product.salePrice),
            costPrice: Number(product.costPrice),
            actorName: actor.name,
            actorEmail: actor.email,
            occurredAt: new Date().toISOString(),
          }),
        ),
    );
  }

  private async resolveAuditAuthor(user: CurrentUser): Promise<AuditAuthor> {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        profile: true,
        emails: { orderBy: { isPrimary: 'desc' }, take: 1 },
      },
    });
    if (!dbUser) {
      throw new NotFoundException('User not found');
    }
    const email = dbUser.emails[0]?.email ?? user.email;
    if (!email) {
      throw new ConflictException('Unable to resolve user email for audit log');
    }
    return {
      userId: dbUser.id,
      name: dbUser.profile?.fullName ?? dbUser.username,
      email,
    };
  }

  private async generateSku(category: ProductCategory): Promise<string> {
    const prefixByCategory: Record<ProductCategory, string> = {
      FISHING_EQUIPMENT: 'FE',
      FOOD: 'FD',
      RENTAL_EQUIPMENT: 'RE',
      EVENT_ITEM: 'EV',
      HOSTING_ITEM: 'HS',
      DRINK: 'DK',
      ACCESSORY: 'AC',
      CLEANING_MATERIAL: 'CM',
      OTHER: 'OT',
    };
    const prefix = prefixByCategory[category] ?? 'OT';
    const lastSku = await this.prisma.product.findFirst({
      where: { sku: { startsWith: `${prefix}-` } },
      orderBy: { sku: 'desc' },
      select: { sku: true },
    });
    const next =
      lastSku?.sku && !Number.isNaN(Number.parseInt(lastSku.sku.split('-')[1], 10))
        ? Number.parseInt(lastSku.sku.split('-')[1], 10) + 1
        : 1;
    return `${prefix}-${next.toString().padStart(5, '0')}`;
  }

  private async processProductImage(file?: any): Promise<string | null> {
    if (!file) {
      return null;
    }
    return this.productImageStorageService.upload(file);
  }

}
