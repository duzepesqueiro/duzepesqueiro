import {
  BadRequestException,
  Injectable,
  NestMiddleware,
  NotFoundException,
} from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { ChaleRepository, ReservaRepository } from '../repositories';

@Injectable()
export class CapacityValidationMiddleware implements NestMiddleware {
  constructor(
    private readonly chaleRepository: ChaleRepository,
    private readonly reservaRepository: ReservaRepository,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const payload = await this.extractPayload(req);
    if (!payload) {
      next();
      return;
    }

    const adults = payload.adults ?? 1;
    const children = payload.children ?? 0;
    const totalGuests = adults + children;

    if (adults < 0 || children < 0) {
      throw new BadRequestException('Quantidade de adultos/crianças deve ser maior ou igual a zero.');
    }

    const chale = await this.chaleRepository.findById(payload.chaletId);
    if (!chale) {
      throw new NotFoundException('Chalé não encontrado.');
    }

    if (adults > chale.maxGuests) {
      throw new BadRequestException(
        `Número de adultos excede a capacidade do chalé (${chale.maxGuests}).`,
      );
    }

    if (totalGuests > chale.maxGuests) {
      throw new BadRequestException(
        `Total de hóspedes excede a capacidade máxima do chalé (${chale.maxGuests}).`,
      );
    }

    next();
  }

  private async extractPayload(
    req: Request,
  ): Promise<{ chaletId: string; adults: number; children: number } | null> {
    const body = (req.body ?? {}) as Record<string, unknown>;

    if (req.method === 'POST') {
      const chaletId = body.chaletId;
      if (!chaletId) {
        throw new BadRequestException('chaletId é obrigatório.');
      }
      return {
        chaletId: String(chaletId),
        adults: this.toOptionalNumber(body.adults) ?? 1,
        children: this.toOptionalNumber(body.children) ?? 0,
      };
    }

    if (req.method === 'PUT') {
      const reservationId = this.getParamAsString(req.params.id);
      if (!reservationId) {
        return null;
      }

      const reserva = await this.reservaRepository.findById(reservationId);
      if (!reserva) {
        throw new NotFoundException('Reserva não encontrada.');
      }

      return {
        chaletId: (body.chaletId as string | undefined) ?? reserva.chaletId,
        adults: this.toOptionalNumber(body.adults) ?? reserva.adults,
        children: this.toOptionalNumber(body.children) ?? reserva.children,
      };
    }

    return null;
  }

  private toOptionalNumber(value: unknown): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      throw new BadRequestException('Valor numérico inválido para hóspedes.');
    }
    return numeric;
  }

  private getParamAsString(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }
}
