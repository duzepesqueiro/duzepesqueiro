import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

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

  toCsv(rows: Record<string, unknown>[]): string {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const escape = (v: unknown) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
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
          `<tr>${headers.map((h) => `<td>${r[h] ?? ''}</td>`).join('')}</tr>`,
      )
      .join('');
    return `<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:x="urn:schemas-microsoft-com:office:excel"
xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"></head>
<body><table border="1"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table></body></html>`;
  }
}
