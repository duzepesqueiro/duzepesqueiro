import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentDomain, Prisma } from '@prisma/client';
import { LogsService } from '../../../../application/logs/services';
import { NotificationsService } from '../../../../application/notifications/services/notifications.service';
import { IPaymentDomain, IPaymentMethod } from '../../../../application/payment/interfaces';
import { PayerDto, PaymentItemDto } from '../../../../application/payment/dto/create-payment.dto';
import { PaymentFacadeService } from '../../../../application/payment/services';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { HostingEventTypes } from '../../../../shared/events/hosting/event-types';
import {
  AvailabilityDTO,
  CancellationResponseDTO,
  CheckinResponseDTO,
  CheckoutResponseDTO,
  CreateHospedeDTO,
  CreateManualReservaDTO,
  CreateReservaDTO,
  HospedeDTO,
  ListReservasFiltersDTO,
  NoShowResponseDTO,
  PoliticaCancelamentoDTO,
  PriceCalculationDTO,
  ReservaDTO,
  ReservaDetailDTO,
  ReservaListDTO,
  UpdateReservaDTO,
  VoucherDTO,
} from '../../dto';
import { BloqueioChaleRepository, HospedeReservaRepository, ReservaRepository } from '../../repositories';
import { HospedagemNotificationService } from './hospedagem-notification.service';
import { HostingTermsStorageService } from './hosting-terms-storage.service';
import { PoliticaCancelamentoService } from './politica-cancelamento.service';

@Injectable()
export class ReservaService {
  constructor(
    private readonly reservaRepository: ReservaRepository,
    private readonly hospedeRepository: HospedeReservaRepository,
    private readonly bloqueioChaleRepository: BloqueioChaleRepository,
    private readonly paymentFacadeService: PaymentFacadeService,
    private readonly logsService: LogsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly notificationsService: NotificationsService,
    private readonly hospedagemNotificationService: HospedagemNotificationService,
    private readonly hostingTermsStorageService: HostingTermsStorageService,
    private readonly politicaCancelamentoService: PoliticaCancelamentoService,
    private readonly prisma: PrismaService,
  ) {}

  async criarReserva(data: CreateReservaDTO, userId?: string): Promise<ReservaDTO> {
    const checkin = new Date(data.checkInDate);
    const checkout = new Date(data.checkOutDate);
    const availability = await this.verificarDisponibilidade(data.chaletId, checkin, checkout);
    if (!availability.available) {
      throw new BadRequestException('Chalé indisponível para o período informado.');
    }

    const activePolicy = await this.politicaCancelamentoService.obterPoliticaAtiva();
    const isOnlineFlow = (data.origin ?? 'ONLINE') !== 'ADMIN';
    const guests = data.guests ?? [];
    if (guests.length > 0) {
      this.validateGuestsAndResponsible(guests, data.responsibleGuestIndex, isOnlineFlow);
    }

    if (isOnlineFlow) {
      this.validateVehiclePlate(data.vehiclePlate);
      this.validateTermsAcceptance(data, activePolicy);
    }

    const responsibleGuest =
      data.responsibleGuestIndex !== undefined && data.responsibleGuestIndex !== null
        ? guests[data.responsibleGuestIndex]
        : guests[0];
    const guestName = data.guestName?.trim() || responsibleGuest?.fullName?.trim();
    if (!guestName) {
      throw new BadRequestException('Nome do hóspede principal é obrigatório.');
    }

    const guestsCount = guests.length;
    const normalizedAdults =
      guestsCount > 0 ? guestsCount : (data.adults ?? 1);
    const normalizedChildren = guestsCount > 0 ? 0 : (data.children ?? 0);

    const created = await this.reservaRepository.create({
      ...data,
      userId: userId ?? data.userId,
      adults: normalizedAdults,
      children: normalizedChildren,
      guestName,
      guestEmail: data.guestEmail ?? responsibleGuest?.email,
      guestPhone: data.guestPhone ?? responsibleGuest?.phone,
      vehiclePlate: data.vehiclePlate ? this.normalizeVehiclePlate(data.vehiclePlate) : undefined,
      cancellationPolicyId: data.cancellationPolicyId ?? activePolicy.id,
      policyVersion: data.policyVersion ?? activePolicy.termsVersion,
      policyTerm: data.policyTerm ?? activePolicy.termsContent,
      policiesAccepted: true,
      policiesAcceptedAt: data.policiesAcceptedAt ?? new Date().toISOString(),
    });

    if (guests.length > 0) {
      await this.hospedeRepository.createMany(
        created.id,
        guests.map((guest, index) => ({
          reservationId: created.id,
          fullName: guest.fullName.trim(),
          cpf: guest.cpf ? this.normalizeCpf(guest.cpf) : undefined,
          email: guest.email,
          phone: guest.phone,
          birthDate: guest.birthDate,
          isPrimary:
            data.responsibleGuestIndex !== undefined
              ? index === data.responsibleGuestIndex
              : index === 0,
        })),
      );
    }

    let reservation = created;
    if (created.paymentMethod && created.guestEmail) {
      void this.logsService.info(
        'hosting',
        'HostingReservationPaymentCreationStarted',
        {
          reservationId: created.id,
          paymentMethod: created.paymentMethod,
          guestEmail: created.guestEmail,
        },
        created.id,
      );
      const payment = await this.tryCreatePayment(created);
      const linkedPaymentId = await this.resolveLocalPaymentId(created.id, Number(payment.id));
      reservation = await this.reservaRepository.update(created.id, {
        paymentId: linkedPaymentId,
        paymentStatus: 'PENDING',
      });
      void this.logsService.info(
        'hosting',
        'HostingReservationPaymentLinked',
        {
          reservationId: created.id,
          externalPaymentId: Number(payment.id),
          localPaymentId: linkedPaymentId,
        },
        created.id,
      );
    }

    await this.gerarVoucher(reservation.id);
    await this.createAuditLog('HOSTING_BOOKED', reservation.id, userId ?? reservation.userId ?? undefined, null, {
      status: reservation.status,
      totalAmount: Number(reservation.totalAmount),
    });
    const eventPayload = {
      reservationId: reservation.id,
      userId: userId ?? reservation.userId,
      totalAmount: Number(reservation.totalAmount),
      timestamp: new Date(),
    };
    void this.logsService.info('hosting', 'HostingBookedEventEmitting', eventPayload, reservation.id);
    this.eventEmitter.emit(HostingEventTypes.HOSTING_BOOKED, eventPayload);
    void this.logsService.info(
      'hosting',
      'HostingReservationCreated',
      { reservationId: reservation.id, userId: userId ?? reservation.userId, totalAmount: Number(reservation.totalAmount) },
      reservation.id,
    );
    await this.notifyAdminsReservationEvent({
      eventKey: 'hosting.reservation.created',
      type: 'SUCCESS',
      title: 'Reserva de hospedagem criada',
      message: `Reserva ${reservation.code} criada com sucesso.`,
      dedupKey: `hosting.reservation.created.${reservation.id}`,
      payload: {
        reservationId: reservation.id,
        code: reservation.code,
        status: reservation.status,
        totalAmount: Number(reservation.totalAmount),
      },
      reservationId: reservation.id,
    });

    return this.toReservaDTO(reservation);
  }

  async obterPoliticaAtiva(): Promise<PoliticaCancelamentoDTO> {
    return this.politicaCancelamentoService.obterPoliticaAtiva();
  }

  async uploadDocumentoTermos(
    file: Express.Multer.File,
    adminUserId: string,
  ): Promise<PoliticaCancelamentoDTO> {
    const uploaded = await this.hostingTermsStorageService.uploadSingle(file);
    return this.politicaCancelamentoService.salvarDocumentoTermosAtivo(uploaded.fileUrl, adminUserId);
  }

  async baixarDocumentoTermosAtivo(): Promise<{ content: Buffer; mimeType: string; fileName: string }> {
    const activePolicy = await this.politicaCancelamentoService.obterPoliticaAtiva();
    const downloaded = await this.hostingTermsStorageService.downloadFromPublicUrl(activePolicy.termsContent);
    const safeVersion = (activePolicy.termsVersion || 'termos').replace(/[^a-zA-Z0-9-_]/g, '_');
    return {
      content: downloaded.content,
      mimeType: downloaded.mimeType || 'application/pdf',
      fileName: `termos-reserva-${safeVersion}.pdf`,
    };
  }

  async criarReservaManual(data: CreateManualReservaDTO, operadorId: string): Promise<ReservaDTO> {
    return this.criarReserva(
      {
        ...data,
        origin: 'ADMIN',
        policiesAccepted: true,
        policiesAcceptedAt: data.policiesAcceptedAt ?? new Date().toISOString(),
        createdById: operadorId,
      },
      data.userId,
    );
  }

  async obterReserva(id: string): Promise<ReservaDetailDTO> {
    const reservation = await this.prisma.hostingReservation.findFirst({
      where: { id, deletedAt: null },
      include: {
        guests: true,
        vouchers: true,
      },
    });
    if (!reservation) {
      throw new NotFoundException('Reserva não encontrada.');
    }
    return this.toReservaDetailDTO(reservation);
  }

  async obterReservaPorCodigo(codigo: string): Promise<ReservaDetailDTO> {
    const reserva = await this.reservaRepository.findByCodigo(codigo);
    if (!reserva) {
      throw new NotFoundException('Reserva não encontrada.');
    }
    return this.obterReserva(reserva.id);
  }

  async listarReservas(filters?: ListReservasFiltersDTO): Promise<ReservaListDTO[]> {
    const items = await this.reservaRepository.findAll(filters);
    return items.map((item) => this.toReservaListDTO(item));
  }

  async listarReservasDoUsuario(userId: string): Promise<ReservaListDTO[]> {
    const items = await this.reservaRepository.findByUserId(userId);
    return items.map((item) => this.toReservaListDTO(item));
  }

  async atualizarReserva(id: string, data: UpdateReservaDTO): Promise<ReservaDTO> {
    const updated = await this.reservaRepository.update(id, data);
    await this.createAuditLog('HOSTING_RESERVATION_UPDATED', id, data.updatedById ?? undefined, null, data as Record<string, unknown>);
    await this.notifyAdminsReservationEvent({
      eventKey: 'hosting.reservation.updated',
      type: 'INFO',
      title: 'Reserva de hospedagem atualizada',
      message: `Reserva ${updated.code} foi atualizada.`,
      dedupKey: `hosting.reservation.updated.${updated.id}.${updated.updatedAt.toISOString()}`,
      payload: {
        reservationId: updated.id,
        code: updated.code,
        status: updated.status,
      },
      reservationId: updated.id,
    });
    return this.toReservaDTO(updated);
  }

  async processarCheckin(id: string, operadorId: string): Promise<CheckinResponseDTO> {
    const updated = await this.reservaRepository.processCheckin(id, new Date());
    await this.prisma.hostingReservation.update({
      where: { id },
      data: { updatedById: operadorId },
    });
    await this.createAuditLog('HOSTING_CHECKIN', id, operadorId, null, { checkedInAt: updated.checkedInAt });
    this.eventEmitter.emit(HostingEventTypes.HOSTING_CHECKIN, {
      reservationId: id,
      operatorId: operadorId,
      timestamp: new Date(),
    });
    void this.logsService.info('hosting', 'HostingCheckinProcessed', { reservationId: id, operatorId: operadorId }, id);
    await this.hospedagemNotificationService.enviarNotificacaoCheckin(id);
    await this.notifyAdminsReservationEvent({
      eventKey: 'hosting.reservation.checkin',
      type: 'SUCCESS',
      title: 'Check-in realizado',
      message: `Check-in registrado para a reserva ${updated.code}.`,
      dedupKey: `hosting.reservation.checkin.${updated.id}.${updated.checkedInAt?.toISOString() ?? ''}`,
      payload: {
        reservationId: updated.id,
        code: updated.code,
        checkedInAt: updated.checkedInAt?.toISOString() ?? null,
      },
      reservationId: updated.id,
    });

    return {
      reservationId: id,
      status: updated.status,
      checkedInAt: updated.checkedInAt ?? new Date(),
    };
  }

  async processarCheckout(id: string, operadorId: string): Promise<CheckoutResponseDTO> {
    const updated = await this.reservaRepository.processCheckout(id, new Date());
    await this.prisma.hostingReservation.update({
      where: { id },
      data: { updatedById: operadorId },
    });
    await this.createAuditLog('HOSTING_CHECKOUT', id, operadorId, null, { checkedOutAt: updated.checkedOutAt });
    this.eventEmitter.emit(HostingEventTypes.HOSTING_CHECKOUT, {
      reservationId: id,
      operatorId: operadorId,
      timestamp: new Date(),
    });
    void this.logsService.info('hosting', 'HostingCheckoutProcessed', { reservationId: id, operatorId: operadorId }, id);
    await this.hospedagemNotificationService.enviarNotificacaoCheckoutEConclusao(id);
    await this.notifyAdminsReservationEvent({
      eventKey: 'hosting.reservation.checkout',
      type: 'SUCCESS',
      title: 'Check-out realizado',
      message: `Check-out registrado para a reserva ${updated.code}.`,
      dedupKey: `hosting.reservation.checkout.${updated.id}.${updated.checkedOutAt?.toISOString() ?? ''}`,
      payload: {
        reservationId: updated.id,
        code: updated.code,
        checkedOutAt: updated.checkedOutAt?.toISOString() ?? null,
      },
      reservationId: updated.id,
    });

    return {
      reservationId: id,
      status: updated.status,
      checkedOutAt: updated.checkedOutAt ?? new Date(),
    };
  }

  async cancelarReserva(id: string, motivo: string, userId: string): Promise<CancellationResponseDTO> {
    const reserva = await this.reservaRepository.findById(id);
    if (!reserva) {
      throw new NotFoundException('Reserva não encontrada.');
    }

    const cancellationFee = await this.politicaCancelamentoService.calcularMultaManual(
      Number(reserva.totalAmount),
      reserva.checkInDate,
    );
    const penaltyAmount = cancellationFee.valorMulta;
    const updated = await this.reservaRepository.processCancellation(id, motivo, userId);

    if (updated.paymentId) {
      await this.paymentFacadeService.cancelPayment(IPaymentDomain.HOSTING, updated.id, motivo);
      await this.reservaRepository.update(id, { paymentStatus: 'CANCELLED', updatedById: userId });
    }

    await this.createAuditLog('HOSTING_CANCELLED', id, userId, null, { reason: motivo, penaltyAmount });
    this.eventEmitter.emit(HostingEventTypes.HOSTING_CANCELLED, {
      reservationId: id,
      userId,
      reason: motivo,
      penaltyAmount,
      timestamp: new Date(),
    });
    void this.logsService.warn(
      'hosting',
      'HostingReservationCancelled',
      { reservationId: id, userId, reason: motivo, penaltyAmount },
      id,
    );
    await this.hospedagemNotificationService.enviarNotificacaoCancelamento(id, penaltyAmount);
    await this.notifyAdminsReservationEvent({
      eventKey: 'hosting.reservation.cancelled',
      type: 'WARNING',
      title: 'Reserva cancelada',
      message: `Reserva ${updated.code} foi cancelada.`,
      dedupKey: `hosting.reservation.cancelled.${updated.id}.${updated.cancelledAt?.toISOString() ?? ''}`,
      payload: {
        reservationId: updated.id,
        code: updated.code,
        reason: motivo,
        cancelledAt: updated.cancelledAt?.toISOString() ?? null,
        penaltyAmount,
      },
      reservationId: updated.id,
    });

    return {
      reservationId: id,
      status: updated.status,
      cancelledAt: updated.cancelledAt ?? new Date(),
      cancellationReason: updated.cancellationReason,
      penaltyAmount,
    };
  }

  async registrarNoShow(id: string, operadorId: string): Promise<NoShowResponseDTO> {
    const updated = await this.reservaRepository.processNoShow(id);
    await this.prisma.hostingReservation.update({
      where: { id },
      data: { updatedById: operadorId },
    });

    await this.createAuditLog('HOSTING_NO_SHOW', id, operadorId, null, {
      noShowAt: updated.noShowAt,
      noShowFeeAmount: updated.noShowFeeAmount ? Number(updated.noShowFeeAmount) : null,
    });
    void this.logsService.warn(
      'hosting',
      'HostingNoShowRegistered',
      { reservationId: id, operatorId: operadorId },
      id,
    );
    await this.hospedagemNotificationService.enviarNotificacaoNoShow(
      id,
      updated.noShowFeeAmount ? Number(updated.noShowFeeAmount) : Number(updated.totalAmount),
    );
    await this.notifyAdminsReservationEvent({
      eventKey: 'hosting.reservation.no-show',
      type: 'ERROR',
      title: 'No-show registrado',
      message: `Reserva ${updated.code} marcada como no-show.`,
      dedupKey: `hosting.reservation.no-show.${updated.id}.${updated.noShowAt?.toISOString() ?? ''}`,
      payload: {
        reservationId: updated.id,
        code: updated.code,
        noShowAt: updated.noShowAt?.toISOString() ?? null,
        noShowFeeAmount: updated.noShowFeeAmount ? Number(updated.noShowFeeAmount) : Number(updated.totalAmount),
      },
      reservationId: updated.id,
    });

    return {
      reservationId: id,
      status: updated.status,
      noShowAt: updated.noShowAt ?? new Date(),
      noShowFeeAmount: updated.noShowFeeAmount ? Number(updated.noShowFeeAmount) : null,
    };
  }

  async calcularValorReserva(
    chaleId: string,
    checkin: Date,
    checkout: Date,
    numAdultos: number,
    numCriancas: number,
  ): Promise<PriceCalculationDTO> {
    if (checkout <= checkin) {
      throw new BadRequestException('Check-out deve ser posterior ao check-in.');
    }

    const guests = Math.max(0, numAdultos) + Math.max(0, numCriancas);
    try {
      const rows = await this.prisma.$queryRaw<Array<{ total: number | string }>>`
        SELECT calculate_total_reservation(${chaleId}, ${checkin}::date, ${checkout}::date, ${guests}) AS total
      `;
      return {
        chaletId: chaleId,
        checkInDate: checkin,
        checkOutDate: checkout,
        guests,
        totalAmount: Number(rows?.[0]?.total ?? 0),
      };
    } catch {
      const chale = await this.prisma.hostingChalet.findUnique({
        where: { id: chaleId },
        select: { basePrice: true },
      });
      const nights = Math.ceil((checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60 * 24));
      return {
        chaletId: chaleId,
        checkInDate: checkin,
        checkOutDate: checkout,
        guests,
        totalAmount: Number(chale?.basePrice ?? 0) * Math.max(nights, 1),
      };
    }
  }

  async verificarDisponibilidade(chaleId: string, checkin: Date, checkout: Date): Promise<AvailabilityDTO> {
    if (checkout <= checkin) {
      throw new BadRequestException('Check-out deve ser posterior ao check-in.');
    }

    try {
      const rows = await this.prisma.$queryRaw<Array<{ available: boolean }>>`
        SELECT verify_chalet_availability(${chaleId}, ${checkin}::date, ${checkout}::date, NULL) AS available
      `;
      return {
        chaletId: chaleId,
        checkInDate: checkin,
        checkOutDate: checkout,
        available: Boolean(rows?.[0]?.available ?? false),
      };
    } catch {
      const overlaps = await this.reservaRepository.findOverlappingReservations(chaleId, checkin, checkout);
      const blocks = await this.bloqueioChaleRepository.findOverlappingBlocks(chaleId, checkin, checkout);
      return {
        chaletId: chaleId,
        checkInDate: checkin,
        checkOutDate: checkout,
        available: overlaps.length === 0 && blocks.length === 0,
      };
    }
  }

  async adicionarHospede(reservaId: string, hospede: CreateHospedeDTO): Promise<HospedeDTO> {
    const created = await this.hospedeRepository.create({
      ...hospede,
      reservationId: reservaId,
    });
    return this.toHospedeDTO(created);
  }

  async removerHospede(hospedeId: string): Promise<void> {
    await this.hospedeRepository.delete(hospedeId);
  }

  async gerarVoucher(reservaId: string): Promise<VoucherDTO> {
    const reserva = await this.reservaRepository.findById(reservaId);
    if (!reserva) {
      throw new NotFoundException('Reserva não encontrada.');
    }

    const qrCode = `${reserva.code}-${Math.floor(100000 + Math.random() * 900000)}`;
    const existing = await this.prisma.hostingReservationVoucher.findFirst({
      where: { reservationId: reservaId },
    });

    const voucher = existing
      ? await this.prisma.hostingReservationVoucher.update({
          where: { id: existing.id },
          data: {
            qrCode,
            generatedAt: new Date(),
          },
        })
      : await this.prisma.hostingReservationVoucher.create({
          data: {
            reservationId: reservaId,
            qrCode,
            arrivalInstructions: 'Present your reservation code at check-in.',
            complexContacts: 'Reception: +55 (00) 00000-0000',
          },
        });

    return this.toVoucherDTO(voucher);
  }

  async enviarVoucher(reservaId: string, canal: 'email' | 'whatsapp'): Promise<void> {
    if (canal !== 'email') {
      throw new BadRequestException('Canal não suportado. O sistema de hospedagem envia notificações apenas por e-mail.');
    }
    await this.hospedagemNotificationService.enviarDetalhesVoucher(reservaId);
  }

  private async tryCreatePayment(reservation: {
    id: string;
    totalAmount: Prisma.Decimal | number | string;
    paymentMethod: string | null;
    guestName: string;
    guestEmail: string | null;
    guestPhone: string | null;
    code: string;
  }) {
    const method = this.mapPaymentMethod(reservation.paymentMethod);
    const payer: PayerDto = {
      email: reservation.guestEmail ?? 'guest@duze.local',
      firstName: reservation.guestName.split(' ')[0] || reservation.guestName,
      lastName: reservation.guestName.split(' ').slice(1).join(' ') || undefined,
    };

    const items: PaymentItemDto[] = [
      {
        id: reservation.id,
        title: `Hosting reservation ${reservation.code}`,
        quantity: 1,
        unitPrice: Number(reservation.totalAmount),
      },
    ];

    return this.paymentFacadeService.createHostingPayment(
      reservation.id,
      Number(reservation.totalAmount),
      method,
      payer,
      items,
    );
  }

  private mapPaymentMethod(method?: string | null): IPaymentMethod {
    const value = (method ?? 'pix').toLowerCase();
    if (value.includes('credit')) {
      return IPaymentMethod.CREDIT;
    }
    if (value.includes('debit')) {
      return IPaymentMethod.DEBIT;
    }
    return IPaymentMethod.PIX;
  }

  private async resolveLocalPaymentId(reservationId: string, externalPaymentId: number): Promise<string> {
    const localPayment = await this.prisma.payment.findFirst({
      where: {
        domain: PaymentDomain.HOSTING,
        entityId: reservationId,
        ...(Number.isFinite(externalPaymentId) ? { externalId: externalPaymentId } : {}),
      },
      select: { id: true },
      orderBy: { dateLastUpdated: 'desc' },
    });

    if (!localPayment) {
      throw new BadRequestException(
        'Pagamento criado, mas não foi possível vincular a referência interna da reserva.',
      );
    }

    return localPayment.id;
  }

  private validateGuestsAndResponsible(
    guests: NonNullable<CreateReservaDTO['guests']>,
    responsibleGuestIndex?: number,
    strictValidation = true,
  ): void {
    if (!guests.length) {
      throw new BadRequestException('Informe pelo menos 1 hóspede para concluir a reserva.');
    }

    const hospedePrincipal = guests[0];
    const principalCpf = hospedePrincipal.cpf ? this.normalizeCpf(hospedePrincipal.cpf) : '';
    const principalName = this.normalizeName(hospedePrincipal.fullName);

    guests.forEach((guest, index) => {
      if (!guest.fullName?.trim()) {
        throw new BadRequestException(`Nome completo do hóspede ${index + 1} é obrigatório.`);
      }
      if (guest.age !== undefined && guest.age < 0) {
        throw new BadRequestException(`Idade do hóspede ${index + 1} é inválida.`);
      }
      if (strictValidation && !guest.cpf?.trim()) {
        throw new BadRequestException(`CPF do hóspede ${index + 1} é obrigatório.`);
      }
      if (strictValidation && (guest.age === undefined || guest.age === null)) {
        throw new BadRequestException(`Idade do hóspede ${index + 1} é obrigatória.`);
      }

      if (index > 0) {
        if (principalCpf && guest.cpf && this.normalizeCpf(guest.cpf) === principalCpf) {
          throw new BadRequestException(
            'O CPF do hóspede 1 não pode ser igual ao dos outros hóspedes.',
          );
        }
        if (this.normalizeName(guest.fullName) === principalName) {
          throw new BadRequestException(
            'O nome completo do hóspede 1 não pode ser igual ao dos outros hóspedes.',
          );
        }
      }
    });

    if (strictValidation) {
      if (responsibleGuestIndex === undefined || responsibleGuestIndex === null) {
        throw new BadRequestException('É obrigatório selecionar o hóspede responsável.');
      }
      if (responsibleGuestIndex < 0 || responsibleGuestIndex >= guests.length) {
        throw new BadRequestException('Hóspede responsável inválido.');
      }
      if ((guests[responsibleGuestIndex].age ?? 0) < 18) {
        throw new BadRequestException('O hóspede responsável deve ter 18 anos ou mais.');
      }
    }
  }

  private validateVehiclePlate(plate?: string): void {
    if (!plate?.trim()) {
      throw new BadRequestException('Placa do veículo é obrigatória.');
    }
    const normalized = this.normalizeVehiclePlate(plate);
    const oldPattern = /^[A-Z]{3}\d{4}$/;
    const mercosulPattern = /^[A-Z]{3}\d[A-Z0-9]\d{2}$/;
    if (!oldPattern.test(normalized) && !mercosulPattern.test(normalized)) {
      throw new BadRequestException('Placa inválida. Use padrão antigo (ABC1234) ou Mercosul (ABC1D23).');
    }
  }

  private validateTermsAcceptance(
    data: CreateReservaDTO,
    activePolicy: PoliticaCancelamentoDTO,
  ): void {
    if (!data.policiesAccepted) {
      throw new BadRequestException('É obrigatório aceitar os termos da reserva.');
    }
    if (!activePolicy.termsVersion?.trim() || !activePolicy.termsContent?.trim()) {
      throw new BadRequestException(
        'Não foi possível validar os termos da reserva. Política ativa incompleta.',
      );
    }
  }

  private normalizeVehiclePlate(value: string): string {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  }

  private normalizeCpf(value: string): string {
    return value.replace(/\D/g, '');
  }

  private normalizeName(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private async createAuditLog(
    action: string,
    reservationId: string,
    userId?: string,
    oldValue?: Record<string, unknown> | null,
    newValue?: Record<string, unknown> | null,
  ): Promise<void> {
    await this.prisma.hostingAuditLog.create({
      data: {
        action,
        reservationId,
        userId,
        oldValue: (oldValue ?? undefined) as Prisma.InputJsonValue | undefined,
        newValue: (newValue ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  private async notifyAdminsReservationEvent(params: {
    eventKey: string;
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
    title: string;
    message: string;
    dedupKey: string;
    payload: Record<string, unknown>;
    reservationId: string;
  }): Promise<void> {
    try {
      await this.notificationsService.notifyAdmins({
        source: 'hosting',
        eventKey: params.eventKey,
        type: params.type,
        title: params.title,
        message: params.message,
        dedupKey: params.dedupKey,
        payload: params.payload,
      });
    } catch (error) {
      void this.logsService.warn(
        'hosting',
        'HostingAdminNotificationFailed',
        {
          reservationId: params.reservationId,
          eventKey: params.eventKey,
          error: error instanceof Error ? error.message : String(error),
        },
        params.reservationId,
      );
    }
  }

  private toReservaDTO(data: {
    id: string;
    code: string;
    chaletId: string;
    userId: string | null;
    status: any;
    origin: any;
    guestName: string;
    guestEmail: string | null;
    guestPhone: string | null;
    checkInDate: Date;
    checkOutDate: Date;
    adults: number;
    children: number;
    baseAmount: Prisma.Decimal | number | string;
    discountAmount: Prisma.Decimal | number | string;
    surchargeAmount: Prisma.Decimal | number | string;
    totalAmount: Prisma.Decimal | number | string;
    paymentStatus: any;
    paymentMethod: string | null;
    paymentId: string | null;
    paidAt: Date | null;
    checkedInAt: Date | null;
    checkedOutAt: Date | null;
    cancelledAt: Date | null;
    noShowAt: Date | null;
    noShowFeeAmount: Prisma.Decimal | number | string | null;
    noShowReason: string | null;
    cancellationReason: string | null;
    vehiclePlate: string | null;
    vehicleModel: string | null;
    vehicleColor: string | null;
    vehicleType: string | null;
    extraBedRequested: boolean;
    extraBedFee: Prisma.Decimal | number | string;
    negotiationNotes: string | null;
    contactChannel: any;
    contactNotes: string | null;
    policiesAccepted: boolean;
    policiesAcceptedAt: Date | null;
    policyVersion: string | null;
    policyTerm: string | null;
    cancellationPolicyId: string | null;
    pricingRuleId: string | null;
    notes: string | null;
    createdById: string | null;
    updatedById: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ReservaDTO {
    return {
      id: data.id,
      code: data.code,
      chaletId: data.chaletId,
      userId: data.userId,
      status: data.status,
      origin: data.origin,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      adults: data.adults,
      children: data.children,
      baseAmount: Number(data.baseAmount),
      discountAmount: Number(data.discountAmount),
      surchargeAmount: Number(data.surchargeAmount),
      totalAmount: Number(data.totalAmount),
      paymentStatus: data.paymentStatus,
      paymentMethod: data.paymentMethod,
      paymentId: data.paymentId,
      paidAt: data.paidAt,
      checkedInAt: data.checkedInAt,
      checkedOutAt: data.checkedOutAt,
      cancelledAt: data.cancelledAt,
      noShowAt: data.noShowAt,
      noShowFeeAmount: data.noShowFeeAmount !== null ? Number(data.noShowFeeAmount) : null,
      noShowReason: data.noShowReason,
      cancellationReason: data.cancellationReason,
      vehiclePlate: data.vehiclePlate,
      vehicleModel: data.vehicleModel,
      vehicleColor: data.vehicleColor,
      vehicleType: data.vehicleType,
      extraBedRequested: data.extraBedRequested,
      extraBedFee: Number(data.extraBedFee),
      negotiationNotes: data.negotiationNotes,
      contactChannel: data.contactChannel,
      contactNotes: data.contactNotes,
      policiesAccepted: data.policiesAccepted,
      policiesAcceptedAt: data.policiesAcceptedAt,
      policyVersion: data.policyVersion,
      policyTerm: data.policyTerm,
      cancellationPolicyId: data.cancellationPolicyId,
      pricingRuleId: data.pricingRuleId,
      notes: data.notes,
      createdById: data.createdById,
      updatedById: data.updatedById,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  private toReservaListDTO(data: any): ReservaListDTO {
    return this.toReservaDTO(data);
  }

  private toHospedeDTO(data: any): HospedeDTO {
    return {
      id: data.id,
      reservationId: data.reservationId,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      cpf: data.cpf,
      rg: data.rg,
      birthDate: data.birthDate,
      isPrimary: data.isPrimary,
    };
  }

  private toVoucherDTO(data: any): VoucherDTO {
    return {
      id: data.id,
      reservationId: data.reservationId,
      qrCode: data.qrCode,
      arrivalInstructions: data.arrivalInstructions,
      complexContacts: data.complexContacts,
      generatedAt: data.generatedAt,
      sentByEmail: data.sentByEmail,
    };
  }

  private toReservaDetailDTO(data: any): ReservaDetailDTO {
    return {
      ...this.toReservaDTO(data),
      guests: (data.guests ?? []).map((guest: any) => this.toHospedeDTO(guest)),
      vouchers: (data.vouchers ?? []).map((voucher: any) => this.toVoucherDTO(voucher)),
    };
  }
}
