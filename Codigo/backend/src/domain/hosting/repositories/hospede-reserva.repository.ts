import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { CreateHospedeDTO, UpdateHospedeDTO } from '../dto';

export type HospedeReserva = Prisma.HostingReservationGuestGetPayload<Record<string, never>>;

@Injectable()
export class HospedeReservaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByReservaId(reservaId: string): Promise<HospedeReserva[]> {
    return this.prisma.hostingReservationGuest.findMany({
      where: { reservationId: reservaId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async findById(id: string): Promise<HospedeReserva | null> {
    return this.prisma.hostingReservationGuest.findUnique({
      where: { id },
    });
  }

  async create(data: CreateHospedeDTO): Promise<HospedeReserva> {
    const reservationId = data.reservationId;
    if (!reservationId) {
      throw new BadRequestException('reservationId is required.');
    }

    await this.ensureReservationExists(reservationId);

    return this.prisma.hostingReservationGuest.create({
      data: {
        reservationId,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        cpf: data.cpf,
        rg: data.rg,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        isPrimary: data.isPrimary ?? false,
      },
    });
  }

  async createMany(reservaId: string, hospedes: CreateHospedeDTO[]): Promise<HospedeReserva[]> {
    if (!hospedes || hospedes.length === 0) {
      return [];
    }

    await this.ensureReservationExists(reservaId);

    return this.prisma.$transaction(async (tx) => {
      const created: HospedeReserva[] = [];
      for (const hospede of hospedes) {
        const item = await tx.hostingReservationGuest.create({
          data: {
            reservationId: reservaId,
            fullName: hospede.fullName,
            email: hospede.email,
            phone: hospede.phone,
            cpf: hospede.cpf,
            rg: hospede.rg,
            birthDate: hospede.birthDate ? new Date(hospede.birthDate) : undefined,
            isPrimary: hospede.isPrimary ?? false,
          },
        });
        created.push(item);
      }

      return created;
    });
  }

  async update(id: string, data: UpdateHospedeDTO): Promise<HospedeReserva> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException('Hóspede da reserva não encontrado.');
    }

    return this.prisma.hostingReservationGuest.update({
      where: { id },
      data: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        cpf: data.cpf,
        rg: data.rg,
        birthDate: data.birthDate === null ? null : data.birthDate ? new Date(data.birthDate) : undefined,
        isPrimary: data.isPrimary,
      },
    });
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.prisma.hostingReservationGuest.deleteMany({
      where: { id },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Hóspede da reserva não encontrado.');
    }
  }

  async deleteByReservaId(reservaId: string): Promise<void> {
    await this.prisma.hostingReservationGuest.deleteMany({
      where: { reservationId: reservaId },
    });
  }

  private async ensureReservationExists(reservationId: string): Promise<void> {
    const reserva = await this.prisma.hostingReservation.findFirst({
      where: {
        id: reservationId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!reserva) {
      throw new NotFoundException('Reserva não encontrada.');
    }
  }
}
