import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, UserRole } from '@prisma/client';
import { LogsService } from '../../../application/logs/services';
import { MailService } from '../../../application/mail/services/mail.service';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { PaginationDto } from '../../../shared/dto';
import {
  CreateSupplierDto,
  ProductListFilterDto,
  ProductListResponseDto,
  SupplierResponseDto,
  UpdateSupplierDto,
} from '../dto';
import { SupplierRepository } from '../repositories';

type CurrentUser = {
  id: string;
  email?: string;
  role?: string;
};

type SupplierListFilters = PaginationDto & {
  search?: string;
  includeDeleted?: boolean;
};

type AuditAuthor = {
  userId: string;
  name: string;
  email: string;
};

@Injectable()
export class SupplierService {
  constructor(
    private readonly supplierRepository: SupplierRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly logsService: LogsService,
    private readonly mailService: MailService,
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateSupplierDto, user: CurrentUser): Promise<SupplierResponseDto> {
    const normalizedCnpj = dto.cnpj.replace(/\D/g, '');
    const isCnpjValid = this.validateCnpj(normalizedCnpj);
    if (!isCnpjValid) {
      throw new ConflictException('Invalid CNPJ');
    }

    const existingByCnpj = await this.supplierRepository.findByCnpj(normalizedCnpj);
    if (existingByCnpj && !existingByCnpj.deletedAt) {
      throw new ConflictException('Supplier with this CNPJ already exists');
    }

    const created = await this.supplierRepository.create({
      ...dto,
      cnpj: normalizedCnpj,
    });

    this.eventEmitter.emit('supplier.created', {
      supplierId: created.id,
      cnpj: created.cnpj,
      userId: user.id,
    });

    const createdAuthor = await this.resolveAuditAuthor(user);
    await this.logsService.info(
      'inventory',
      'SupplierCreated',
      {
        action: 'CREATE',
        entity: 'Supplier',
        entityId: created.id,
        author: createdAuthor,
        changes: {
          supplier: { old: null, new: { id: created.id, name: created.name, cnpj: created.cnpj } },
        },
        description: `Supplier ${created.name} created`,
      },
      created.id,
      {
        source: 'inventory.supplier.service',
        userId: createdAuthor.userId,
      },
    );

    await this.notifyAdmins('CREATED', created.id, created.name, user);
    return this.mapToResponse(created);
  }

  async update(
    id: string,
    dto: UpdateSupplierDto,
    user: CurrentUser,
    isAdmin: boolean,
  ): Promise<SupplierResponseDto> {
    if (!isAdmin) {
      throw new ForbiddenException('Only administrators can update suppliers');
    }

    const current = await this.supplierRepository.findById(id);
    let normalizedCnpj = dto.cnpj?.replace(/\D/g, '');
    if (normalizedCnpj) {
      const isCnpjValid = this.validateCnpj(normalizedCnpj);
      if (!isCnpjValid) {
        throw new ConflictException('Invalid CNPJ');
      }
      const existingByCnpj = await this.supplierRepository.findByCnpj(normalizedCnpj);
      if (existingByCnpj && existingByCnpj.id !== id) {
        throw new ConflictException('Supplier with this CNPJ already exists');
      }
    }

    const updated = await this.supplierRepository.update(id, {
      ...dto,
      cnpj: normalizedCnpj ?? dto.cnpj,
    });

    this.eventEmitter.emit('supplier.updated', {
      supplierId: updated.id,
      changedFields: Object.keys(dto),
      userId: user.id,
    });

    const updatedAuthor = await this.resolveAuditAuthor(user);
    await this.logsService.info(
      'inventory',
      'SupplierUpdated',
      {
        action: 'UPDATE',
        entity: 'Supplier',
        entityId: updated.id,
        author: updatedAuthor,
        changes: this.calculateDifferences(current, updated),
        description: `Supplier ${updated.name} updated`,
      },
      updated.id,
      {
        source: 'inventory.supplier.service',
        userId: updatedAuthor.userId,
      },
    );

    await this.notifyAdmins('UPDATED', updated.id, updated.name, user);
    return this.mapToResponse(updated);
  }

  async delete(id: string, user: CurrentUser, isAdmin: boolean): Promise<void> {
    if (!isAdmin) {
      throw new ForbiddenException('Only administrators can delete suppliers');
    }

    const supplier = await this.supplierRepository.findById(id);
    await this.supplierRepository.softDelete(id);

    const deletedAuthor = await this.resolveAuditAuthor(user);
    await this.logsService.warn(
      'inventory',
      'SupplierSoftDeleted',
      {
        action: 'SOFT_DELETE',
        entity: 'Supplier',
        entityId: id,
        author: deletedAuthor,
        changes: { deletedAt: { old: null, new: new Date() } },
        description: `Supplier ${supplier.name} soft deleted`,
      },
      id,
      {
        source: 'inventory.supplier.service',
        userId: deletedAuthor.userId,
      },
    );

    this.eventEmitter.emit('supplier.deleted', {
      supplierId: id,
      userId: user.id,
    });

    await this.notifyAdmins('DELETED', id, supplier.name, user);
  }

  async list(filters: SupplierListFilters): Promise<{
    items: SupplierResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const result = await this.supplierRepository.findAll({
      page: filters.page,
      limit: filters.limit,
      includeDeleted: filters.includeDeleted,
      search: filters.search,
    });
    return {
      items: result.items.map((item) => this.mapToResponse(item)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  async get(id: string): Promise<SupplierResponseDto> {
    const supplier = await this.supplierRepository.findById(id);
    return this.mapToResponse(supplier);
  }

  async listProducts(
    supplierId: string,
    filters: ProductListFilterDto,
  ): Promise<ProductListResponseDto> {
    await this.supplierRepository.findById(supplierId);
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const where: any = {
      supplierId,
      deletedAt: filters.includeDeleted ? undefined : null,
      status: filters.status as any,
      category: filters.category as any,
      turnoverRate: filters.turnoverRate as any,
      OR: filters.search
        ? [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { sku: { contains: filters.search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { supplier: { select: { id: true, name: true } } },
      }),
      this.prisma.product.count({ where }),
    ]);

    const mappedItems = filters.lowStockOnly
      ? items.filter((item) => Number(item.stockQuantity) < Number(item.minimumLimit))
      : items;

    return {
      items: mappedItems.map((item) => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        category: item.category as any,
        status: item.status as any,
        stockQuantity: Number(item.stockQuantity),
        minimumLimit: Number(item.minimumLimit),
        salePrice: Number(item.salePrice),
        supplierName: item.supplier?.name ?? '',
        isLowStock: Number(item.stockQuantity) < Number(item.minimumLimit),
      })),
      total: filters.lowStockOnly ? mappedItems.length : total,
      page,
      itemsPerPage: limit,
      totalPages: Math.ceil((filters.lowStockOnly ? mappedItems.length : total) / limit),
    };
  }

  validateCnpj(cnpj: string): boolean {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length !== 14 || /^(\d)\1+$/.test(cleaned)) {
      return false;
    }

    const calculate = (base: string, weights: number[]): number => {
      const sum = base
        .split('')
        .reduce((acc, digit, index) => acc + Number(digit) * weights[index], 0);
      const remainder = sum % 11;
      return remainder < 2 ? 0 : 11 - remainder;
    };

    const firstDigit = calculate(cleaned.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    if (firstDigit !== Number(cleaned[12])) {
      return false;
    }

    const secondDigit = calculate(cleaned.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return secondDigit === Number(cleaned[13]);
  }

  async updateMetrics(
    supplierId: string,
    totalAmount: number,
    totalItems: number,
  ): Promise<void> {
    await this.supplierRepository.findById(supplierId);
    await this.supplierRepository.updateMetricsAfterPurchaseOrder(supplierId, {
      orderTotalAmount: totalAmount,
      totalItemsPurchased: totalItems,
      deliveredOnTime: false,
    });
  }

  async calculatePunctuality(supplierId: string): Promise<number> {
    await this.supplierRepository.findById(supplierId);

    const receivedOrders = await this.prisma.purchaseOrder.findMany({
      where: {
        supplierId,
        deletedAt: null,
        status: 'RECEIVED',
      },
      select: {
        id: true,
        expectedDelivery: true,
        deliveredAt: true,
      },
    });

    if (receivedOrders.length === 0) {
      return 0;
    }

    const onTime = receivedOrders.filter(
      (order) => order.deliveredAt && order.deliveredAt <= order.expectedDelivery,
    ).length;

    await this.prisma.supplier.update({
      where: { id: supplierId },
      data: { onTimeDeliveries: onTime },
    });

    return (onTime / receivedOrders.length) * 100;
  }

  private mapToResponse(supplier: {
    id: string;
    name: string;
    cnpj: string;
    rating: number;
    totalOrders: number;
    accumulatedValue: Prisma.Decimal;
    totalItemsPurchased: number;
    onTimeDeliveries: number;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): SupplierResponseDto {
    const punctuality =
      supplier.totalOrders > 0
        ? (supplier.onTimeDeliveries / supplier.totalOrders) * 100
        : 0;

    return {
      id: supplier.id,
      name: supplier.name,
      cnpj: supplier.cnpj,
      rating: supplier.rating,
      phone: undefined,
      email: undefined,
      address: undefined,
      metrics: {
        totalOrders: supplier.totalOrders,
        accumulatedValue: Number(supplier.accumulatedValue),
        totalItemsPurchased: supplier.totalItemsPurchased,
        onTimeDeliveries: supplier.onTimeDeliveries,
        onTimePercentage: Number(punctuality.toFixed(2)),
      },
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
      deletedAt: supplier.deletedAt ?? undefined,
    };
  }

  private calculateDifferences(
    previous: Record<string, unknown>,
    current: Record<string, unknown>,
  ): Record<string, { old: unknown; new: unknown }> {
    const fields = ['name', 'cnpj', 'rating'];
    return fields.reduce<Record<string, { old: unknown; new: unknown }>>((acc, field) => {
      if (String(previous[field]) !== String(current[field])) {
        acc[field] = { old: previous[field], new: current[field] };
      }
      return acc;
    }, {});
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

  private async notifyAdmins(
    action: 'CREATED' | 'UPDATED' | 'DELETED',
    supplierId: string,
    supplierName: string,
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
          this.mailService.sendOrderConfirmation({
            email: admin.email as string,
            customerName: admin.name,
            orderNumber: supplierId,
            total: 0,
            items: [{ name: `Supplier ${supplierName} ${action.toLowerCase()} by ${actor.name}`, quantity: 1 }],
          }),
        ),
    );
  }
}
