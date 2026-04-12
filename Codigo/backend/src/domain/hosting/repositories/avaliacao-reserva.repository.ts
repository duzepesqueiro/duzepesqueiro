import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { CreateAvaliacaoDTO, UpdateAvaliacaoDTO } from '../dto';
import { RatingStats } from '../interfaces';

export type AvaliacaoReserva = Prisma.HostingReservationReviewGetPayload<Record<string, never>>;

@Injectable()
export class AvaliacaoReservaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByChaleId(chaleId: string): Promise<AvaliacaoReserva[]> {
    return this.prisma.hostingReservationReview.findMany({
      where: { chaletId: chaleId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByReservaId(reservaId: string): Promise<AvaliacaoReserva | null> {
    return this.prisma.hostingReservationReview.findUnique({
      where: { reservationId: reservaId },
    });
  }

  async findById(id: string): Promise<AvaliacaoReserva | null> {
    return this.prisma.hostingReservationReview.findUnique({
      where: { id },
    });
  }

  async findByUserId(userId: string): Promise<AvaliacaoReserva[]> {
    return this.prisma.hostingReservationReview.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAverageRating(chaleId: string): Promise<number> {
    const result = await this.prisma.hostingReservationReview.aggregate({
      where: { chaletId: chaleId },
      _avg: { rating: true },
    });

    return Number(result._avg.rating ?? 0);
  }

  async getChaleRatingsStats(chaleId: string): Promise<RatingStats> {
    const [avgData, grouped] = await Promise.all([
      this.prisma.hostingReservationReview.aggregate({
        where: { chaletId: chaleId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      this.prisma.hostingReservationReview.groupBy({
        by: ['rating'],
        where: { chaletId: chaleId },
        _count: { _all: true },
      }),
    ]);

    const ratings: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    for (const item of grouped) {
      if (item.rating >= 1 && item.rating <= 5) {
        ratings[item.rating as 1 | 2 | 3 | 4 | 5] = item._count._all;
      }
    }

    return {
      average: Number(avgData._avg.rating ?? 0),
      total: avgData._count._all,
      ratings,
    };
  }

  async create(data: CreateAvaliacaoDTO): Promise<AvaliacaoReserva> {
    this.validateRating(data.rating);

    return this.prisma.$transaction(async (tx) => {
      const reserva = await tx.hostingReservation.findFirst({
        where: {
          id: data.reservationId,
          deletedAt: null,
        },
        select: {
          id: true,
          chaletId: true,
          userId: true,
          status: true,
        },
      });

      if (!reserva) {
        throw new NotFoundException('Reserva não encontrada.');
      }

      if (reserva.status !== 'COMPLETED') {
        throw new BadRequestException('Review can only be created for completed reservations.');
      }

      if (reserva.chaletId !== data.chaletId) {
        throw new BadRequestException('Reservation does not belong to informed chalet.');
      }

      if (data.userId && reserva.userId && data.userId !== reserva.userId) {
        throw new BadRequestException('User does not match reservation owner.');
      }

      return tx.hostingReservationReview.create({
        data: {
          reservationId: data.reservationId,
          chaletId: data.chaletId,
          userId: data.userId ?? reserva.userId ?? null,
          rating: data.rating,
          comment: data.comment,
        },
      });
    });
  }

  async update(id: string, data: UpdateAvaliacaoDTO): Promise<AvaliacaoReserva> {
    const existing = await this.prisma.hostingReservationReview.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Avaliação não encontrada.');
    }

    if (data.rating !== undefined) {
      this.validateRating(data.rating);
    }

    return this.prisma.hostingReservationReview.update({
      where: { id },
      data: {
        rating: data.rating,
        comment: data.comment,
      },
    });
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.prisma.hostingReservationReview.deleteMany({
      where: { id },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Avaliação não encontrada.');
    }
  }

  private validateRating(rating: number): void {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be an integer between 1 and 5.');
    }
  }
}
