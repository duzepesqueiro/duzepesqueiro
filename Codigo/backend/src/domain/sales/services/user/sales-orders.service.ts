import { Injectable } from '@nestjs/common';
import { CreateSalesOrderDto, ListSalesOrdersDto } from '../../dto/user';
import { SalesOrderRepository } from '../../repositories';

@Injectable()
export class SalesOrdersService {
  constructor(private readonly salesOrderRepository: SalesOrderRepository) {}

  async create(userId: string, dto: CreateSalesOrderDto) {
    const order = await this.salesOrderRepository.createForUser(userId, dto);
    return this.toResponse(order);
  }

  async list(userId: string, filters: ListSalesOrdersDto) {
    const result = await this.salesOrderRepository.listByUser(userId, filters);
    return {
      items: result.items.map((o) => this.toResponse(o)),
      total: result.total,
      page: result.page,
      itemsPerPage: result.itemsPerPage,
      totalPages: result.totalPages,
    };
  }

  async getById(userId: string, id: string) {
    const order = await this.salesOrderRepository.findByIdForUser(userId, id);
    return this.toResponse(order);
  }

  async cancel(userId: string, id: string) {
    const order = await this.salesOrderRepository.cancelForUser(userId, id);
    return this.toResponse(order);
  }

  private toResponse(order: any) {
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalAmount: Number(order.totalAmount ?? 0),
      note: order.note ?? undefined,
      paymentId: order.paymentId ?? undefined,
      paidAt: order.paidAt ?? undefined,
      cancelledAt: order.cancelledAt ?? undefined,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: (order.items ?? []).map((it: any) => ({
        id: it.id,
        productId: it.productId,
        nameSnapshot: it.nameSnapshot,
        imageSnapshot: it.imageSnapshot ?? undefined,
        quantity: Number(it.quantity ?? 0),
        unitPrice: Number(it.unitPrice ?? 0),
        subtotal: Number(it.subtotal ?? 0),
      })),
    };
  }
}
