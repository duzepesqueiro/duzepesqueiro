import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AvaliacaoDTO,
  AvaliacaoDetailDTO,
  AvaliacaoListDTO,
  AvaliacaoStatsDTO,
  CreateAvaliacaoDTO,
  UpdateAvaliacaoDTO,
} from '../../dto';
import { AvaliacaoReservaRepository, ReservaRepository } from '../../repositories';

@Injectable()
export class AvaliacaoService {
  constructor(
    private readonly avaliacaoRepository: AvaliacaoReservaRepository,
    private readonly reservaRepository: ReservaRepository,
  ) {}

  async criarAvaliacao(data: CreateAvaliacaoDTO, userId: string): Promise<AvaliacaoDTO> {
    const reserva = await this.reservaRepository.findById(data.reservationId);
    if (!reserva) {
      throw new NotFoundException('Reserva não encontrada.');
    }
    if (reserva.userId !== userId) {
      throw new BadRequestException('Usuário não pode avaliar uma reserva que não é sua.');
    }
    if (reserva.chaletId !== data.chaletId) {
      throw new BadRequestException('Reserva não pertence ao chalé informado.');
    }
    if (reserva.status !== 'COMPLETED') {
      throw new BadRequestException('Avaliação só é permitida após checkout concluído.');
    }

    const existing = await this.avaliacaoRepository.findByReservaId(data.reservationId);
    if (existing) {
      throw new BadRequestException('Já existe uma avaliação para esta reserva.');
    }

    const created = await this.avaliacaoRepository.create({
      ...data,
      userId,
    });
    return this.toAvaliacaoDTO(created);
  }

  async atualizarAvaliacao(id: string, data: UpdateAvaliacaoDTO): Promise<AvaliacaoDTO> {
    const updated = await this.avaliacaoRepository.update(id, data);
    return this.toAvaliacaoDTO(updated);
  }

  async removerAvaliacao(id: string): Promise<void> {
    await this.avaliacaoRepository.delete(id);
  }

  async listarAvaliacoesDoChale(chaleId: string, page = 1, limit = 20): Promise<AvaliacaoListDTO[]> {
    const normalizedPage = Math.max(1, page);
    const normalizedLimit = Math.max(1, limit);
    const items = await this.avaliacaoRepository.findByChaleId(chaleId);
    const start = (normalizedPage - 1) * normalizedLimit;
    const end = start + normalizedLimit;
    return items.slice(start, end).map((item) => this.toAvaliacaoDTO(item));
  }

  async obterAvaliacao(id: string): Promise<AvaliacaoDetailDTO> {
    const avaliacao = await this.avaliacaoRepository.findById(id);
    if (!avaliacao) {
      throw new NotFoundException('Avaliação não encontrada.');
    }
    return this.toAvaliacaoDTO(avaliacao);
  }

  async obterAvaliacaoDaReserva(reservaId: string): Promise<AvaliacaoDetailDTO> {
    const avaliacao = await this.avaliacaoRepository.findByReservaId(reservaId);
    if (!avaliacao) {
      throw new NotFoundException('Avaliação não encontrada para a reserva informada.');
    }
    return this.toAvaliacaoDTO(avaliacao);
  }

  async obterMediaAvaliacoes(chaleId: string): Promise<number> {
    const stats = await this.obterEstatisticasAvaliacoes(chaleId);
    return stats.average;
  }

  async obterEstatisticasAvaliacoes(chaleId: string): Promise<AvaliacaoStatsDTO> {
    const raw = await this.avaliacaoRepository.getChaleRatingsStats(chaleId);
    const weightedAverage = this.calculateWeightedAverage(raw.ratings, raw.total);
    return {
      average: weightedAverage,
      total: raw.total,
      ratings: raw.ratings,
    };
  }

  private calculateWeightedAverage(
    ratings: Record<1 | 2 | 3 | 4 | 5, number>,
    total: number,
  ): number {
    if (total <= 0) {
      return 0;
    }
    const sum =
      ratings[1] * 1 +
      ratings[2] * 2 +
      ratings[3] * 3 +
      ratings[4] * 4 +
      ratings[5] * 5;
    return Number((sum / total).toFixed(2));
  }

  private toAvaliacaoDTO(data: {
    id: string;
    reservationId: string;
    chaletId: string;
    userId: string | null;
    rating: number;
    comment: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): AvaliacaoDTO {
    return {
      id: data.id,
      reservationId: data.reservationId,
      chaletId: data.chaletId,
      userId: data.userId,
      rating: data.rating,
      comment: data.comment,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
