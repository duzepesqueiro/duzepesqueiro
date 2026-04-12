import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChaleStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { CreateChaleDTO, UpdateChaleDTO } from '../dto';

export type Chale = Prisma.HostingChaletGetPayload<Record<string, never>>;

@Injectable()
export class ChaleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Chale[]> {
    return this.prisma.hostingChalet.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<Chale | null> {
    return this.prisma.hostingChalet.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  async findByCode(code: string): Promise<Chale | null> {
    return this.prisma.hostingChalet.findFirst({
      where: {
        code,
        deletedAt: null,
      },
    });
  }

  async findByStatus(status: ChaleStatus): Promise<Chale[]> {
    return this.prisma.hostingChalet.findMany({
      where: {
        status,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAvailable(
    capacidadeAdultos: number,
    capacidadeCriancas: number,
    checkin: Date,
    checkout: Date,
  ): Promise<Chale[]> {
    const totalHospedes = Math.max(0, capacidadeAdultos) + Math.max(0, capacidadeCriancas);

    return this.prisma.hostingChalet.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        maxGuests: { gte: totalHospedes },
        status: { in: [ChaleStatus.AVAILABLE, ChaleStatus.RESERVED] },
        reservations: {
          none: {
            deletedAt: null,
            status: { in: ['PENDING', 'CONFIRMED', 'OCCUPIED'] },
            checkInDate: { lt: checkout },
            checkOutDate: { gt: checkin },
          },
        },
        dateBlocks: {
          none: {
            isActive: true,
            startDate: { lte: checkout },
            endDate: { gte: checkin },
          },
        },
      },
      orderBy: { basePrice: 'asc' },
    });
  }

  async create(data: CreateChaleDTO): Promise<Chale> {
    if (!data.code) {
      throw new BadRequestException('Código do chalé é obrigatório.');
    }
    return this.prisma.hostingChalet.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        amenities: data.amenities ?? [],
        rooms: data.rooms ?? [],
        notes: data.notes,
        unitType: data.unitType,
        status: data.status ?? ChaleStatus.AVAILABLE,
        basePrice: new Prisma.Decimal(data.basePrice),
        maxGuests: data.maxGuests,
        isActive: data.isActive ?? true,
      },
    });
  }

  async update(id: string, data: UpdateChaleDTO): Promise<Chale> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException('Chalé não encontrado.');
    }

    return this.prisma.hostingChalet.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        amenities: data.amenities,
        rooms: data.rooms,
        notes: data.notes,
        unitType: data.unitType,
        status: data.status,
        basePrice: data.basePrice !== undefined ? new Prisma.Decimal(data.basePrice) : undefined,
        maxGuests: data.maxGuests,
        isActive: data.isActive,
      },
    });
  }

  async softDelete(id: string): Promise<void> {
    const result = await this.prisma.hostingChalet.updateMany({
      where: {
        id,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Chalé não encontrado.');
    }
  }

  async updateStatus(id: string, status: ChaleStatus): Promise<void> {
    const result = await this.prisma.hostingChalet.updateMany({
      where: {
        id,
        deletedAt: null,
      },
      data: {
        status,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Chalé não encontrado.');
    }
  }
}
