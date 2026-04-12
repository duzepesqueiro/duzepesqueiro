import {
  BadRequestException,
  Injectable,
  NestMiddleware,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import { BloqueioChaleRepository, ReservaRepository } from '../repositories';

@Injectable()
export class ReservationDateValidationMiddleware implements NestMiddleware {
  constructor(
    private readonly reservaRepository: ReservaRepository,
    private readonly bloqueioRepository: BloqueioChaleRepository,
    private readonly configService: ConfigService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const payload = await this.extractPayload(req);
    if (!payload) {
      next();
      return;
    }

    const checkin = this.toDate(payload.checkInDate, 'checkin');
    const checkout = this.toDate(payload.checkOutDate, 'checkout');

    this.validateDateRange(checkin, checkout);
    this.validateNights(checkin, checkout);

    await this.validateOverlaps(
      payload.chaletId,
      checkin,
      checkout,
      req.method === 'PUT' ? this.getParamAsString(req.params.id) : undefined,
    );

    next();
  }

  private async extractPayload(
    req: Request,
  ): Promise<{ chaletId: string; checkInDate: string; checkOutDate: string } | null> {
    const body = (req.body ?? {}) as Record<string, unknown>;

    if (req.method === 'POST') {
      const chaletId = body.chaletId;
      const checkInDate = body.checkInDate;
      const checkOutDate = body.checkOutDate;
      if (!chaletId || !checkInDate || !checkOutDate) {
        throw new BadRequestException('chaletId, checkInDate e checkOutDate são obrigatórios.');
      }
      return {
        chaletId: String(chaletId),
        checkInDate: String(checkInDate),
        checkOutDate: String(checkOutDate),
      };
    }

    if (req.method === 'PUT') {
      const reservationId = this.getParamAsString(req.params.id);
      if (!reservationId) {
        return null;
      }

      const existing = await this.reservaRepository.findById(reservationId);
      if (!existing) {
        throw new NotFoundException('Reserva não encontrada.');
      }

      const chaletId = (body.chaletId as string | undefined) ?? existing.chaletId;
      const checkInDate =
        (body.checkInDate as string | undefined) ?? existing.checkInDate.toISOString();
      const checkOutDate =
        (body.checkOutDate as string | undefined) ?? existing.checkOutDate.toISOString();

      return {
        chaletId,
        checkInDate,
        checkOutDate,
      };
    }

    return null;
  }

  private validateDateRange(checkin: Date, checkout: Date): void {
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);

    const startCheckin = new Date(checkin);
    startCheckin.setHours(0, 0, 0, 0);

    if (startCheckin < startToday) {
      throw new BadRequestException('checkin deve ser hoje ou uma data futura.');
    }

    if (checkout <= checkin) {
      throw new BadRequestException('checkout deve ser posterior ao checkin.');
    }
  }

  private validateNights(checkin: Date, checkout: Date): void {
    const minNights = Number(this.configService.get<number>('hosting.minReservationNights') ?? 1);
    const maxNights = Number(this.configService.get<number>('hosting.maxReservationNights') ?? 30);
    const nights = Math.ceil((checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60 * 24));

    if (nights < minNights) {
      throw new BadRequestException(`Mínimo de diárias permitido: ${minNights}.`);
    }
    if (nights > maxNights) {
      throw new BadRequestException(`Máximo de diárias permitido: ${maxNights}.`);
    }
  }

  private async validateOverlaps(
    chaletId: string,
    checkin: Date,
    checkout: Date,
    excludeReservationId?: string,
  ): Promise<void> {
    const [overlappingBlocks, overlappingReservations] = await Promise.all([
      this.bloqueioRepository.findOverlappingBlocks(chaletId, checkin, checkout),
      this.reservaRepository.findOverlappingReservations(
        chaletId,
        checkin,
        checkout,
        excludeReservationId,
      ),
    ]);

    if (overlappingBlocks.length > 0) {
      throw new BadRequestException('Não é possível reservar: existem datas bloqueadas no período.');
    }

    if (overlappingReservations.length > 0) {
      throw new BadRequestException('Não é possível reservar: existem reservas ativas no período.');
    }
  }

  private toDate(value: string, field: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${field} inválido.`);
    }
    return parsed;
  }

  private getParamAsString(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }
}
