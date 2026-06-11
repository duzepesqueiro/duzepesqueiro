import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

type Dataset = 'events' | 'users' | 'inventory' | 'rentals' | 'sales' | 'overview' | 'hosting';
type ExportFormat = 'csv' | 'excel' | 'json';

type ExportResource = {
  key: string;
  fetch: () => Promise<unknown[]>;
};

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  listResources(dataset: Dataset): ExportResource[] {
    switch (dataset) {
      case 'events':
        return [
          {
            key: 'events',
            fetch: () => this.prisma.event.findMany({ where: { deletedAt: null } }),
          },
          {
            key: 'event_registrations',
            fetch: () => this.prisma.eventRegistration.findMany(),
          },
          {
            key: 'event_images',
            fetch: () => this.prisma.eventImage.findMany(),
          },
          {
            key: 'event_kpi_goals',
            fetch: () => this.prisma.eventKpiGoal.findMany(),
          },
        ];
      case 'users':
        return [
          {
            key: 'users',
            fetch: () => this.prisma.user.findMany(),
          },
          {
            key: 'user_profiles',
            fetch: () => this.prisma.userProfile.findMany(),
          },
          {
            key: 'user_emails',
            fetch: () => this.prisma.userEmail.findMany(),
          },
          {
            key: 'user_phones',
            fetch: () => this.prisma.userPhone.findMany(),
          },
        ];
      case 'inventory':
        return [
          {
            key: 'products',
            fetch: () => this.prisma.product.findMany({ where: { deletedAt: null } }),
          },
          {
            key: 'product_images',
            fetch: () => this.prisma.productImage.findMany(),
          },
          {
            key: 'inventory_movements',
            fetch: () => this.prisma.inventoryMovement.findMany(),
          },
          {
            key: 'purchase_orders',
            fetch: () => this.prisma.purchaseOrder.findMany(),
          },
          {
            key: 'purchase_order_items',
            fetch: () => this.prisma.purchaseOrderItem.findMany(),
          },
          {
            key: 'suppliers',
            fetch: () => this.prisma.supplier.findMany(),
          },
        ];
      case 'rentals':
        return [
          {
            key: 'rental_inventory',
            fetch: () => this.prisma.rentalInventory.findMany(),
          },
          {
            key: 'rental_items',
            fetch: () => this.prisma.rentalItem.findMany(),
          },
          {
            key: 'rental_carts',
            fetch: () => this.prisma.rentalCart.findMany(),
          },
          {
            key: 'rental_cart_items',
            fetch: () => this.prisma.rentalCartItem.findMany(),
          },
          {
            key: 'rental_audit_logs',
            fetch: () => this.prisma.rentalAuditLog.findMany(),
          },
          {
            key: 'payments',
            fetch: () =>
              this.prisma.payment.findMany({
                where: { domain: 'RENTAL' as any },
              }),
          },
          {
            key: 'reviews',
            fetch: () =>
              this.prisma.review.findMany({
                where: { domain: 'RENTAL' as any },
              }),
          },
        ];
      case 'sales':
        return [
          {
            key: 'sales_orders',
            fetch: () => this.prisma.salesOrder.findMany(),
          },
          {
            key: 'sales_order_items',
            fetch: () => this.prisma.salesOrderItem.findMany(),
          },
          {
            key: 'payments',
            fetch: () =>
              this.prisma.payment.findMany({
                where: { domain: 'SALES' as any },
              }),
          },
          {
            key: 'reviews',
            fetch: () =>
              this.prisma.review.findMany({
                where: { domain: 'SALES' as any },
              }),
          },
        ];
      case 'overview':
        return [
          {
            key: 'overview',
            fetch: () => this.getOverviewData(),
          },
        ];
      case 'hosting':
        return [
          {
            key: 'hosting_chalets',
            fetch: () => this.prisma.hostingChalet.findMany({ where: { deletedAt: null } }),
          },
          {
            key: 'hosting_amenities',
            fetch: () => this.prisma.hostingAmenity.findMany(),
          },
          {
            key: 'hosting_chalet_amenities',
            fetch: () => this.prisma.hostingChaletAmenity.findMany(),
          },
          {
            key: 'hosting_chalet_images',
            fetch: () => this.prisma.hostingChaletImage.findMany(),
          },
          {
            key: 'hosting_chalet_availability',
            fetch: () => this.prisma.hostingChaletAvailability.findMany(),
          },
          {
            key: 'hosting_pricing_rules',
            fetch: () => this.prisma.hostingPricingRule.findMany({ where: { deletedAt: null } }),
          },
          {
            key: 'hosting_pricing_rule_chalets',
            fetch: () => this.prisma.hostingPricingRuleChalet.findMany(),
          },
          {
            key: 'hosting_cancellation_policies',
            fetch: () => this.prisma.hostingCancellationPolicy.findMany(),
          },
          {
            key: 'hosting_reservations',
            fetch: () => this.prisma.hostingReservation.findMany(),
          },
          {
            key: 'hosting_chalet_blocks',
            fetch: () => this.prisma.hostingChaletBlock.findMany(),
          },
          {
            key: 'hosting_reservation_vouchers',
            fetch: () => this.prisma.hostingReservationVoucher.findMany(),
          },
          {
            key: 'hosting_reservation_guests',
            fetch: () => this.prisma.hostingReservationGuest.findMany(),
          },
          {
            key: 'hosting_reservation_reviews',
            fetch: () => this.prisma.hostingReservationReview.findMany(),
          },
          {
            key: 'hosting_notification_logs',
            fetch: () => this.prisma.hostingNotificationLog.findMany(),
          },
          {
            key: 'hosting_audit_logs',
            fetch: () => this.prisma.hostingAuditLog.findMany(),
          },
          {
            key: 'hosting_kpis',
            fetch: () => this.prisma.hostingKpi.findMany(),
          },
        ];
      default:
        return [];
    }
  }

  async getResourceData(dataset: Dataset, resourceKey: string): Promise<Record<string, unknown>[]> {
    const resource = this.listResources(dataset).find((item) => item.key === resourceKey);
    if (!resource) return [];
    const raw = await resource.fetch();
    return this.normalizeRows(raw);
  }

  serialize(rows: Record<string, unknown>[], format: ExportFormat): Buffer {
    if (format === 'json') {
      return Buffer.from(JSON.stringify(rows, null, 2), 'utf-8');
    }
    if (format === 'excel') {
      const html = this.toExcelHtml(rows);
      return Buffer.from(html, 'utf-8');
    }
    const csv = this.toCsv(rows);
    return Buffer.from(csv, 'utf-8');
  }

  async getEventsData(): Promise<Record<string, unknown>[]> {
    const prisma = this.prisma as any;
    const events = await prisma.event.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: {
            registrations: { where: { status: { not: 'CANCELLED' } } },
          },
        },
      },
      orderBy: { eventDate: 'asc' },
    });

    return events.map((e: any) => ({
      Título: e.title,
      Data: e.eventDate ? e.eventDate.toISOString().split('T')[0] : '',
      Horário: e.eventTime ?? '',
      Local: e.location,
      Status: e.status,
      'Total de Vagas': e.totalSlots,
      'Vagas Disponíveis': e.availableSlots,
      Participantes: e._count?.registrations ?? 0,
      Pago: e.isPaid ? 'Sim' : 'Não',
      'Preço (R$)': e.price != null ? Number(e.price).toFixed(2) : '',
    }));
  }

  async getUsersData(): Promise<Record<string, unknown>[]> {
    const users = await this.prisma.user.findMany({
      include: {
        emails: { where: { isPrimary: true }, take: 1 },
        profile: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => ({
      'Nome de usuário': u.username,
      Email: u.emails[0]?.email ?? '',
      'Nome completo': (u as any).profile?.fullName ?? '',
      Papel: u.role,
      Status: u.status,
      Ativo: u.isActive ? 'Sim' : 'Não',
      'Criado em': u.createdAt.toISOString().split('T')[0],
    }));
  }

  async getInventoryData(): Promise<Record<string, unknown>[]> {
    const prisma = this.prisma as any;
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' },
    });

    return products.map((p: any) => ({
      Nome: p.name,
      Categoria: p.category ?? '',
      'Preço (R$)': p.price != null ? Number(p.price).toFixed(2) : '',
      Estoque: p.stock ?? '',
      Ativo: p.isActive !== false ? 'Sim' : 'Não',
    }));
  }

  async getRentalsData(): Promise<Record<string, unknown>[]> {
    const prisma = this.prisma as any;
    const rentals = await prisma.aluguel.findMany({
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    return rentals.map((r: any) => ({
      ID: r.id,
      'Usuário ID': r.userId ?? '',
      Status: r.status ?? '',
      'Valor Total (R$)': r.valorTotal != null ? Number(r.valorTotal).toFixed(2) : '',
      'Criado em': r.createdAt ? r.createdAt.toISOString().split('T')[0] : '',
    }));
  }

  async getSalesData(): Promise<Record<string, unknown>[]> {
    const prisma = this.prisma as any;
    const orders = await prisma.order?.findMany?.({
      orderBy: { createdAt: 'desc' },
      take: 1000,
    }).catch(() => []) ?? [];

    return orders.map((o: any) => ({
      ID: o.id,
      'Usuário ID': o.userId ?? '',
      Status: o.status ?? '',
      'Total (R$)': o.total != null ? Number(o.total).toFixed(2) : '',
      'Criado em': o.createdAt ? o.createdAt.toISOString().split('T')[0] : '',
    }));
  }

  async getOverviewData(): Promise<Record<string, unknown>[]> {
    const prisma = this.prisma as any;
    const [totalUsers, totalEvents, totalRegistrations] = await Promise.all([
      this.prisma.user.count(),
      prisma.event.count({ where: { deletedAt: null } }),
      prisma.eventRegistration.count({ where: { status: { not: 'CANCELLED' } } }),
    ]);

    return [
      { Métrica: 'Total de Usuários', Valor: totalUsers },
      { Métrica: 'Total de Eventos', Valor: totalEvents },
      { Métrica: 'Total de Inscrições Ativas', Valor: totalRegistrations },
    ];
  }

  async getHostingData(): Promise<Record<string, unknown>[]> {
    const prisma = this.prisma as any;
    const reservations =
      (await prisma.hostingReservation
        .findMany({
          include: { chalet: true },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        })
        .catch(() => [])) ?? [];

    return reservations.map((r: any) => ({
      Código: r.code,
      Status: r.status,
      Origem: r.origin,
      Chalé: r.chalet?.name ?? '',
      'Check-in': r.checkInDate ? r.checkInDate.toISOString().split('T')[0] : '',
      'Check-out': r.checkOutDate ? r.checkOutDate.toISOString().split('T')[0] : '',
      Adultos: r.adults ?? 0,
      Crianças: r.children ?? 0,
      'Valor total (R$)': r.totalAmount != null ? Number(r.totalAmount).toFixed(2) : '',
      'Criado em': r.createdAt ? r.createdAt.toISOString().split('T')[0] : '',
    }));
  }

  private normalizeRows(rows: unknown[]): Record<string, unknown>[] {
    const normalized = rows.map((row) => JSON.parse(JSON.stringify(row ?? {})) as Record<string, unknown>);
    const keyOrder: string[] = [];
    const seen = new Set<string>();
    for (const row of normalized) {
      Object.keys(row).forEach((key) => {
        if (seen.has(key)) return;
        seen.add(key);
        keyOrder.push(key);
      });
    }
    return normalized.map((row) => {
      const ordered: Record<string, unknown> = {};
      keyOrder.forEach((key) => {
        ordered[key] = row[key];
      });
      return ordered;
    });
  }

  toCsv(rows: Record<string, unknown>[]): string {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const escape = (v: unknown) => {
      const value =
        v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
      return value.includes(',') || value.includes('"') || value.includes('\n')
        ? `"${value.replace(/"/g, '""')}"`
        : value;
    };
    const lines = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
    ];
    return '﻿' + lines.join('\r\n');
  }

  toExcelHtml(rows: Record<string, unknown>[]): string {
    if (!rows.length) return '<table></table>';
    const headers = Object.keys(rows[0]);
    const th = headers.map((h) => `<th>${h}</th>`).join('');
    const trs = rows
      .map(
        (r) =>
          `<tr>${headers
            .map((h) => {
              const v = r[h];
              const value =
                v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
              return `<td>${value}</td>`;
            })
            .join('')}</tr>`,
      )
      .join('');
    return `<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:x="urn:schemas-microsoft-com:office:excel"
xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"></head>
<body><table border="1"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table></body></html>`;
  }
}
