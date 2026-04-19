import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChaleStatus, ChaleType, PriceRuleType, Prisma, ReservationStatus } from '@prisma/client';
import {
  ChaleCalendarioDTO,
  ChaleDTO,
  ChaleDetailDTO,
  ChaleImagemDTO,
  ChaleListDTO,
  CreateChaleDTO,
  ListChalesFiltersDTO,
  UpdateChaleDTO,
} from '../../dto';
import { ChaleRepository, ReservaRepository } from '../../repositories';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { HostingImageStorageService } from './hosting-image-storage.service';

@Injectable()
export class ChaleService {
  constructor(
    private readonly chaleRepository: ChaleRepository,
    private readonly reservaRepository: ReservaRepository,
    private readonly prisma: PrismaService,
    private readonly hostingImageStorageService: HostingImageStorageService,
  ) {}

  async listarChales(filters?: ListChalesFiltersDTO): Promise<ChaleListDTO[]> {
    const base =
      filters?.status !== undefined
        ? await this.chaleRepository.findByStatus(filters.status)
        : await this.chaleRepository.findAll();

    const filtered = base.filter((chale) => {
      if (filters?.unitType && chale.unitType !== filters.unitType) {
        return false;
      }
      if (filters?.isActive !== undefined && chale.isActive !== filters.isActive) {
        return false;
      }
      if (filters?.minGuests !== undefined && chale.maxGuests < filters.minGuests) {
        return false;
      }
      if (filters?.search) {
        const value = filters.search.toLowerCase();
        const haystack = `${chale.code} ${chale.name} ${chale.description ?? ''} ${chale.notes ?? ''} ${(chale.amenities ?? []).join(' ')} ${(chale.rooms ?? []).join(' ')}`.toLowerCase();
        if (!haystack.includes(value)) {
          return false;
        }
      }
      return true;
    });

    const ids = filtered.map((item) => item.id);
    const currentPriceByChaleId = await this.resolveCurrentPriceMap(ids);
    const images = ids.length
      ? await this.prisma.hostingChaletImage.findMany({
          where: { chaletId: { in: ids } },
          select: { chaletId: true },
        })
      : [];

    const imagesCountByChaleId = new Map<string, number>();
    for (const image of images) {
      imagesCountByChaleId.set(image.chaletId, (imagesCountByChaleId.get(image.chaletId) ?? 0) + 1);
    }

    return filtered.map((item) => ({
      ...this.toChaleDTO(item),
      currentPrice: currentPriceByChaleId.get(item.id) ?? Number(item.basePrice),
      imagesCount: imagesCountByChaleId.get(item.id) ?? 0,
    }));
  }

  async obterChale(id: string): Promise<ChaleDetailDTO> {
    const chale = await this.chaleRepository.findById(id);
    if (!chale) {
      throw new NotFoundException('Chalé não encontrado.');
    }

    const images = await this.prisma.hostingChaletImage.findMany({
      where: { chaletId: chale.id },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
    const currentPriceByChaleId = await this.resolveCurrentPriceMap([chale.id]);

    return {
      ...this.toChaleDTO(chale),
      currentPrice: currentPriceByChaleId.get(chale.id) ?? Number(chale.basePrice),
      images: images.map((image) => this.toChaleImageDTO(image)),
    };
  }

  async obterChalePorCodigo(codigo: string): Promise<ChaleDetailDTO> {
    const chale = await this.chaleRepository.findByCode(codigo);
    if (!chale) {
      throw new NotFoundException('Chalé não encontrado.');
    }

    const images = await this.prisma.hostingChaletImage.findMany({
      where: { chaletId: chale.id },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
    const currentPriceByChaleId = await this.resolveCurrentPriceMap([chale.id]);

    return {
      ...this.toChaleDTO(chale),
      currentPrice: currentPriceByChaleId.get(chale.id) ?? Number(chale.basePrice),
      images: images.map((image) => this.toChaleImageDTO(image)),
    };
  }

  async obterCalendarioChale(id: string, from?: Date, to?: Date): Promise<ChaleCalendarioDTO> {
    const chale = await this.chaleRepository.findById(id);
    if (!chale) {
      throw new NotFoundException('Chalé não encontrado.');
    }

    const startDate = from ?? new Date();
    const endDate = to ?? new Date(startDate.getTime() + 1000 * 60 * 60 * 24 * 365);
    if (endDate <= startDate) {
      throw new BadRequestException('A data final deve ser posterior à data inicial.');
    }

    const reservas = await this.prisma.hostingReservation.findMany({
      where: {
        chaletId: id,
        deletedAt: null,
        status: {
          in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.OCCUPIED],
        },
        checkInDate: { lt: endDate },
        checkOutDate: { gt: startDate },
      },
      select: {
        status: true,
        checkInDate: true,
        checkOutDate: true,
      },
    });

    const bloqueios = await this.prisma.hostingChaletBlock.findMany({
      where: {
        chaletId: id,
        isActive: true,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      select: {
        startDate: true,
        endDate: true,
      },
    });

    const reservedDates = new Set<string>();
    const unavailableDates = new Set<string>();

    for (const reserva of reservas) {
      const targetSet =
        reserva.status === ReservationStatus.OCCUPIED ? unavailableDates : reservedDates;
      for (const day of this.expandDateRange(reserva.checkInDate, reserva.checkOutDate, false)) {
        targetSet.add(day);
      }
    }

    for (const bloqueio of bloqueios) {
      for (const day of this.expandDateRange(bloqueio.startDate, bloqueio.endDate, true)) {
        unavailableDates.add(day);
      }
    }

    for (const date of unavailableDates) {
      reservedDates.delete(date);
    }

    return {
      chaletId: id,
      from: this.toIsoDate(startDate),
      to: this.toIsoDate(endDate),
      reservedDates: Array.from(reservedDates).sort(),
      unavailableDates: Array.from(unavailableDates).sort(),
    };
  }

  async criarChale(data: CreateChaleDTO): Promise<ChaleDTO> {
    this.validateCreateUpdateData(data.basePrice, data.maxGuests);
    const code = data.code?.trim() || (await this.generateUniqueCode());
    if (data.code?.trim()) {
      const existing = await this.chaleRepository.findByCode(code);
      if (existing) {
        throw new BadRequestException('Já existe chalé com o mesmo código.');
      }
    }

    const created = await this.chaleRepository.create({
      ...data,
      code,
    });
    return this.toChaleDTO(created);
  }

  async atualizarChale(id: string, data: UpdateChaleDTO): Promise<ChaleDTO> {
    const existing = await this.chaleRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Chalé não encontrado.');
    }

    if (data.basePrice !== undefined || data.maxGuests !== undefined) {
      this.validateCreateUpdateData(data.basePrice ?? Number(existing.basePrice), data.maxGuests ?? existing.maxGuests);
    }

    if (data.code && data.code !== existing.code) {
      const duplicate = await this.chaleRepository.findByCode(data.code);
      if (duplicate && duplicate.id !== id) {
        throw new BadRequestException('Já existe chalé com o mesmo código.');
      }
    }

    const updated = await this.chaleRepository.update(id, data);
    return this.toChaleDTO(updated);
  }

  async excluirChale(id: string): Promise<void> {
    const existing = await this.chaleRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Chalé não encontrado.');
    }

    const reservations = await this.reservaRepository.findByChaleId(id);
    const activeStatuses = new Set<ReservationStatus>([
      ReservationStatus.PENDING,
      ReservationStatus.CONFIRMED,
      ReservationStatus.OCCUPIED,
    ]);
    const hasActiveReservations = reservations.some((item) =>
      activeStatuses.has(item.status),
    );
    if (hasActiveReservations) {
      throw new BadRequestException('Não é possível excluir chalé com reservas ativas.');
    }

    await this.chaleRepository.softDelete(id);
  }

  async atualizarStatus(id: string, status: ChaleStatus): Promise<ChaleDTO> {
    await this.chaleRepository.updateStatus(id, status);
    const updated = await this.chaleRepository.findById(id);
    if (!updated) {
      throw new NotFoundException('Chalé não encontrado.');
    }
    return this.toChaleDTO(updated);
  }

  async listarChalesDisponiveis(
    checkin: Date,
    checkout: Date,
    capacidadeAdultos = 1,
    capacidadeCriancas = 0,
  ): Promise<ChaleListDTO[]> {
    if (checkout <= checkin) {
      throw new BadRequestException('Check-out deve ser posterior ao check-in.');
    }
    if (capacidadeAdultos < 0 || capacidadeCriancas < 0) {
      throw new BadRequestException('Capacidade informada inválida.');
    }

    const result = await this.chaleRepository.findAvailable(capacidadeAdultos, capacidadeCriancas, checkin, checkout);
    const ids = result.map((item) => item.id);
    const currentPriceByChaleId = await this.resolveCurrentPriceMap(ids);
    const images = ids.length
      ? await this.prisma.hostingChaletImage.findMany({
          where: { chaletId: { in: ids } },
          select: { chaletId: true },
        })
      : [];

    const imagesCountByChaleId = new Map<string, number>();
    for (const image of images) {
      imagesCountByChaleId.set(image.chaletId, (imagesCountByChaleId.get(image.chaletId) ?? 0) + 1);
    }

    return result.map((item) => ({
      ...this.toChaleDTO(item),
      currentPrice: currentPriceByChaleId.get(item.id) ?? Number(item.basePrice),
      imagesCount: imagesCountByChaleId.get(item.id) ?? 0,
    }));
  }

  async adicionarImagens(chaleId: string, files: Express.Multer.File[]): Promise<ChaleImagemDTO[]> {
    const chale = await this.chaleRepository.findById(chaleId);
    if (!chale) {
      throw new NotFoundException('Chalé não encontrado.');
    }
    if (!Array.isArray(files) || files.length === 0) {
      throw new BadRequestException('Envie pelo menos uma imagem.');
    }

    const existingImages = await this.prisma.hostingChaletImage.findMany({
      where: { chaletId: chaleId },
      select: { id: true, position: true },
    });

    if (existingImages.length + files.length > 10) {
      throw new BadRequestException('Um chalé pode ter no máximo 10 imagens.');
    }

    const maxPosition = existingImages.reduce((acc, cur) => Math.max(acc, cur.position), 0);
    const uploads = await this.hostingImageStorageService.uploadMany(files);
    const created = await this.prisma.$transaction(
      uploads.map((upload, index) =>
        this.prisma.hostingChaletImage.create({
          data: {
            chaletId: chaleId,
            imageUrl: upload.imageUrl,
            imageKey: upload.imageKey,
            fileSizeBytes: upload.fileSizeBytes,
            mimeType: upload.mimeType,
            position: maxPosition + index + 1,
          },
        }),
      ),
    );

    return created.map((item) => this.toChaleImageDTO(item));
  }

  async removerImagem(imagemId: string): Promise<void> {
    const deleted = await this.prisma.hostingChaletImage.deleteMany({
      where: { id: imagemId },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Imagem não encontrada.');
    }
  }

  private validateCreateUpdateData(basePrice: number, maxGuests: number): void {
    if (!Number.isFinite(basePrice) || basePrice < 0) {
      throw new BadRequestException('Preço base inválido.');
    }
    if (!Number.isInteger(maxGuests) || maxGuests <= 0) {
      throw new BadRequestException('Capacidade máxima inválida.');
    }
  }

  private async generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = `CHA-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0')}`;
      const exists = await this.chaleRepository.findByCode(candidate);
      if (!exists) {
        return candidate;
      }
    }
    throw new BadRequestException('Não foi possível gerar um código único para o chalé.');
  }

  private toChaleDTO(data: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    amenities: string[];
    rooms: string[];
    notes: string | null;
    unitType: ChaleType;
    status: ChaleStatus;
    basePrice: Prisma.Decimal | number | string;
    maxGuests: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): ChaleDTO {
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      description: data.description,
      amenities: data.amenities ?? [],
      rooms: data.rooms ?? [],
      notes: data.notes,
      unitType: data.unitType,
      status: data.status,
      basePrice: Number(data.basePrice),
      maxGuests: data.maxGuests,
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  private toChaleImageDTO(data: {
    id: string;
    imageUrl: string;
    imageKey: string;
    fileSizeBytes: number;
    mimeType: string | null;
    position: number;
    createdAt: Date;
  }): ChaleImagemDTO {
    return {
      id: data.id,
      imageUrl: data.imageUrl,
      imageKey: data.imageKey,
      fileSizeBytes: data.fileSizeBytes,
      mimeType: data.mimeType,
      position: data.position,
      createdAt: data.createdAt,
    };
  }

  private toIsoDate(date: Date): string {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
      .toISOString()
      .slice(0, 10);
  }

  private async resolveCurrentPriceMap(chaletIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (!chaletIds.length) {
      return map;
    }

    const referenceDate = this.toIsoDate(new Date());
    const referenceDateValue = new Date(`${referenceDate}T00:00:00.000Z`);
    const chalets = await this.prisma.hostingChalet.findMany({
      where: {
        id: { in: chaletIds },
      },
      select: {
        id: true,
        basePrice: true,
      },
    });
    const activeRules = await this.prisma.hostingPricingRule.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        startDate: { lte: referenceDateValue },
        endDate: { gte: referenceDateValue },
      },
      include: {
        chalets: {
          select: { chaletId: true },
        },
      },
      orderBy: [{ appliesToAll: 'asc' }, { createdAt: 'desc' }],
    });

    for (const chalet of chalets) {
      const basePrice = Number(chalet.basePrice ?? 0);
      const rule = activeRules.find((candidate) => {
        const applies = candidate.appliesToAll || candidate.chalets.some((item) => item.chaletId === chalet.id);
        if (!applies) {
          return false;
        }
        if (candidate.ruleType === PriceRuleType.WEEKEND) {
          const day = referenceDateValue.getUTCDay();
          return day === 0 || day === 6;
        }
        return true;
      });
      map.set(chalet.id, this.applyPriceRule(basePrice, rule?.ruleType, Number(rule?.percentage ?? 0)));
    }

    return map;
  }

  private applyPriceRule(basePrice: number, ruleType?: PriceRuleType, percentage = 0): number {
    if (!ruleType || !Number.isFinite(percentage) || percentage <= 0) {
      return Number(basePrice.toFixed(2));
    }
    const ratio = percentage / 100;
    const adjusted =
      ruleType === PriceRuleType.DISCOUNT
        ? basePrice * (1 - ratio)
        : basePrice * (1 + ratio);
    return Number(Math.max(adjusted, 0).toFixed(2));
  }

  private expandDateRange(start: Date, end: Date, inclusiveEnd: boolean): string[] {
    const result: string[] = [];
    const current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    const limit = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

    while (current < limit || (inclusiveEnd && current.getTime() === limit.getTime())) {
      result.push(current.toISOString().slice(0, 10));
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return result;
  }
}
