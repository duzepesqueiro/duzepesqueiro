import { Injectable, NotFoundException } from '@nestjs/common';
import { ItemCondition, RentalStatus } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { RentalKpiService } from './aluguel-kpi.service';

@Injectable()
export class AluguelAdminFacadeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rentalKpiService: RentalKpiService,
  ) {}

  async getKpis() {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 30);
    const [metrics, utilization] = await Promise.all([
      this.rentalKpiService.getRentalMetrics({ startDate, endDate: now }),
      this.rentalKpiService.getUtilizationRate(),
    ]);
    return [
      {
        id: 'active-rentals',
        title: 'Aluguéis Ativos',
        value: String(metrics.activeRentals),
        change: `${metrics.overdueRentals} atrasados`,
        changeType: metrics.overdueRentals > 0 ? 'negative' : 'neutral',
        icon: 'Activity',
        color: 'text-primary',
        description: 'Aluguéis em andamento no momento.',
      },
      {
        id: 'completed-rentals',
        title: 'Devoluções no Período',
        value: String(metrics.returnedRentals),
        change: `${metrics.totalRentals} totais`,
        changeType: 'positive',
        icon: 'CheckCircle',
        color: 'text-success',
        description: 'Itens devolvidos nos últimos 30 dias.',
      },
      {
        id: 'rental-revenue',
        title: 'Receita de Aluguel',
        value: this.formatCurrency(metrics.totalRevenue),
        change: `${metrics.cancelledRentals} cancelados`,
        changeType: metrics.cancelledRentals > 0 ? 'negative' : 'neutral',
        icon: 'DollarSign',
        color: 'text-secondary',
        description: 'Receita confirmada de aluguéis no período.',
      },
      {
        id: 'utilization-rate',
        title: 'Taxa de Utilização',
        value: `${utilization.utilizationRate}%`,
        change: `${utilization.totalBookedItems} itens locados`,
        changeType: utilization.utilizationRate >= 70 ? 'positive' : 'neutral',
        icon: 'Gauge',
        color: 'text-warning',
        description: 'Percentual de equipamentos de aluguel ocupados.',
      },
    ];
  }

  async getHistory() {
    const prisma = this.prisma as any;
    const rentals = await prisma.rental.findMany({
      where: { deletedAt: null },
      include: {
        user: {
          select: {
            username: true,
            profile: { select: { fullName: true } },
            phones: { select: { phoneNumber: true, isPrimary: true } },
          },
        },
        items: {
          where: { deletedAt: null },
          include: { product: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rentals.map((rental: any) => this.toHistoryItem(rental));
  }

  async getTimeline(range: string) {
    const prisma = this.prisma as any;
    const { from, to } = this.resolveRange(range);
    const rentals = await prisma.rental.findMany({
      where: {
        deletedAt: null,
        rentalDate: {
          gte: from,
          lte: to,
        },
      },
      include: {
        user: {
          select: {
            username: true,
            profile: { select: { fullName: true } },
          },
        },
        items: {
          where: { deletedAt: null },
          include: { product: { select: { name: true } } },
        },
      },
      orderBy: { rentalDate: 'asc' },
    });
    return rentals.map((rental: any) => this.toTimelineItem(rental));
  }

  async markAsReturned(rentalId: string, condition?: string | null) {
    const prisma = this.prisma as any;
    const found = await prisma.rental.findFirst({
      where: { id: rentalId, deletedAt: null },
      select: { id: true },
    });
    if (!found) {
      throw new NotFoundException('Aluguel não encontrado');
    }
    const returnCondition = this.toCondition(condition);
    await prisma.rentalItem.updateMany({
      where: { rentalId, deletedAt: null },
      data: {
        status: RentalStatus.RETURNED,
        checkInAt: new Date(),
        returnCondition: returnCondition ?? undefined,
      },
    });
    return { success: true };
  }

  async updateCondition(rentalId: string, condition?: string | null) {
    const prisma = this.prisma as any;
    const found = await prisma.rental.findFirst({
      where: { id: rentalId, deletedAt: null },
      select: { id: true },
    });
    if (!found) {
      throw new NotFoundException('Aluguel não encontrado');
    }
    await prisma.rentalItem.updateMany({
      where: { rentalId, deletedAt: null },
      data: {
        returnCondition: this.toCondition(condition),
      },
    });
    return { success: true };
  }

  private toHistoryItem(rental: any) {
    const firstItem = rental.items?.[0];
    const activeStatus = this.resolveStatus(rental.items || []);
    const startDateTime = firstItem?.checkOutAt || rental.rentalDate;
    const endDateTime = firstItem?.checkInAt || rental.returnDate;
    return {
      id: rental.id,
      equipment: this.getEquipmentName(rental.items),
      customer: rental.user?.profile?.fullName || rental.user?.username || 'Cliente',
      phone: this.getPrimaryPhone(rental.user?.phones),
      startTime: this.formatDateTime(startDateTime),
      endTime: this.formatDateTime(rental.returnDate),
      returnTime: firstItem?.checkInAt ? this.formatDateTime(firstItem.checkInAt) : null,
      duration: this.formatDuration(startDateTime, endDateTime),
      status: this.toUiStatus(activeStatus),
      condition: this.toUiCondition(firstItem?.returnCondition),
      revenue: this.formatCurrency(Number(rental.totalAmount || 0)),
      location: 'Pesqueiro',
    };
  }

  private toTimelineItem(rental: any) {
    const firstItem = rental.items?.[0];
    const startDateTime = firstItem?.checkOutAt || rental.rentalDate;
    const endDateTime = firstItem?.checkInAt || rental.returnDate;
    const status = this.resolveStatus(rental.items || []);
    return {
      id: rental.id,
      productName: this.getEquipmentName(rental.items),
      customer: rental.user?.profile?.fullName || rental.user?.username || 'Cliente',
      startTime: this.formatDateTime(startDateTime),
      endTime: this.formatDateTime(rental.returnDate),
      rentalHours: this.getTotalHours(startDateTime, endDateTime),
      status: this.toUiStatus(status),
      progressPercent: this.getProgressPercent(startDateTime, endDateTime, status),
      formattedTotal: this.formatCurrency(Number(rental.totalAmount || 0)),
    };
  }

  private resolveStatus(items: any[]): RentalStatus {
    if (!Array.isArray(items) || items.length === 0) {
      return RentalStatus.PENDING;
    }
    if (items.some((item) => item.status === RentalStatus.OVERDUE)) {
      return RentalStatus.OVERDUE;
    }
    if (items.some((item) => item.status === RentalStatus.ACTIVE)) {
      return RentalStatus.ACTIVE;
    }
    if (items.some((item) => item.status === RentalStatus.PENDING)) {
      return RentalStatus.PENDING;
    }
    if (items.some((item) => item.status === RentalStatus.CANCELLED)) {
      return RentalStatus.CANCELLED;
    }
    return RentalStatus.RETURNED;
  }

  private toUiStatus(status: RentalStatus): string {
    if (status === RentalStatus.RETURNED) {
      return 'returned';
    }
    if (status === RentalStatus.OVERDUE) {
      return 'overdue';
    }
    if (status === RentalStatus.CANCELLED) {
      return 'cancelled';
    }
    return 'active';
  }

  private toUiCondition(condition?: ItemCondition | null): string | null {
    if (!condition) {
      return null;
    }
    return condition.toLowerCase();
  }

  private toCondition(condition?: string | null): ItemCondition | null {
    if (!condition || condition === 'none') {
      return null;
    }
    const normalized = condition.toString().toUpperCase();
    if (normalized === ItemCondition.EXCELLENT) {
      return ItemCondition.EXCELLENT;
    }
    if (normalized === ItemCondition.GOOD) {
      return ItemCondition.GOOD;
    }
    if (normalized === ItemCondition.FAIR) {
      return ItemCondition.FAIR;
    }
    if (normalized === ItemCondition.POOR) {
      return ItemCondition.POOR;
    }
    if (normalized === ItemCondition.DAMAGED) {
      return ItemCondition.DAMAGED;
    }
    return null;
  }

  private getEquipmentName(items: any[]): string {
    const names = (items || [])
      .map((item) => item?.product?.name)
      .filter(Boolean);
    if (names.length === 0) {
      return 'Equipamento';
    }
    if (names.length === 1) {
      return names[0];
    }
    return `${names[0]} +${names.length - 1}`;
  }

  private getPrimaryPhone(phones: any[]): string {
    if (!Array.isArray(phones) || phones.length === 0) {
      return '';
    }
    const primary = phones.find((phone) => phone?.isPrimary);
    return primary?.phoneNumber || phones[0]?.phoneNumber || '';
  }

  private formatDateTime(value?: Date | string | null): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }

  private formatDuration(start?: Date | string | null, end?: Date | string | null): string {
    const totalHours = this.getTotalHours(start, end);
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);
    if (minutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${minutes}m`;
  }

  private getTotalHours(start?: Date | string | null, end?: Date | string | null): number {
    if (!start || !end) {
      return 0;
    }
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = endDate.getTime() - startDate.getTime();
    if (Number.isNaN(diff) || diff <= 0) {
      return 0;
    }
    return Number((diff / (1000 * 60 * 60)).toFixed(2));
  }

  private getProgressPercent(
    start?: Date | string | null,
    end?: Date | string | null,
    status?: RentalStatus,
  ): number {
    if (!start || !end) {
      return 0;
    }
    if (status === RentalStatus.RETURNED) {
      return 100;
    }
    const startDate = new Date(start);
    const endDate = new Date(end);
    const now = new Date();
    const duration = endDate.getTime() - startDate.getTime();
    if (duration <= 0) {
      return 0;
    }
    const elapsed = now.getTime() - startDate.getTime();
    return Number(((elapsed / duration) * 100).toFixed(2));
  }

  private resolveRange(range?: string) {
    const now = new Date();
    if (range === 'today') {
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);
      const to = new Date(now);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }
    if (range === 'week') {
      const from = new Date(now);
      from.setDate(now.getDate() - now.getDay());
      from.setHours(0, 0, 0, 0);
      const to = new Date(from);
      to.setDate(from.getDate() + 6);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  private formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0);
  }
}

export { AluguelAdminFacadeService as RentalAdminFacadeService };
