import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus, Prisma, SalesOrderStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { SalesOrderRepository } from '../../repositories';

type RangeKey = 'week' | 'month' | 'year';

type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  itemsPerPage: number;
  totalPages: number;
};

@Injectable()
export class SalesAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salesOrderRepository: SalesOrderRepository,
  ) {}

  private getDateRange(range: RangeKey) {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const days = range === 'week' ? 7 : range === 'year' ? 365 : 30;
    start.setDate(start.getDate() - (days - 1));

    const previousEnd = new Date(start);
    previousEnd.setMilliseconds(-1);

    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - days);
    previousStart.setHours(0, 0, 0, 0);

    return { start, end, previousStart, previousEnd, days };
  }

  private currency(value: unknown) {
    return Number(value ?? 0);
  }

  async getKpis(range: RangeKey) {
    const { start, end, previousStart, previousEnd } = this.getDateRange(range);

    const whereCurrent = {
      createdAt: { gte: start, lte: end },
      status: SalesOrderStatus.CONFIRMED,
    };

    const wherePrevious = {
      createdAt: { gte: previousStart, lte: previousEnd },
      status: SalesOrderStatus.CONFIRMED,
    };

    const [currentAgg, currentCount, previousAgg] = await Promise.all([
      this.prisma.salesOrder.aggregate({
        where: whereCurrent,
        _sum: { totalAmount: true },
      }),
      this.prisma.salesOrder.count({ where: whereCurrent }),
      this.prisma.salesOrder.aggregate({
        where: wherePrevious,
        _sum: { totalAmount: true },
      }),
    ]);

    const revenue = this.currency(currentAgg._sum.totalAmount);
    const previousRevenue = this.currency(previousAgg._sum.totalAmount);
    const orders = currentCount;
    const avgTicket = orders ? revenue / orders : 0;

    const growthPct =
      previousRevenue > 0 ? ((revenue - previousRevenue) / previousRevenue) * 100 : revenue > 0 ? 100 : 0;

    const periodLabel = range === 'week' ? 'semana anterior' : range === 'year' ? 'ano anterior' : 'mês anterior';

    return [
      {
        id: 'revenue',
        iconBg: 'bg-primary/10',
        icon: 'DollarSign',
        iconColor: 'text-primary',
        change: growthPct,
        type: 'currency',
        value: Math.round(revenue),
        label: 'Receita',
        period: periodLabel,
      },
      {
        id: 'orders',
        iconBg: 'bg-secondary/10',
        icon: 'ShoppingCart',
        iconColor: 'text-secondary',
        change: 0,
        type: 'number',
        value: orders,
        label: 'Pedidos',
        period: periodLabel,
      },
      {
        id: 'aov',
        iconBg: 'bg-accent/10',
        icon: 'CreditCard',
        iconColor: 'text-accent',
        change: 0,
        type: 'currency',
        value: Math.round(avgTicket),
        label: 'Ticket médio',
        period: periodLabel,
      },
      {
        id: 'growth',
        iconBg: 'bg-warning/10',
        icon: 'TrendingUp',
        iconColor: 'text-warning',
        change: growthPct,
        type: 'number',
        value: Number(growthPct.toFixed(1)),
        label: 'Crescimento',
        period: periodLabel,
      },
    ];
  }

  async getPerformance(range: RangeKey) {
    const { start, end } = this.getDateRange(range);
    const orders = await this.prisma.salesOrder.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: SalesOrderStatus.CONFIRMED,
      },
      select: { createdAt: true, totalAmount: true },
      orderBy: { createdAt: 'asc' },
    });

    const map = new Map<string, { revenue: number; orders: number }>();

    const toKey = (date: Date) => {
      if (range === 'year') {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        return `${yyyy}-${mm}`;
      }
      return date.toISOString().slice(0, 10);
    };

    orders.forEach((order) => {
      const key = toKey(order.createdAt);
      const prev = map.get(key) || { revenue: 0, orders: 0 };
      prev.revenue += this.currency(order.totalAmount);
      prev.orders += 1;
      map.set(key, prev);
    });

    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([period, agg]) => ({
        period,
        revenue: Math.round(agg.revenue),
        orders: agg.orders,
        avgTicket: agg.orders ? Math.round(agg.revenue / agg.orders) : 0,
      }));
  }

  async getCustomerAnalytics(range: RangeKey) {
    const { start, end } = this.getDateRange(range);

    const periodOrders = await this.prisma.salesOrder.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: SalesOrderStatus.CONFIRMED,
        userId: { not: null },
      },
      select: { userId: true, totalAmount: true },
    });

    const activeUserIds = Array.from(
      new Set(periodOrders.map((o) => o.userId).filter((id): id is string => Boolean(id))),
    );

    const [lifetimeCounts, firstOrders] = await Promise.all([
      activeUserIds.length
        ? this.prisma.salesOrder.groupBy({
            by: ['userId'],
            where: { userId: { in: activeUserIds }, status: SalesOrderStatus.CONFIRMED },
            _count: { _all: true },
          })
        : [],
      activeUserIds.length
        ? this.prisma.salesOrder.groupBy({
            by: ['userId'],
            where: { userId: { in: activeUserIds }, status: SalesOrderStatus.CONFIRMED },
            _min: { createdAt: true },
          })
        : [],
    ]);

    const lifetimeCountMap = new Map(lifetimeCounts.map((row) => [row.userId, row._count._all]));
    const firstOrderMap = new Map(firstOrders.map((row) => [row.userId, row._min.createdAt]));

    const activeCustomers = activeUserIds.length;
    const returningCustomers = activeUserIds.filter((id) => (lifetimeCountMap.get(id) || 0) >= 2).length;
    const newCustomers = activeUserIds.filter((id) => {
      const first = firstOrderMap.get(id);
      if (!first) return false;
      return first >= start && first <= end;
    }).length;

    const purchaseFrequency = activeCustomers ? periodOrders.length / activeCustomers : 0;

    const revenueByUser = new Map<string, number>();
    periodOrders.forEach((order) => {
      if (!order.userId) return;
      revenueByUser.set(
        order.userId,
        (revenueByUser.get(order.userId) || 0) + this.currency(order.totalAmount),
      );
    });

    const segmentBuckets = new Map<string, { count: number; revenue: number }>();
    const addToSegment = (key: string, revenue: number) => {
      const prev = segmentBuckets.get(key) || { count: 0, revenue: 0 };
      prev.count += 1;
      prev.revenue += revenue;
      segmentBuckets.set(key, prev);
    };

    activeUserIds.forEach((userId) => {
      const lifetimeCount = lifetimeCountMap.get(userId) || 0;
      const firstOrder = firstOrderMap.get(userId);
      const revenue = revenueByUser.get(userId) || 0;
      if (lifetimeCount >= 5) {
        addToSegment('VIP', revenue);
        return;
      }
      if (firstOrder && firstOrder >= start && firstOrder <= end) {
        addToSegment('Novos', revenue);
        return;
      }
      if (lifetimeCount >= 2) {
        addToSegment('Recorrentes', revenue);
        return;
      }
      addToSegment('Outros', revenue);
    });

    const segmentData = Array.from(segmentBuckets.entries()).map(([name, data]) => ({
      name,
      description: name === 'VIP' ? 'Maior recorrência' : name === 'Novos' ? 'Primeira compra no período' : '',
      value: data.count,
      revenue: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.revenue),
    }));

    return {
      customerData: {
        activeCustomers,
        returningCustomers,
        newCustomers,
        purchaseFrequency: Number(purchaseFrequency.toFixed(2)),
      },
      segmentData,
    };
  }

  async listSalesOrders(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'all' | 'pendente' | 'efetivada' | 'cancelada';
    sortField?: 'createdAt' | 'updatedAt' | 'totalAmount' | 'status';
    sortDirection?: 'asc' | 'desc';
  }): Promise<PaginatedResult<any>> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const search = (params.search || '').trim();
    const status = params.status ?? 'all';
    const sortField = params.sortField ?? 'createdAt';
    const sortDirection = params.sortDirection ?? 'desc';

    const statusMap: Record<string, SalesOrderStatus | undefined> = {
      pendente: SalesOrderStatus.PENDING,
      efetivada: SalesOrderStatus.CONFIRMED,
      cancelada: SalesOrderStatus.CANCELLED,
    };

    const where: Prisma.SalesOrderWhereInput = {
      status: status === 'all' ? undefined : statusMap[status],
      ...(search
        ? {
            OR: [
              { id: { contains: search, mode: 'insensitive' } },
              { user: { username: { contains: search, mode: 'insensitive' } } },
              { user: { profile: { fullName: { contains: search, mode: 'insensitive' } } } },
              { user: { emails: { some: { email: { contains: search, mode: 'insensitive' } } } } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.SalesOrderOrderByWithRelationInput =
      sortField === 'totalAmount'
        ? { totalAmount: sortDirection }
        : sortField === 'updatedAt'
          ? { updatedAt: sortDirection }
          : sortField === 'status'
            ? { status: sortDirection }
            : { createdAt: sortDirection };

    const [items, total] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true,
              profile: { select: { fullName: true } },
              emails: { where: { isPrimary: true }, take: 1, select: { email: true } },
            },
          },
          items: true,
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.salesOrder.count({ where }),
    ]);

    const mapped = items.map((order) => {
      const buyerName =
        order.user?.profile?.fullName ||
        order.user?.username ||
        order.user?.emails?.[0]?.email ||
        order.userId ||
        '-';

      const quantity = (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      const productName = (order.items || [])
        .slice(0, 2)
        .map((item) => item.nameSnapshot)
        .filter(Boolean)
        .join(', ');

      const statusLabel =
        order.status === SalesOrderStatus.CONFIRMED
          ? 'Efetivada'
          : order.status === SalesOrderStatus.CANCELLED
            ? 'Cancelada'
            : 'Pendente';

      return {
        id: order.id,
        buyerName,
        productName: productName || '-',
        quantity,
        totalPrice: this.currency(order.totalAmount),
        status: statusLabel,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        note: order.note ?? '',
        paymentStatus: order.paymentStatus,
      };
    });

    return {
      items: mapped,
      total,
      page,
      itemsPerPage: limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getSaleById(id: string) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            profile: { select: { fullName: true } },
            emails: { where: { isPrimary: true }, take: 1, select: { email: true } },
          },
        },
        items: { include: { product: { select: { id: true, sku: true, name: true } } } },
      },
    });
    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }
    return order;
  }

  async createSale(payload: { userId: string; items: Array<{ productId: string; quantity: number }>; note?: string }) {
    return this.salesOrderRepository.create(payload.userId, { items: payload.items, note: payload.note });
  }

  async updateSale(id: string, payload: { note?: string }) {
    const order = await this.prisma.salesOrder.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }
    return this.prisma.salesOrder.update({
      where: { id },
      data: { note: payload.note ?? order.note ?? null },
    });
  }

  async confirmSale(id: string) {
    const order = await this.prisma.salesOrder.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }
    if (order.status === SalesOrderStatus.CANCELLED) {
      throw new ConflictException('Pedido cancelado não pode ser confirmado');
    }
    return this.prisma.salesOrder.update({
      where: { id },
      data: { status: SalesOrderStatus.CONFIRMED, paymentStatus: PaymentStatus.PAID, paidAt: new Date() },
    });
  }

  async cancelSale(id: string, actorUserId: string) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }
    if (order.status !== SalesOrderStatus.PENDING || order.paymentStatus !== PaymentStatus.PENDING) {
      throw new ConflictException('Pedido não pode ser cancelado neste estado');
    }
    if (order.userId) {
      await this.salesOrderRepository.cancelForUser(order.userId, order.id);
      return this.prisma.salesOrder.findUnique({ where: { id } });
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of order.items ?? []) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { id: true, deletedAt: true, stockQuantity: true },
        });
        if (!product || product.deletedAt) {
          continue;
        }

        const previousBalance = Number(product.stockQuantity);
        const nextBalance = previousBalance + Math.abs(Number(item.quantity));

        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: new Prisma.Decimal(nextBalance) },
        });

        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            movementType: 'INBOUND',
            movementReason: 'SALE',
            quantity: new Prisma.Decimal(Math.abs(Number(item.quantity))),
            previousBalance: new Prisma.Decimal(previousBalance),
            nextBalance: new Prisma.Decimal(nextBalance),
            referenceId: order.id,
            referenceType: 'sales_order',
            userId: actorUserId,
            note: 'Cancelamento de venda (admin)',
          },
        });
      }

      await (tx as any).salesOrder.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          updatedAt: new Date(),
        },
      });
    });
    return this.prisma.salesOrder.findUnique({ where: { id } });
  }

  ensureRoleCanAccess(currentRole: UserRole) {
    const allowedRoles: UserRole[] = [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE];
    if (!allowedRoles.includes(currentRole)) {
      throw new BadRequestException('Permissão insuficiente');
    }
  }
}
