import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ProductCategory as PrismaProductCategory,
  User,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from '../dto';
import {
  ProductCategory as DomainProductCategory,
  ProductStatus,
  UnitMeasure,
} from '../enums';
import { KpiService } from './kpi.service';
import { ProductService } from './product.service';
import { PurchaseOrderService } from './purchase-order.service';
import { SupplierService } from './supplier.service';

type DashboardCard = {
  id: string;
  icon: string;
  title: string;
  value: string;
  changeType: 'positive' | 'negative' | 'neutral';
  change: string;
  description: string;
  lastUpdated: string;
};

type InventoryItemDto = {
  id: string;
  sku: string;
  product: string;
  name: string;
  category: string;
  currentStock: number;
  stock: number;
  minThreshold: number;
  suggestedQuantity: number;
  unitCost: number;
  sellingPrice: number;
  supplier: string;
  supplierId: string | null;
  location: string;
  description: string | null;
  image: string | null;
  images: string[];
  status: 'good' | 'low' | 'critical';
  source: 'SALE' | 'RENTAL';
  lastRestocked: string | null;
};

type UiSalePayload = {
  sku?: string;
  product?: string;
  category?: string;
  location?: string;
  description?: string;
  currentStock?: number;
  minThreshold?: number;
  suggestedQuantity?: number;
  unitCost?: number;
  sellingPrice?: number;
  supplier?: string;
  supplierId?: string;
  lastRestocked?: string | null;
};

type UiRentalPayload = {
  name?: string;
  sku?: string;
  hourlyPrice?: number;
  available?: number;
  image?: string | null;
  description?: string | null;
  fullDescription?: string | null;
  supplier?: string;
  supplierId?: string;
};

@Injectable()
export class InventoryAdminFacadeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productService: ProductService,
    private readonly purchaseOrderService: PurchaseOrderService,
    private readonly kpiService: KpiService,
    private readonly supplierService: SupplierService,
  ) {}

  async getInventoryItems(search?: string): Promise<InventoryItemDto[]> {
    const products = await this.prisma.product.findMany({
      where: {
        deletedAt: null,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { supplier: { name: { contains: search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        supplier: { select: { id: true, name: true } },
        productImages: {
          orderBy: { createdAt: 'asc' },
          select: { imageUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return products.map((product) => {
      const currentStock = Number(product.stockQuantity);
      const minimumLimit = Number(product.minimumLimit);
      const status =
        currentStock <= 0 ? 'critical' : currentStock < minimumLimit ? 'low' : 'good';

      return {
        id: product.id,
        sku: product.sku,
        product: product.name,
        name: product.name,
        category: this.toFrontendCategory(product.category),
        currentStock,
        stock: currentStock,
        minThreshold: minimumLimit,
        suggestedQuantity: Number(product.suggestedQuantity),
        unitCost: Number(product.costPrice),
        sellingPrice: Number(product.salePrice),
        supplier: product.supplier?.name ?? '-',
        supplierId: product.supplier?.id ?? null,
        location: product.location ?? '',
        description: product.description ?? null,
        image: product.image ?? product.productImages[0]?.imageUrl ?? null,
        images: product.productImages.map((item) => item.imageUrl),
        status,
        source: product.status === ProductStatus.RENTAL ? 'RENTAL' : 'SALE',
        lastRestocked: product.restockDate ? product.restockDate.toISOString().slice(0, 10) : null,
      };
    });
  }

  async getInventoryKpis(): Promise<DashboardCard[]> {
    const dashboard = await this.kpiService.getDashboard();
    const updatedAt = dashboard.lastUpdatedAt;
    const updatedLabel = `${updatedAt.toLocaleDateString('pt-BR')} ${updatedAt.toLocaleTimeString('pt-BR')}`;
    const lowStockValue = dashboard.lowStock.totalLowStockItems;
    const stockoutValue = dashboard.stockout.stockoutPercentage;
    const stockoutType = stockoutValue > 0 ? 'negative' : 'positive';
    const lowStockType = lowStockValue > 0 ? 'negative' : 'positive';

    return [
      {
        id: 'kpi-total-stock-value',
        icon: 'DollarSign',
        title: 'Valor Total em Estoque',
        value: this.currency(dashboard.totalStockValue.totalValue),
        changeType: this.getChangeType(dashboard.totalStockValue.percentageVariation),
        change: this.percent(dashboard.totalStockValue.percentageVariation),
        description: 'Soma de custo dos itens em estoque',
        lastUpdated: updatedLabel,
      },
      {
        id: 'kpi-stock-turnover',
        icon: 'RefreshCw',
        title: 'Giro de Estoque',
        value: dashboard.stockTurnover.annualTurnover.toFixed(2),
        changeType: 'neutral',
        change: '0,00%',
        description: 'Relação anual entre consumo e estoque médio',
        lastUpdated: updatedLabel,
      },
      {
        id: 'kpi-stockout',
        icon: 'AlertTriangle',
        title: 'Ruptura de Estoque',
        value: `${dashboard.stockout.stockoutPercentage.toFixed(2)}%`,
        changeType: stockoutType,
        change: this.percent(dashboard.stockout.stockoutPercentage),
        description: `${dashboard.stockout.stockoutItems} itens sem estoque`,
        lastUpdated: updatedLabel,
      },
      {
        id: 'kpi-low-stock',
        icon: 'PackageMinus',
        title: 'Itens em Baixo Estoque',
        value: `${lowStockValue}`,
        changeType: lowStockType,
        change: `${lowStockValue}`,
        description: 'Produtos abaixo do limite mínimo',
        lastUpdated: updatedLabel,
      },
      {
        id: 'kpi-aged-stock',
        icon: 'Clock',
        title: 'Estoque Envelhecido',
        value: this.currency(dashboard.agedStock.agedStockValue),
        changeType: dashboard.agedStock.agedStockValue > 0 ? 'negative' : 'positive',
        change: dashboard.agedStock.daysWithoutMovement.toString(),
        description: `Sem movimento há ${dashboard.agedStock.daysWithoutMovement} dias`,
        lastUpdated: updatedLabel,
      },
      {
        id: 'kpi-healthy-rate',
        icon: 'ShieldCheck',
        title: 'Saúde do Estoque',
        value: `${(100 - stockoutValue).toFixed(2)}%`,
        changeType: stockoutValue > 0 ? 'negative' : 'positive',
        change: `${Math.max(0, lowStockValue).toString()} alertas`,
        description: 'Percentual de itens disponíveis',
        lastUpdated: updatedLabel,
      },
    ];
  }

  async getInventoryHeatmap(): Promise<
    Array<{ category: string; location: string; stockLevel: number; inventoryValue: number }>
  > {
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      select: {
        category: true,
        location: true,
        stockQuantity: true,
        costPrice: true,
      },
    });

    return products.map((product) => {
      const stock = Number(product.stockQuantity);
      const value = Number(product.costPrice) * stock;
      return {
        category: this.toFrontendCategory(product.category),
        location: product.location ?? 'Sem localização',
        stockLevel: stock,
        inventoryValue: Number(value.toFixed(2)),
      };
    });
  }

  async getReorderSuggestions(): Promise<
    Array<{
      id: string;
      product: string;
      currentStock: number;
      minThreshold: number;
      suggestedQuantity: number;
      unitCost: number;
      supplier: string;
      leadTime: string;
      priority: 'critical' | 'high' | 'medium';
    }>
  > {
    const suggestions = await this.purchaseOrderService.generatePurchaseSuggestions();
    const productIds = suggestions.items.map((item) => item.productId);
    const products = productIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            costPrice: true,
            supplier: { select: { name: true } },
          },
        })
      : [];
    const productMap = new Map(products.map((item) => [item.id, item]));

    return suggestions.items.map((item) => {
      const product = productMap.get(item.productId);
      const priority =
        item.currentStock <= 0
          ? 'critical'
          : item.priorityScore >= 3
            ? 'high'
            : 'medium';

      return {
        id: item.productId,
        product: item.name,
        currentStock: item.currentStock,
        minThreshold: item.minimumLimit,
        suggestedQuantity: item.suggestedQuantity,
        unitCost: Number(product?.costPrice ?? 0),
        supplier: product?.supplier?.name ?? '-',
        leadTime: 'N/D',
        priority,
      };
    });
  }

  async getSupplierPerformance(): Promise<
    Array<{
      id: string;
      name: string;
      rating: number;
      onTimeDelivery: number;
      qualityScore: number;
      totalOrders: number;
      avgLeadTime: string;
      totalProducts: number;
      stockoutCount: number;
      lowStockCount: number;
      availabilityRate: number;
      avgMarginPercent: number;
      avgDaysSinceRestock: number;
    }>
  > {
    const suppliers = await this.supplierService.list({ page: 1, limit: 300 });
    const supplierIds = suppliers.items.map((item) => item.id);
    const products = supplierIds.length
      ? await this.prisma.product.findMany({
          where: { deletedAt: null, supplierId: { in: supplierIds } },
          select: {
            supplierId: true,
            stockQuantity: true,
            minimumLimit: true,
            salePrice: true,
            costPrice: true,
            restockDate: true,
          },
        })
      : [];
    const orders = supplierIds.length
      ? await this.prisma.purchaseOrder.findMany({
          where: { supplierId: { in: supplierIds } },
          select: {
            supplierId: true,
            orderDate: true,
            deliveredAt: true,
          },
        })
      : [];

    return suppliers.items.map((supplier) => {
      const supplierProducts = products.filter((item) => item.supplierId === supplier.id);
      const supplierOrders = orders.filter((item) => item.supplierId === supplier.id);
      const totalProducts = supplierProducts.length;
      const stockoutCount = supplierProducts.filter((item) => Number(item.stockQuantity) <= 0).length;
      const lowStockCount = supplierProducts.filter(
        (item) => Number(item.stockQuantity) > 0 && Number(item.stockQuantity) < Number(item.minimumLimit),
      ).length;
      const availabilityRate =
        totalProducts > 0 ? Number((((totalProducts - stockoutCount) / totalProducts) * 100).toFixed(2)) : 100;
      const avgMarginPercent = this.computeAverageMargin(supplierProducts);
      const avgDaysSinceRestock = this.computeAverageDaysSinceRestock(supplierProducts);
      const leadTimeDays = this.computeLeadTimeDays(supplierOrders);
      const totalOrders = supplier.metrics?.totalOrders ?? supplierOrders.length;
      const onTimeDeliveries =
        supplier.metrics?.onTimeDeliveries ??
        supplierOrders.filter((order) => Boolean(order.deliveredAt)).length;
      const onTimeDelivery =
        totalOrders > 0 ? Number(((onTimeDeliveries / totalOrders) * 100).toFixed(2)) : 100;

      return {
        id: supplier.id,
        name: supplier.name,
        rating: supplier.rating,
        onTimeDelivery,
        qualityScore: supplier.rating,
        totalOrders,
        avgLeadTime: leadTimeDays > 0 ? `${leadTimeDays.toFixed(1)} dias` : 'N/D',
        totalProducts,
        stockoutCount,
        lowStockCount,
        availabilityRate,
        avgMarginPercent,
        avgDaysSinceRestock,
      };
    });
  }

  async createSaleItem(payload: UiSalePayload, user: User): Promise<InventoryItemDto> {
    const supplierId = await this.resolveSupplierId(payload.supplierId, payload.supplier);
    const dto: CreateProductDto = {
      name: this.requireText(payload.product, 'Nome do produto'),
      status: ProductStatus.SALE,
      category: this.toProductCategory(payload.category),
      unitMeasure: UnitMeasure.UNIT,
      stockQuantity: Number(payload.currentStock ?? 0),
      minimumLimit: Number(payload.minThreshold ?? 0),
      suggestedQuantity: Number(payload.suggestedQuantity ?? payload.minThreshold ?? 0),
      costPrice: Number(payload.unitCost ?? 0),
      salePrice: Number(payload.sellingPrice ?? 0),
      location: payload.location ?? undefined,
      description: payload.description ?? undefined,
      restockDate: payload.lastRestocked ?? undefined,
      supplierId,
    };
    const created = await this.productService.create(dto, user);
    const product = await this.findByIdForUi(created.id);
    if (!product) {
      throw new NotFoundException('Produto não encontrado após criação');
    }
    return product;
  }

  async updateSaleItem(id: string, payload: UiSalePayload, user: User): Promise<InventoryItemDto> {
    const supplierId = await this.resolveSupplierId(payload.supplierId, payload.supplier);
    const dto: UpdateProductDto = {
      name: payload.product,
      description: payload.description,
      category: payload.category ? this.toProductCategory(payload.category) : undefined,
      stockQuantity: payload.currentStock !== undefined ? Number(payload.currentStock) : undefined,
      minimumLimit: payload.minThreshold !== undefined ? Number(payload.minThreshold) : undefined,
      suggestedQuantity: payload.minThreshold !== undefined ? Number(payload.minThreshold) : undefined,
      costPrice: payload.unitCost !== undefined ? Number(payload.unitCost) : undefined,
      salePrice: payload.sellingPrice !== undefined ? Number(payload.sellingPrice) : undefined,
      location: payload.location,
      restockDate: payload.lastRestocked ?? undefined,
      supplierId,
    };
    await this.productService.update(id, dto, user, user.role === UserRole.ADMIN);
    const product = await this.findByIdForUi(id);
    if (!product) {
      throw new NotFoundException('Produto não encontrado após atualização');
    }
    return product;
  }

  async deleteSaleItem(id: string, user: User): Promise<void> {
    await this.productService.delete(id, user, user.role === UserRole.ADMIN);
  }

  async createRentalItem(payload: UiRentalPayload, user: User): Promise<InventoryItemDto> {
    const hourlyPrice = this.requirePositiveNumber(payload.hourlyPrice, 'Preço por hora');
    const available = this.requireNonNegativeNumber(payload.available, 'Quantidade disponível');
    const supplierId = await this.resolveSupplierId(payload.supplierId, payload.supplier);
    const dto: CreateProductDto = {
      name: this.requireText(payload.name, 'Nome do item de aluguel'),
      status: ProductStatus.RENTAL,
      category: DomainProductCategory.RENTAL_EQUIPMENT,
      unitMeasure: UnitMeasure.UNIT,
      stockQuantity: available,
      minimumLimit: 0,
      suggestedQuantity: 0,
      costPrice: hourlyPrice,
      salePrice: hourlyPrice,
      supplierId,
      description: payload.fullDescription ?? payload.description ?? undefined,
    };
    const created = await this.productService.create(dto, user);
    const product = await this.findByIdForUi(created.id);
    if (!product) {
      throw new NotFoundException('Item de aluguel não encontrado após criação');
    }
    return product;
  }

  async updateRentalItem(id: string, payload: UiRentalPayload, user: User): Promise<InventoryItemDto> {
    const current = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, status: true, deletedAt: true },
    });
    if (!current || current.deletedAt) {
      throw new NotFoundException('Item de aluguel nao encontrado');
    }
    if (current.status !== ProductStatus.RENTAL) {
      throw new BadRequestException('O produto informado nao e um item de aluguel.');
    }

    const hourlyPrice = this.requirePositiveNumber(payload.hourlyPrice, 'Preco por hora');
    const available = this.requireNonNegativeNumber(payload.available, 'Quantidade disponivel');
    const supplierId = await this.resolveSupplierId(payload.supplierId, payload.supplier);
    const dto: UpdateProductDto = {
      name: this.requireText(payload.name, 'Nome do item de aluguel'),
      status: ProductStatus.RENTAL,
      category: DomainProductCategory.RENTAL_EQUIPMENT,
      stockQuantity: available,
      costPrice: hourlyPrice,
      salePrice: hourlyPrice,
      supplierId,
      description: payload.fullDescription ?? payload.description ?? undefined,
    };
    await this.productService.update(id, dto, user, user.role === UserRole.ADMIN);
    const product = await this.findByIdForUi(id);
    if (!product) {
      throw new NotFoundException('Item de aluguel nao encontrado apos atualizacao');
    }
    return product;
  }

  private async findBySkuForUi(sku: string): Promise<InventoryItemDto> {
    const product = await this.prisma.product.findUnique({
      where: { sku },
      include: {
        supplier: { select: { id: true, name: true } },
        productImages: {
          orderBy: { createdAt: 'asc' },
          select: { imageUrl: true },
        },
      },
    });
    if (!product || product.deletedAt) {
      throw new NotFoundException('Produto não encontrado');
    }
    const currentStock = Number(product.stockQuantity);
    const minimumLimit = Number(product.minimumLimit);
    const status =
      currentStock <= 0 ? 'critical' : currentStock < minimumLimit ? 'low' : 'good';
    return {
      id: product.id,
      sku: product.sku,
      product: product.name,
      name: product.name,
      category: this.toFrontendCategory(product.category),
      currentStock,
      stock: currentStock,
      minThreshold: minimumLimit,
      suggestedQuantity: Number(product.suggestedQuantity),
      unitCost: Number(product.costPrice),
      sellingPrice: Number(product.salePrice),
      supplier: product.supplier?.name ?? '-',
      supplierId: product.supplier?.id ?? null,
      location: product.location ?? '',
      description: product.description ?? null,
      image: product.image ?? (product as any).productImages?.[0]?.imageUrl ?? null,
      images: ((product as any).productImages ?? []).map((item: any) => item.imageUrl),
      status,
      source: product.status === ProductStatus.RENTAL ? 'RENTAL' : 'SALE',
      lastRestocked: product.restockDate ? product.restockDate.toISOString().slice(0, 10) : null,
    };
  }

  private async findByIdForUi(id: string): Promise<InventoryItemDto | null> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true } },
        productImages: {
          orderBy: { createdAt: 'asc' },
          select: { imageUrl: true },
        },
      },
    });
    if (!product || product.deletedAt) {
      return null;
    }
    const currentStock = Number(product.stockQuantity);
    const minimumLimit = Number(product.minimumLimit);
    const status =
      currentStock <= 0 ? 'critical' : currentStock < minimumLimit ? 'low' : 'good';
    return {
      id: product.id,
      sku: product.sku,
      product: product.name,
      name: product.name,
      category: this.toFrontendCategory(product.category),
      currentStock,
      stock: currentStock,
      minThreshold: minimumLimit,
      suggestedQuantity: Number(product.suggestedQuantity),
      unitCost: Number(product.costPrice),
      sellingPrice: Number(product.salePrice),
      supplier: product.supplier?.name ?? '-',
      supplierId: product.supplier?.id ?? null,
      location: product.location ?? '',
      description: product.description ?? null,
      image: product.image ?? (product as any).productImages?.[0]?.imageUrl ?? null,
      images: ((product as any).productImages ?? []).map((item: any) => item.imageUrl),
      status,
      source: product.status === ProductStatus.RENTAL ? 'RENTAL' : 'SALE',
      lastRestocked: product.restockDate ? product.restockDate.toISOString().slice(0, 10) : null,
    };
  }

  private toFrontendCategory(category: PrismaProductCategory | string): string {
    switch (category) {
      case DomainProductCategory.FISHING_EQUIPMENT:
        return 'Equipamentos de Pesca';
      case DomainProductCategory.FOOD:
        return 'Alimentos';
      case DomainProductCategory.RENTAL_EQUIPMENT:
        return 'Equipamentos para Aluguel';
      case DomainProductCategory.EVENT_ITEM:
        return 'Itens para Eventos';
      case DomainProductCategory.HOSTING_ITEM:
        return 'Itens para Hospedagem';
      case DomainProductCategory.DRINK:
        return 'Bebidas';
      case DomainProductCategory.ACCESSORY:
        return 'Acessórios';
      case DomainProductCategory.CLEANING_MATERIAL:
        return 'Material de Limpeza';
      case DomainProductCategory.OTHER:
        return 'Outros';
      default:
        return 'Outros';
    }
  }

  private toProductCategory(category?: string): DomainProductCategory {
    const value = (category ?? '').trim().toUpperCase();
    if (
      value === DomainProductCategory.FISHING_EQUIPMENT ||
      value === 'EQUIPAMENTOS DE PESCA'
    ) {
      return DomainProductCategory.FISHING_EQUIPMENT;
    }
    if (
      value === DomainProductCategory.FOOD ||
      value === 'ALIMENTOS'
    ) {
      return DomainProductCategory.FOOD;
    }
    if (
      value === DomainProductCategory.RENTAL_EQUIPMENT ||
      value === 'EQUIPAMENTOS PARA ALUGUEL'
    ) {
      return DomainProductCategory.RENTAL_EQUIPMENT;
    }
    if (
      value === DomainProductCategory.EVENT_ITEM ||
      value === 'ITENS PARA EVENTOS'
    ) {
      return DomainProductCategory.EVENT_ITEM;
    }
    if (
      value === DomainProductCategory.HOSTING_ITEM ||
      value === 'ITENS PARA HOSPEDAGEM'
    ) {
      return DomainProductCategory.HOSTING_ITEM;
    }
    if (value === DomainProductCategory.DRINK || value === 'BEBIDAS') {
      return DomainProductCategory.DRINK;
    }
    if (value === DomainProductCategory.ACCESSORY || value === 'ACESSÓRIOS') {
      return DomainProductCategory.ACCESSORY;
    }
    if (
      value === DomainProductCategory.CLEANING_MATERIAL ||
      value === 'MATERIAL DE LIMPEZA'
    ) {
      return DomainProductCategory.CLEANING_MATERIAL;
    }
    if (value === DomainProductCategory.OTHER || value === 'OUTROS') {
      return DomainProductCategory.OTHER;
    }
    return DomainProductCategory.OTHER;
  }

  private getChangeType(variation: number): 'positive' | 'negative' | 'neutral' {
    if (variation > 0) {
      return 'positive';
    }
    if (variation < 0) {
      return 'negative';
    }
    return 'neutral';
  }

  private percent(value: number): string {
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${value.toFixed(2)}%`;
  }

  private currency(value: number): string {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  private requireText(value: string | undefined, message: string): string {
    if (!value || !value.trim()) {
      throw new BadRequestException(message);
    }
    return value.trim();
  }

  private requirePositiveNumber(value: unknown, fieldName: string): number {
    if (value === undefined || value === null || value === '') {
      throw new BadRequestException(`${fieldName} é obrigatório.`);
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      throw new BadRequestException(`${fieldName} deve ser maior que zero.`);
    }

    return numericValue;
  }

  private requireNonNegativeNumber(value: unknown, fieldName: string): number {
    if (value === undefined || value === null || value === '') {
      throw new BadRequestException(`${fieldName} é obrigatória.`);
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      throw new BadRequestException(`${fieldName} não pode ser negativa.`);
    }

    return numericValue;
  }

  private async resolveSupplierId(supplierId?: string, supplierName?: string): Promise<string> {
    if (supplierId) {
      const foundById = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
      if (foundById) {
        return foundById.id;
      }
    }

    if (supplierName && supplierName.trim()) {
      const foundByName = await this.prisma.supplier.findFirst({
        where: {
          name: { equals: supplierName.trim(), mode: 'insensitive' },
          deletedAt: null,
        },
      });
      if (foundByName) {
        return foundByName.id;
      }
    }

    const firstSupplier = await this.prisma.supplier.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    if (!firstSupplier) {
      throw new BadRequestException(
        'Nenhum fornecedor cadastrado. Cadastre um fornecedor antes de criar produtos.',
      );
    }
    return firstSupplier.id;
  }

  private computeAverageMargin(
    products: Array<{ salePrice: unknown; costPrice: unknown }>,
  ): number {
    const margins = products
      .map((item) => {
        const sale = Number(item.salePrice);
        const cost = Number(item.costPrice);
        if (cost <= 0) {
          return null;
        }
        return ((sale - cost) / cost) * 100;
      })
      .filter((value): value is number => value !== null);
    if (margins.length === 0) {
      return 0;
    }
    return Number((margins.reduce((acc, curr) => acc + curr, 0) / margins.length).toFixed(2));
  }

  private computeAverageDaysSinceRestock(
    products: Array<{ restockDate: Date | null }>,
  ): number {
    const now = Date.now();
    const values = products
      .map((item) => {
        if (!item.restockDate) {
          return null;
        }
        return (now - item.restockDate.getTime()) / (1000 * 60 * 60 * 24);
      })
      .filter((value): value is number => value !== null);
    if (values.length === 0) {
      return 0;
    }
    return Number((values.reduce((acc, curr) => acc + curr, 0) / values.length).toFixed(1));
  }

  private computeLeadTimeDays(
    orders: Array<{ orderDate: Date; deliveredAt: Date | null }>,
  ): number {
    const values = orders
      .map((order) => {
        if (!order.deliveredAt) {
          return null;
        }
        return (order.deliveredAt.getTime() - order.orderDate.getTime()) / (1000 * 60 * 60 * 24);
      })
      .filter((value): value is number => value !== null && value >= 0);
    if (values.length === 0) {
      return 0;
    }
    return values.reduce((acc, curr) => acc + curr, 0) / values.length;
  }
}
