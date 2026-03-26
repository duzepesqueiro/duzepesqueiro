import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentStatus as PrismaPaymentStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { EventTypes } from '../../../shared/events';
import { PAYMENT_STATUS_DETAIL } from '../constants';
import { SearchPaymentDto } from '../dto';
import { BasePaymentEventPayload } from '../events';
import {
  IPaymentDomain as PaymentDomain,
  IPaymentResponse,
  IPointOfInteraction,
  ISearchPaymentResponse,
  ITransactionDetails,
} from '../interfaces';
import { MercadoPagoHttpService } from '../providers/mercadopago';

export interface SearchOptions {
  limit?: number;
  offset?: number;
  status?: string;
  collectorId?: string;
  payerId?: string;
  entityId?: string;
  fetchAllPages?: boolean;
}

type MercadoPagoSearchPayment = {
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
  point_of_interaction?: {
    type: string;
    transaction_data?: {
      qr_code_base64?: string;
      qr_code?: string;
      ticket_url?: string;
    };
  };
};

type MercadoPagoSearchResponse = {
  paging: { total: number; limit: number; offset: number };
  results: MercadoPagoSearchPayment[];
};

@Injectable()
export class SearchPaymentService {
  private static readonly MAX_LIMIT = 30;
  private readonly logger = new Logger(SearchPaymentService.name);

  constructor(
    private readonly httpService: MercadoPagoHttpService,
    private readonly prisma: PrismaService,
    private readonly loggerProvider: Logger,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(params: SearchPaymentDto): Promise<ISearchPaymentResponse> {
    const queryParams = this.buildQueryParams(params);
    const response = params.fetchAllPages
      ? await this.fetchAllPages(queryParams)
      : await this.httpService.get<MercadoPagoSearchResponse>(
          '/v1/payments/search',
          queryParams,
        );

    const filteredResults = this.applyLocalFilters(response.results, params);
    await this.reconcileWithLocal(filteredResults);

    const mappedResults = filteredResults.map((item) =>
      this.mapToPaymentResponse(item),
    );

    return {
      paging: {
        total:
          params.domain || params.entityId
            ? filteredResults.length
            : response.paging.total,
        limit: response.paging.limit,
        offset: response.paging.offset,
      },
      results: mappedResults,
    };
  }

  async searchByExternalReference(reference: string): Promise<IPaymentResponse[]> {
    const response = await this.execute({
      externalReference: reference,
      fetchAllPages: true,
    } as SearchPaymentDto);
    return response.results;
  }

  async searchByDomain(
    domain: PaymentDomain,
    options?: SearchOptions,
  ): Promise<ISearchPaymentResponse> {
    return this.execute({
      domain,
      status: options?.status as any,
      limit: options?.limit,
      offset: options?.offset,
      collectorId: options?.collectorId,
      payerId: options?.payerId,
      entityId: options?.entityId,
      fetchAllPages: options?.fetchAllPages,
    } as SearchPaymentDto);
  }

  async searchByDateRange(
    beginDate: Date,
    endDate: Date,
    options?: SearchOptions,
  ): Promise<ISearchPaymentResponse> {
    return this.execute({
      beginDate: beginDate.toISOString(),
      endDate: endDate.toISOString(),
      status: options?.status as any,
      limit: options?.limit,
      offset: options?.offset,
      collectorId: options?.collectorId,
      payerId: options?.payerId,
      entityId: options?.entityId,
      fetchAllPages: options?.fetchAllPages,
    } as SearchPaymentDto);
  }

  private buildQueryParams(params: SearchPaymentDto): Record<string, any> {
    const limit = Math.min(
      params.limit ?? SearchPaymentService.MAX_LIMIT,
      SearchPaymentService.MAX_LIMIT,
    );

    const query: Record<string, any> = {
      sort: params.sort ?? 'date_created',
      criteria: params.criteria ?? 'desc',
      range: params.range ?? 'date_created',
      begin_date: params.beginDate ?? 'NOW-30DAYS',
      end_date: params.endDate ?? 'NOW',
      limit,
      offset: params.offset ?? 0,
    };

    if (params.externalReference) {
      query.external_reference = params.externalReference;
    }
    if (params.status) {
      query.status = params.status;
    }
    if (params.collectorId) {
      query['collector.id'] = params.collectorId;
    }
    if (params.payerId) {
      query['payer.id'] = params.payerId;
    }

    return query;
  }

  private async fetchAllPages(
    initialParams: Record<string, any>,
  ): Promise<MercadoPagoSearchResponse> {
    const firstResponse = await this.httpService.get<MercadoPagoSearchResponse>(
      '/v1/payments/search',
      initialParams,
    );

    const results = [...firstResponse.results];
    const total = firstResponse.paging.total;
    const limit = firstResponse.paging.limit;
    const initialOffset = firstResponse.paging.offset;
    let nextOffset = initialOffset + limit;

    while (nextOffset < total) {
      const pageResponse = await this.httpService.get<MercadoPagoSearchResponse>(
        '/v1/payments/search',
        {
          ...initialParams,
          offset: nextOffset,
        },
      );
      results.push(...pageResponse.results);
      nextOffset += limit;
    }

    return {
      paging: {
        total,
        limit,
        offset: initialOffset,
      },
      results,
    };
  }

  private applyLocalFilters(
    results: MercadoPagoSearchPayment[],
    params: SearchPaymentDto,
  ): MercadoPagoSearchPayment[] {
    return results.filter((result) => {
      const parsed = this.parseExternalReference(result.external_reference);
      if (params.domain && parsed.domain !== params.domain) {
        return false;
      }
      if (params.entityId && parsed.entityId !== params.entityId) {
        return false;
      }
      return true;
    });
  }

  private async reconcileWithLocal(results: MercadoPagoSearchPayment[]) {
    if (results.length === 0) {
      return;
    }

    const externalIds = results.map((result) => result.id);
    const localPayments = await this.prisma.payment.findMany({
      where: {
        externalId: {
          in: externalIds,
        },
      },
    });

    const localByExternalId = new Map(
      localPayments
        .filter((payment) => payment.externalId !== null)
        .map((payment) => [payment.externalId, payment]),
    );

    for (const result of results) {
      const localPayment = localByExternalId.get(result.id);
      const parsed = this.parseExternalReference(result.external_reference);
      const domain = this.normalizeDomain(localPayment?.domain) ?? parsed.domain;
      const entityId = localPayment?.entityId ?? parsed.entityId;

      if (!domain || !entityId) {
        continue;
      }

      const hasInconsistency =
        !localPayment || localPayment.status !== this.toPrismaStatus(result.status);
      if (!hasInconsistency) {
        continue;
      }

      const payload: BasePaymentEventPayload = {
        paymentId: localPayment?.id ?? `external-${result.id}`,
        externalPaymentId: result.id,
        domain,
        entityId,
        timestamp: new Date(),
        triggeredBy: 'system.reconciliation',
      };

      this.eventEmitter.emit(EventTypes.PAYMENT_RECONCILIATION_NEEDED, payload);
      this.loggerProvider.warn(
        `Payment reconciliation needed for external payment ${result.id}`,
      );
    }
  }

  private parseExternalReference(reference: string): {
    domain?: PaymentDomain;
    entityId?: string;
  } {
    if (!reference?.includes('_')) {
      return {};
    }

    const [domainPart, ...entityParts] = reference.split('_');
    const domain = Object.values(PaymentDomain).includes(domainPart as PaymentDomain)
      ? (domainPart as PaymentDomain)
      : undefined;
    const entityId = entityParts.join('_') || undefined;

    return { domain, entityId };
  }

  private normalizeDomain(domain?: string): PaymentDomain | undefined {
    if (!domain) {
      return undefined;
    }
    return Object.values(PaymentDomain).includes(domain as PaymentDomain)
      ? (domain as PaymentDomain)
      : undefined;
  }

  private mapToPaymentResponse(
    gatewayResponse: MercadoPagoSearchPayment,
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
      pointOfInteraction,
    };
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
}
