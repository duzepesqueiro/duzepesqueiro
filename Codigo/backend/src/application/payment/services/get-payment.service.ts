import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentStatus as PrismaPaymentStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { EventTypes } from '../../../shared/events';
import { PAYMENT_STATUS_DETAIL } from '../constants';
import { PaymentNotFoundException } from '../exceptions';
import {
  BasePaymentEventPayload,
  PaymentApprovedPayload,
  PaymentRejectedPayload,
  PaymentRefundedPayload,
} from '../events';
import {
  IFeeDetail,
  IPaymentDomain as PaymentDomain,
  IPaymentResponse,
  IPointOfInteraction,
  ITransactionDetails,
} from '../interfaces';
import { MercadoPagoHttpService } from '../providers/mercadopago';

type CachedPayment = {
  response: IPaymentResponse;
  raw: MercadoPagoPaymentResponse;
  expiresAt: number;
};

type MercadoPagoPaymentResponse = {
  id: number;
  date_created: string;
  date_approved?: string;
  date_last_updated: string;
  money_release_date?: string;
  status: string;
  status_detail: string;
  currency_id: string;
  transaction_amount: number;
  transaction_amount_refunded?: number;
  payment_method_id: string;
  payment_type_id: string;
  issuer_id?: string;
  installments: number;
  external_reference: string;
  payer: {
    id?: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  transaction_details?: {
    net_received_amount: number;
    total_paid_amount: number;
    overpaid_amount: number;
    installment_amount: number;
  };
  fee_details?: Array<{
    type: string;
    amount: number;
    fee_payer?: string;
  }>;
  point_of_interaction?: {
    type: string;
    transaction_data?: {
      qr_code_base64?: string;
      qr_code?: string;
      ticket_url?: string;
    };
  };
  payment_method?: {
    data?: {
      threeds?: {
        authentication_status?: string;
        status?: string;
      };
    };
  };
};

@Injectable()
export class GetPaymentService {
  private readonly logger = new Logger(GetPaymentService.name);
  private readonly cache = new Map<string, CachedPayment>();

  constructor(
    private readonly httpService: MercadoPagoHttpService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly loggerProvider: Logger,
  ) {}

  async execute(paymentId: number): Promise<IPaymentResponse> {
    const cacheKey = `ext:${paymentId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.response;
    }

    const raw = await this.fetchGatewayPayment(paymentId);
    const mapped = this.mapToPaymentResponse(raw);
    this.cache.set(cacheKey, {
      response: mapped,
      raw,
      expiresAt: this.buildCacheExpiration(raw.status),
    });
    await this.syncLocalByExternalPaymentId(raw, false);

    return mapped;
  }

  async getByInternalId(internalId: string): Promise<IPaymentResponse> {
    const localPayment = await this.prisma.payment.findUnique({
      where: { id: internalId },
    });
    if (!localPayment) {
      throw new PaymentNotFoundException(internalId);
    }

    if (!localPayment.externalId) {
      return this.mapLocalToPaymentResponse(localPayment);
    }

    return this.execute(localPayment.externalId);
  }

  async getByExternalReference(reference: string): Promise<IPaymentResponse> {
    const localPayment = await this.prisma.payment.findFirst({
      where: { externalReference: reference },
    });
    if (localPayment?.externalId) {
      return this.execute(localPayment.externalId);
    }

    const searchResult = await this.httpService.get<{
      results: MercadoPagoPaymentResponse[];
    }>('/v1/payments/search', {
      external_reference: reference,
      sort: 'date_created',
      criteria: 'desc',
      limit: 1,
      offset: 0,
    });

    const payment = searchResult.results?.[0];
    if (!payment) {
      throw new PaymentNotFoundException(reference);
    }

    return this.execute(payment.id);
  }

  async syncWithGateway(internalId: string): Promise<IPaymentResponse> {
    const localPayment = await this.prisma.payment.findUnique({
      where: { id: internalId },
    });
    if (!localPayment?.externalId) {
      throw new PaymentNotFoundException(internalId);
    }

    const raw = await this.fetchGatewayPayment(localPayment.externalId);
    const mapped = this.mapToPaymentResponse(raw);
    this.cache.set(`ext:${raw.id}`, {
      response: mapped,
      raw,
      expiresAt: this.buildCacheExpiration(raw.status),
    });
    await this.syncLocalByExternalPaymentId(raw, true);

    return mapped;
  }

  private async fetchGatewayPayment(
    paymentId: number,
  ): Promise<MercadoPagoPaymentResponse> {
    return this.httpService.get<MercadoPagoPaymentResponse>(`/v1/payments/${paymentId}`);
  }

  private buildCacheExpiration(status: string): number {
    const pendingStatuses = ['pending', 'in_process', 'authorized', 'in_mediation'];
    const ttlMs = pendingStatuses.includes(status) ? 5 * 60 * 1000 : 60 * 60 * 1000;
    return Date.now() + ttlMs;
  }

  private async syncLocalByExternalPaymentId(
    gatewayResponse: MercadoPagoPaymentResponse,
    shouldEmitEvent: boolean,
  ) {
    const localPayment = await this.prisma.payment.findFirst({
      where: { externalId: gatewayResponse.id },
    });
    if (!localPayment) {
      return;
    }

    if (localPayment.status === this.toPrismaStatus(gatewayResponse.status)) {
      await this.prisma.payment.update({
        where: { id: localPayment.id },
        data: {
          statusDetail: gatewayResponse.status_detail,
          dateApproved: gatewayResponse.date_approved
            ? new Date(gatewayResponse.date_approved)
            : null,
          moneyReleaseDate: gatewayResponse.money_release_date
            ? new Date(gatewayResponse.money_release_date)
            : null,
          metadata: {
            gatewayResponse,
          } as any,
        },
      });
      return;
    }

    this.loggerProvider.warn(
      `Payment divergence detected for internal=${localPayment.id} external=${gatewayResponse.id}: local=${localPayment.status} gateway=${gatewayResponse.status}`,
    );

    await this.prisma.payment.update({
      where: { id: localPayment.id },
      data: {
        status: this.toPrismaStatus(gatewayResponse.status),
        statusDetail: gatewayResponse.status_detail,
        transactionAmount: gatewayResponse.transaction_amount,
        netReceivedAmount:
          gatewayResponse.transaction_details?.net_received_amount ?? null,
        installmentAmount:
          gatewayResponse.transaction_details?.installment_amount ?? null,
        paymentMethodId: gatewayResponse.payment_method_id,
        paymentTypeId: gatewayResponse.payment_type_id,
        issuerId: gatewayResponse.issuer_id ?? null,
        dateApproved: gatewayResponse.date_approved
          ? new Date(gatewayResponse.date_approved)
          : null,
        moneyReleaseDate: gatewayResponse.money_release_date
          ? new Date(gatewayResponse.money_release_date)
          : null,
        metadata: {
          gatewayResponse,
        } as any,
      },
    });

    if (shouldEmitEvent) {
      this.emitStatusEvent(localPayment.id, localPayment.domain, localPayment.entityId, gatewayResponse);
    }
  }

  private emitStatusEvent(
    internalId: string,
    domainRaw: string,
    entityId: string,
    gatewayResponse: MercadoPagoPaymentResponse,
  ) {
    const domain = this.normalizeDomain(domainRaw);
    if (!domain) {
      return;
    }

    const basePayload: BasePaymentEventPayload = {
      paymentId: internalId,
      externalPaymentId: gatewayResponse.id,
      domain,
      entityId,
      timestamp: new Date(),
      triggeredBy: 'system.sync',
    };

    if (gatewayResponse.status === 'approved') {
      const approvedPayload: PaymentApprovedPayload = {
        ...basePayload,
        amount: gatewayResponse.transaction_amount,
        netReceivedAmount:
          gatewayResponse.transaction_details?.net_received_amount ??
          gatewayResponse.transaction_amount,
        dateApproved: gatewayResponse.date_approved
          ? new Date(gatewayResponse.date_approved)
          : new Date(),
        authorizationCode: gatewayResponse.status_detail,
      };
      this.eventEmitter.emit(EventTypes.PAYMENT_APPROVED, approvedPayload);
      return;
    }

    if (gatewayResponse.status === 'rejected') {
      const rejectedPayload: PaymentRejectedPayload = {
        ...basePayload,
        statusDetail: gatewayResponse.status_detail,
        rejectionReason: gatewayResponse.status_detail,
      };
      this.eventEmitter.emit(EventTypes.PAYMENT_REJECTED, rejectedPayload);
      return;
    }

    if (gatewayResponse.status === 'cancelled') {
      this.eventEmitter.emit(EventTypes.PAYMENT_CANCELLED, basePayload);
      return;
    }

    if (gatewayResponse.status === 'refunded') {
      const refundedPayload: PaymentRefundedPayload = {
        ...basePayload,
        refundedAmount:
          gatewayResponse.transaction_amount_refunded ??
          gatewayResponse.transaction_amount,
        originalAmount: gatewayResponse.transaction_amount,
      };
      this.eventEmitter.emit(EventTypes.PAYMENT_REFUNDED, refundedPayload);
      return;
    }

    if (gatewayResponse.status === 'pending' || gatewayResponse.status === 'in_process') {
      this.eventEmitter.emit(EventTypes.PAYMENT_PENDING, basePayload);
    }
  }

  private normalizeDomain(domain?: string): PaymentDomain | undefined {
    if (!domain) {
      return undefined;
    }
    const normalized = domain.toLowerCase();
    return Object.values(PaymentDomain).includes(normalized as PaymentDomain)
      ? (normalized as PaymentDomain)
      : undefined;
  }

  private toPrismaStatus(status: string): PrismaPaymentStatus {
    if (status === 'approved') {
      return PrismaPaymentStatus.APPROVED;
    }
    if (status === 'authorized') {
      return PrismaPaymentStatus.AUTHORIZED;
    }
    if (status === 'in_process') {
      return PrismaPaymentStatus.IN_PROCESS;
    }
    if (status === 'in_mediation') {
      return PrismaPaymentStatus.IN_MEDIATION;
    }
    if (status === 'rejected') {
      return PrismaPaymentStatus.REJECTED;
    }
    if (status === 'cancelled') {
      return PrismaPaymentStatus.CANCELLED;
    }
    if (status === 'refunded') {
      return PrismaPaymentStatus.REFUNDED;
    }
    if (status === 'charged_back') {
      return PrismaPaymentStatus.CHARGED_BACK;
    }
    if (status === 'failed') {
      return PrismaPaymentStatus.FAILED;
    }
    return PrismaPaymentStatus.PENDING;
  }

  private mapLocalToPaymentResponse(localPayment: any): IPaymentResponse {
    return {
      id: localPayment.externalId ?? 0,
      dateCreated: localPayment.dateCreated,
      dateApproved: localPayment.dateApproved ?? undefined,
      dateLastUpdated: localPayment.dateLastUpdated,
      moneyReleaseDate: localPayment.moneyReleaseDate ?? undefined,
      status: String(localPayment.status).toLowerCase() as any,
      statusDetail: localPayment.statusDetail ?? '',
      currencyId: 'BRL',
      transactionAmount: Number(localPayment.transactionAmount),
      paymentMethodId: localPayment.paymentMethodId ?? '',
      paymentTypeId: localPayment.paymentTypeId ?? '',
      issuerId: localPayment.issuerId ?? undefined,
      installments: localPayment.installments,
      externalReference: localPayment.externalReference,
      payer: {
        email: localPayment.payerEmail,
        firstName: localPayment.payerName ?? undefined,
      },
      transactionDetails: localPayment.netReceivedAmount
        ? {
            netReceivedAmount: Number(localPayment.netReceivedAmount),
            totalPaidAmount: Number(localPayment.transactionAmount),
            overpaidAmount: 0,
            installmentAmount: Number(localPayment.installmentAmount ?? 0),
          }
        : undefined,
      pointOfInteraction:
        localPayment.pixQrCode || localPayment.pixTicketUrl
          ? {
              type: 'PIX',
              qrCode: localPayment.pixQrCode ?? undefined,
              qrCodeBase64: localPayment.pixQrCodeBase64 ?? undefined,
              ticketUrl: localPayment.pixTicketUrl ?? undefined,
            }
          : undefined,
    };
  }

  private mapToPaymentResponse(
    gatewayResponse: MercadoPagoPaymentResponse,
  ): IPaymentResponse {
    const transactionDetails: ITransactionDetails | undefined =
      gatewayResponse.transaction_details
        ? {
            netReceivedAmount:
              gatewayResponse.transaction_details.net_received_amount,
            totalPaidAmount:
              gatewayResponse.transaction_details.total_paid_amount,
            overpaidAmount: gatewayResponse.transaction_details.overpaid_amount,
            installmentAmount:
              gatewayResponse.transaction_details.installment_amount,
          }
        : undefined;

    const feeDetails: IFeeDetail[] | undefined = gatewayResponse.fee_details?.map(
      (fee) => ({
        type: fee.type,
        amount: fee.amount,
        feePayer: fee.fee_payer,
      }),
    );

    const pointOfInteraction: IPointOfInteraction | undefined =
      gatewayResponse.point_of_interaction
        ? {
            type: gatewayResponse.point_of_interaction.type,
            qrCodeBase64:
              gatewayResponse.point_of_interaction.transaction_data?.qr_code_base64,
            qrCode:
              gatewayResponse.point_of_interaction.transaction_data?.qr_code,
            ticketUrl:
              gatewayResponse.point_of_interaction.transaction_data?.ticket_url,
          }
        : undefined;

    const mappedStatusDetail =
      PAYMENT_STATUS_DETAIL[
        gatewayResponse.status_detail as keyof typeof PAYMENT_STATUS_DETAIL
      ] ?? gatewayResponse.status_detail;

    const threeDSStatus =
      gatewayResponse.payment_method?.data?.threeds?.authentication_status ??
      gatewayResponse.payment_method?.data?.threeds?.status;

    return {
      id: gatewayResponse.id,
      dateCreated: new Date(gatewayResponse.date_created),
      dateApproved: gatewayResponse.date_approved
        ? new Date(gatewayResponse.date_approved)
        : undefined,
      dateLastUpdated: new Date(gatewayResponse.date_last_updated),
      moneyReleaseDate: gatewayResponse.money_release_date
        ? new Date(gatewayResponse.money_release_date)
        : undefined,
      status: gatewayResponse.status as any,
      statusDetail: mappedStatusDetail,
      currencyId: gatewayResponse.currency_id,
      transactionAmount: gatewayResponse.transaction_amount,
      transactionAmountRefunded: gatewayResponse.transaction_amount_refunded,
      paymentMethodId: gatewayResponse.payment_method_id,
      paymentTypeId: gatewayResponse.payment_type_id,
      issuerId: gatewayResponse.issuer_id,
      installments: gatewayResponse.installments,
      externalReference: gatewayResponse.external_reference,
      payer: {
        id: gatewayResponse.payer.id,
        email: gatewayResponse.payer.email,
        firstName: gatewayResponse.payer.first_name,
        lastName: gatewayResponse.payer.last_name,
      },
      transactionDetails,
      feeDetails,
      threeDSStatus,
      pointOfInteraction,
    };
  }
}
