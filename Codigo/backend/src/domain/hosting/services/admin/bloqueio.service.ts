import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  BloqueioDTO,
  BloqueioListDTO,
  CreateBloqueioDTO,
  ListBloqueiosFiltersDTO,
  UpdateBloqueioDTO,
} from '../../dto';
import { BloqueioChaleRepository, ReservaRepository } from '../../repositories';

@Injectable()
export class BloqueioService {
  constructor(
    private readonly bloqueioRepository: BloqueioChaleRepository,
    private readonly reservaRepository: ReservaRepository,
  ) {}

  async criarBloqueio(data: CreateBloqueioDTO, operadorId: string): Promise<BloqueioDTO> {
    const dataInicio = new Date(data.dataInicio);
    const dataFim = new Date(data.dataFim);
    await this.ensureNoReservationConflict(data.chaletId, dataInicio, dataFim);

    const created = await this.bloqueioRepository.create({
      ...data,
      createdById: operadorId,
    });
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
    return this.toBloqueioDTO(updated);
  }

  async removerBloqueio(id: string): Promise<void> {
    await this.bloqueioRepository.delete(id);
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
}
