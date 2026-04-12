import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { CreateBloqueioDTO, UpdateBloqueioDTO } from '../dto';

export type BloqueioChale = Prisma.HostingChaletBlockGetPayload<Record<string, never>>;

@Injectable()
export class BloqueioChaleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<BloqueioChale[]> {
    return this.prisma.hostingChaletBlock.findMany({
      where: {
        chalet: {
          deletedAt: null,
        },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async findByChaleId(chaleId: string): Promise<BloqueioChale[]> {
    return this.prisma.hostingChaletBlock.findMany({
      where: {
        chaletId: chaleId,
        chalet: {
          deletedAt: null,
        },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async findById(id: string): Promise<BloqueioChale | null> {
    return this.prisma.hostingChaletBlock.findUnique({
      where: { id },
    });
  }

  async findOverlappingBlocks(chaleId: string, dataInicio: Date, dataFim: Date): Promise<BloqueioChale[]> {
    return this.prisma.hostingChaletBlock.findMany({
      where: {
        chaletId: chaleId,
        isActive: true,
        startDate: { lte: dataFim },
        endDate: { gte: dataInicio },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async create(data: CreateBloqueioDTO): Promise<BloqueioChale> {
    const dataInicio = new Date(data.dataInicio);
    const dataFim = new Date(data.dataFim);
    this.validateDateRange(dataInicio, dataFim);

    return this.prisma.$transaction(async (tx) => {
      await this.ensureChaleExists(tx, data.chaletId);
      await this.ensureNoOverlappingBlock(tx, data.chaletId, dataInicio, dataFim);

      return tx.hostingChaletBlock.create({
        data: {
          chaletId: data.chaletId,
          startDate: dataInicio,
          endDate: dataFim,
          reason: data.reason,
          notes: data.notes,
          isActive: data.isActive ?? true,
          createdById: data.createdById,
        },
      });
    });
  }

  async update(id: string, data: UpdateBloqueioDTO): Promise<BloqueioChale> {
    const existing = await this.prisma.hostingChaletBlock.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Bloqueio de chalé não encontrado.');
    }

    const nextChaleId = data.chaletId ?? existing.chaletId;
    const nextDataInicio = data.dataInicio ? new Date(data.dataInicio) : existing.startDate;
    const nextDataFim = data.dataFim ? new Date(data.dataFim) : existing.endDate;
    this.validateDateRange(nextDataInicio, nextDataFim);

    return this.prisma.$transaction(async (tx) => {
      await this.ensureChaleExists(tx, nextChaleId);
      await this.ensureNoOverlappingBlock(tx, nextChaleId, nextDataInicio, nextDataFim, id);

      return tx.hostingChaletBlock.update({
        where: { id },
        data: {
          chaletId: data.chaletId,
          startDate: data.dataInicio ? new Date(data.dataInicio) : undefined,
          endDate: data.dataFim ? new Date(data.dataFim) : undefined,
          reason: data.reason,
          notes: data.notes,
          isActive: data.isActive,
          createdById: data.createdById,
        },
      });
    });
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.prisma.hostingChaletBlock.deleteMany({
      where: { id },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Bloqueio de chalé não encontrado.');
    }
  }

  async checkAvailability(chaleId: string, dataInicio: Date, dataFim: Date): Promise<boolean> {
    this.validateDateRange(dataInicio, dataFim);

    const [overlappingBlocks, overlappingReservations] = await Promise.all([
      this.prisma.hostingChaletBlock.count({
        where: {
          chaletId: chaleId,
          isActive: true,
          startDate: { lte: dataFim },
          endDate: { gte: dataInicio },
        },
      }),
      this.prisma.hostingReservation.count({
        where: {
          chaletId: chaleId,
          deletedAt: null,
          status: {
            in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.OCCUPIED],
          },
          checkInDate: { lt: dataFim },
          checkOutDate: { gt: dataInicio },
        },
      }),
    ]);

    return overlappingBlocks === 0 && overlappingReservations === 0;
  }

  private validateDateRange(dataInicio: Date, dataFim: Date): void {
    if (!(dataInicio instanceof Date) || Number.isNaN(dataInicio.getTime())) {
      throw new BadRequestException('Data de início inválida.');
    }
    if (!(dataFim instanceof Date) || Number.isNaN(dataFim.getTime())) {
      throw new BadRequestException('Data de fim inválida.');
    }
    if (dataFim < dataInicio) {
      throw new BadRequestException('Data fim deve ser maior ou igual à data de início.');
    }
  }

  private async ensureChaleExists(tx: Prisma.TransactionClient, chaleId: string): Promise<void> {
    const chale = await tx.hostingChalet.findFirst({
      where: {
        id: chaleId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!chale) {
      throw new NotFoundException('Chalé não encontrado.');
    }
  }

  private async ensureNoOverlappingBlock(
    tx: Prisma.TransactionClient,
    chaleId: string,
    dataInicio: Date,
    dataFim: Date,
    excludeId?: string,
  ): Promise<void> {
    const overlapping = await tx.hostingChaletBlock.count({
      where: {
        chaletId: chaleId,
        isActive: true,
        id: excludeId ? { not: excludeId } : undefined,
        startDate: { lte: dataFim },
        endDate: { gte: dataInicio },
      },
    });

    if (overlapping > 0) {
      throw new BadRequestException('Já existe bloqueio ativo no período informado para o chalé.');
    }
  }
}
