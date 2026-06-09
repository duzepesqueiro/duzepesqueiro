import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  BloqueioDTO,
  BloqueioGlobalRangeDTO,
  BloqueioListDTO,
  CreateBloqueioDTO,
  ListBloqueiosFiltersDTO,
  UpdateBloqueioDTO,
} from '../../dto';
import { BloqueioChaleRepository, ChaleRepository, ReservaRepository } from '../../repositories';
import { HospedagemMetricsService } from './hospedagem-metrics.service';

@Injectable()
export class BloqueioService {
  constructor(
    private readonly bloqueioRepository: BloqueioChaleRepository,
    private readonly chaleRepository: ChaleRepository,
    private readonly reservaRepository: ReservaRepository,
    private readonly metricsService: HospedagemMetricsService,
  ) {}

  async criarBloqueio(data: CreateBloqueioDTO, operadorId: string): Promise<BloqueioDTO> {
    const dataInicio = new Date(data.dataInicio);
    const dataFim = new Date(data.dataFim);
    await this.ensureNoReservationConflict(data.chaletId, dataInicio, dataFim);

    const created = await this.bloqueioRepository.create({
      ...data,
      createdById: operadorId,
    });
    await this.metricsService.limparCacheMetricas();
    return this.toBloqueioDTO(created);
  }

  async listarBloqueios(filters?: ListBloqueiosFiltersDTO): Promise<BloqueioListDTO[]> {
    const items = await this.bloqueioRepository.findAll();
    const filtered = items.filter((item) => {
      if (filters?.chaleId && item.chaletId !== filters.chaleId) {
        return false;
      }
      if (filters?.isActive !== undefined && item.isActive !== filters.isActive) {
        return false;
      }
      if (filters?.reason && item.reason !== filters.reason) {
        return false;
      }
      if (filters?.dataInicioFrom && item.startDate < new Date(filters.dataInicioFrom)) {
        return false;
      }
      if (filters?.dataFimTo && item.endDate > new Date(filters.dataFimTo)) {
        return false;
      }
      return true;
    });

    return filtered.map((item) => this.toBloqueioDTO(item));
  }

  async listarBloqueiosGlobais(filters?: ListBloqueiosFiltersDTO): Promise<BloqueioGlobalRangeDTO[]> {
    const chalets = await this.chaleRepository.findAll();
    const activeChalets = chalets.filter((chalet) => chalet.isActive);
    if (activeChalets.length === 0) {
      return [];
    }

    const activeChaletIds = new Set(activeChalets.map((chalet) => chalet.id));
    const blocks = await this.bloqueioRepository.findAll();
    const filtered = blocks.filter((block) => {
      if (!activeChaletIds.has(block.chaletId)) {
        return false;
      }
      if (filters?.isActive !== undefined && block.isActive !== filters.isActive) {
        return false;
      }
      if (filters?.reason && block.reason !== filters.reason) {
        return false;
      }
      if (filters?.dataInicioFrom && block.startDate < new Date(filters.dataInicioFrom)) {
        return false;
      }
      if (filters?.dataFimTo && block.endDate > new Date(filters.dataFimTo)) {
        return false;
      }
      return true;
    });

    const blocksByChalet = new Map<string, Array<{ start: Date; end: Date }>>();
    for (const chalet of activeChalets) {
      blocksByChalet.set(chalet.id, []);
    }

    for (const block of filtered) {
      const bucket = blocksByChalet.get(block.chaletId);
      if (!bucket) continue;
      bucket.push({
        start: this.toUtcDay(block.startDate),
        end: this.toUtcDay(block.endDate),
      });
    }

    for (const chalet of activeChalets) {
      const bucket = blocksByChalet.get(chalet.id) ?? [];
      if (bucket.length === 0) {
        return [];
      }
      blocksByChalet.set(chalet.id, this.mergeRanges(bucket));
    }

    const [firstId, ...restIds] = activeChalets.map((chalet) => chalet.id);
    let intersection = blocksByChalet.get(firstId) ?? [];

    for (const id of restIds) {
      const next = blocksByChalet.get(id) ?? [];
      intersection = this.intersectRanges(intersection, next);
      if (intersection.length === 0) {
        break;
      }
    }

    const merged = this.mergeRanges(intersection);
    return merged.map((range) => ({
      startDate: range.start.toISOString().slice(0, 10),
      endDate: range.end.toISOString().slice(0, 10),
    }));
  }

  async listarBloqueiosDoChale(chaleId: string): Promise<BloqueioListDTO[]> {
    const items = await this.bloqueioRepository.findByChaleId(chaleId);
    return items.map((item) => this.toBloqueioDTO(item));
  }

  async obterBloqueio(id: string): Promise<BloqueioDTO> {
    const item = await this.bloqueioRepository.findById(id);
    if (!item) {
      throw new NotFoundException('Bloqueio não encontrado.');
    }
    return this.toBloqueioDTO(item);
  }

  async atualizarBloqueio(id: string, data: UpdateBloqueioDTO): Promise<BloqueioDTO> {
    if (data.chaletId || data.dataInicio || data.dataFim) {
      const existing = await this.resolveExistingBlockForUpdate(id);
      const chaleId = data.chaletId ?? existing.chaletId;
      const dataInicio = data.dataInicio ? new Date(data.dataInicio) : existing.startDate;
      const dataFim = data.dataFim ? new Date(data.dataFim) : existing.endDate;
      await this.ensureNoReservationConflict(chaleId, dataInicio, dataFim);
    }

    const updated = await this.bloqueioRepository.update(id, data);
    await this.metricsService.limparCacheMetricas();
    return this.toBloqueioDTO(updated);
  }

  async removerBloqueio(id: string): Promise<void> {
    await this.bloqueioRepository.delete(id);
    await this.metricsService.limparCacheMetricas();
  }

  async verificarDisponibilidade(chaleId: string, dataInicio: Date, dataFim: Date): Promise<boolean> {
    return this.bloqueioRepository.checkAvailability(chaleId, dataInicio, dataFim);
  }

  private async ensureNoReservationConflict(chaleId: string, dataInicio: Date, dataFim: Date): Promise<void> {
    const conflictingReservations = await this.reservaRepository.findOverlappingReservations(
      chaleId,
      dataInicio,
      dataFim,
    );
    if (conflictingReservations.length > 0) {
      throw new BadRequestException('Existem reservas ativas conflitantes no período informado.');
    }
  }

  private async resolveExistingBlockForUpdate(id: string) {
    const existing = await this.bloqueioRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Bloqueio não encontrado.');
    }
    return existing;
  }

  private toBloqueioDTO(data: {
    id: string;
    chaletId: string;
    startDate: Date;
    endDate: Date;
    reason: any;
    notes: string | null;
    isActive: boolean;
    createdById: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): BloqueioDTO {
    return {
      id: data.id,
      chaletId: data.chaletId,
      startDate: data.startDate,
      endDate: data.endDate,
      reason: data.reason,
      notes: data.notes,
      isActive: data.isActive,
      createdById: data.createdById,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  private toUtcDay(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  private addUtcDays(date: Date, days: number): Date {
    const copy = new Date(date.getTime());
    copy.setUTCDate(copy.getUTCDate() + days);
    return copy;
  }

  private mergeRanges(ranges: Array<{ start: Date; end: Date }>): Array<{ start: Date; end: Date }> {
    const sorted = [...ranges].sort((a, b) => a.start.getTime() - b.start.getTime());
    const merged: Array<{ start: Date; end: Date }> = [];

    for (const range of sorted) {
      const last = merged.at(-1);
      if (!last) {
        merged.push({ start: range.start, end: range.end });
        continue;
      }

      const lastEndPlusOne = this.addUtcDays(last.end, 1);
      if (range.start.getTime() <= lastEndPlusOne.getTime()) {
        if (range.end.getTime() > last.end.getTime()) {
          last.end = range.end;
        }
        continue;
      }

      merged.push({ start: range.start, end: range.end });
    }

    return merged;
  }

  private intersectRanges(
    left: Array<{ start: Date; end: Date }>,
    right: Array<{ start: Date; end: Date }>,
  ): Array<{ start: Date; end: Date }> {
    if (left.length === 0 || right.length === 0) {
      return [];
    }

    const result: Array<{ start: Date; end: Date }> = [];
    let i = 0;
    let j = 0;

    while (i < left.length && j < right.length) {
      const a = left[i];
      const b = right[j];
      const start = a.start.getTime() >= b.start.getTime() ? a.start : b.start;
      const end = a.end.getTime() <= b.end.getTime() ? a.end : b.end;

      if (start.getTime() <= end.getTime()) {
        result.push({ start, end });
      }

      if (a.end.getTime() < b.end.getTime()) {
        i += 1;
      } else {
        j += 1;
      }
    }

    return result;
  }
}
