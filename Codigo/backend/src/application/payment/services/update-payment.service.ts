import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentStatus as PrismaPaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { EventTypes } from '../../../shared/events';
import { PAYMENT_STATUS_DETAIL } from '../constants';
import { UpdatePaymentDto } from '../dto';
import {
  PaymentApprovedPayload,
  PaymentRejectedPayload,
  PaymentRefundedPayload,
} from '../events';
import {
  PaymentNotFoundException,
  PaymentStateException,
  PaymentValidationException,
} from '../exceptions';
import {
  IFeeDetail,
  IPaymentDomain as PaymentDomain,
  IPaymentResponse,
  IPointOfInteraction,
  ITransactionDetails,
} from '../interfaces';
import { MercadoPagoHttpService } from '../providers/mercadopago';

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
export class UpdatePaymentService {
  private readonly logger = new Logger(UpdatePaymentService.name);
  private static readonly FINAL_STATUSES = [
    'approved',
    'rejected',
    'cancelled',
    'refunded',
    'charged_back',
    'failed',
  ];

  constructor(
    private readonly httpService: MercadoPagoHttpService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly loggerProvider: Logger,
  ) {}

  async execute(paymentId: number, dto: UpdatePaymentDto): Promise<IPaymentResponse> {
    const localPayment = await this.prisma.payment.findFirst({
      where: { externalId: paymentId },
    });
    if (!localPayment) {
      throw new PaymentNotFoundException(paymentId);
    }

    this.validateUpdateOperation(localPayment.status, dto);
    const payload = this.buildUpdatePayload(dto);
    this.logger.log(
      `Updating payment ${paymentId} with payload keys: ${Object.keys(payload).join(', ')}`,
    );
    this.logger.warn(
      `Payment update is non-idempotent for payment ${paymentId}; retry handling will verify current gateway state`,
    );

    try {
      const gatewayResponse = await this.httpService.put<MercadoPagoPaymentResponse>(
        `/v1/payments/${paymentId}`,
        payload,
      );
      await this.syncLocalAndEmit(localPayment.id, localPayment.domain, localPayment.entityId, gatewayResponse);
      return this.mapToPaymentResponse(gatewayResponse);
    } catch (error) {
      this.loggerProvider.error(
        `Payment update failed for external id ${paymentId}. Fetching current status from gateway`,
        error as Error,
      );
      const current = await this.tryFetchCurrentPayment(paymentId);
      if (current) {
        await this.syncLocalAndEmit(localPayment.id, localPayment.domain, localPayment.entityId, current);
        return this.mapToPaymentResponse(current);
      }
      throw error;
    }
  }

  async capturePayment(paymentId: number): Promise<IPaymentResponse> {
    return this.execute(paymentId, { capture: true });
  }

  async cancelPayment(paymentId: number, reason?: string): Promise<IPaymentResponse> {
    if (reason) {
      this.logger.log(`Cancel reason for payment ${paymentId}: ${reason}`);
    }
    return this.execute(paymentId, { status: 'cancelled' });
  }

  private validateUpdateOperation(currentStatus: string, dto: UpdatePaymentDto) {
    const normalizedStatus = currentStatus.toLowerCase();
    if (
      !dto.capture &&
      !dto.status &&
      dto.transactionAmount === undefined &&
      !dto.dateOfExpiration
    ) {
      throw new PaymentValidationException(
        'No updatable fields provided',
        'PAYMENT_UPDATE_EMPTY_PAYLOAD',
      );
    }

    const requestingRefund =
      (dto.status?.toLowerCase() === 'refunded' ||
        dto.status?.toLowerCase() === 'refund') &&
      normalizedStatus === 'approved';

    if (
      UpdatePaymentService.FINAL_STATUSES.includes(normalizedStatus) &&
      !requestingRefund
    ) {
      throw new PaymentStateException(
        `Payment with status "${currentStatus}" cannot be updated`,
        { currentStatus },
      );
    }

    if (dto.capture && normalizedStatus !== 'authorized') {
      throw new PaymentStateException(
        'Capture is allowed only for authorized payments',
        { currentStatus },
      );
    }

    if (
      dto.status === 'cancelled' &&
      normalizedStatus !== 'pending' &&
      normalizedStatus !== 'authorized'
    ) {
      throw new PaymentStateException(
        'Cancel is allowed only for pending or authorized payments',
        { currentStatus },
      );
    }
  }

  private buildUpdatePayload(dto: UpdatePaymentDto) {
    return {
      capture: dto.capture,
      status: dto.status,
      transaction_amount: dto.transactionAmount,
      date_of_expiration: dto.dateOfExpiration,
    };
  }

  private async tryFetchCurrentPayment(
    paymentId: number,
  ): Promise<MercadoPagoPaymentResponse | null> {
    try {
      return await this.httpService.get<MercadoPagoPaymentResponse>(
        `/v1/payments/${paymentId}`,
      );
    } catch (error) {
      this.loggerProvider.error(
        `Unable to fetch current gateway status for payment ${paymentId}`,
        error as Error,
      );
      return null;
    }
  }

  private async syncLocalAndEmit(
    internalId: string,
    domainRaw: string,
    entityId: string,
    gatewayResponse: MercadoPagoPaymentResponse,
  ) {
    await this.prisma.payment.update({
      where: { id: internalId },
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
        captured: gatewayResponse.status === 'approved',
        metadata: this.toJson({
          gatewayResponse,
        }),
      },
    });

    const domain = this.normalizeDomain(domainRaw);
    if (!domain) {
      return;
    }

    if (gatewayResponse.status === 'approved') {
      const payload: PaymentApprovedPayload = {
        paymentId: internalId,
        externalPaymentId: gatewayResponse.id,
        domain,
        entityId,
        timestamp: new Date(),
        triggeredBy: 'system.update',
        amount: gatewayResponse.transaction_amount,
        netReceivedAmount:
          gatewayResponse.transaction_details?.net_received_amount ??
          gatewayResponse.transaction_amount,
        dateApproved: gatewayResponse.date_approved
          ? new Date(gatewayResponse.date_approved)
          : new Date(),
        authorizationCode: gatewayResponse.status_detail,
      };
      this.eventEmitter.emit(EventTypes.PAYMENT_APPROVED, payload);
      this.logger.log(`Entity ${entityId} (${domain}) notified of approved payment`);
      return;
    }

    if (gatewayResponse.status === 'cancelled') {
      this.eventEmitter.emit(EventTypes.PAYMENT_CANCELLED, {
        paymentId: internalId,
        externalPaymentId: gatewayResponse.id,
        domain,
        entityId,
        timestamp: new Date(),
        triggeredBy: 'system.update',
      });
      this.logger.log(`Entity ${entityId} (${domain}) notified of cancelled payment`);
      return;
    }

    if (gatewayResponse.status === 'rejected') {
      const payload: PaymentRejectedPayload = {
        paymentId: internalId,
        externalPaymentId: gatewayResponse.id,
        domain,
        entityId,
        timestamp: new Date(),
        triggeredBy: 'system.update',
        statusDetail: gatewayResponse.status_detail,
        rejectionReason: gatewayResponse.status_detail,
      };
      this.eventEmitter.emit(EventTypes.PAYMENT_REJECTED, payload);
      this.logger.log(`Entity ${entityId} (${domain}) notified of rejected payment`);
      return;
    }

    if (gatewayResponse.status === 'refunded') {
      const payload: PaymentRefundedPayload = {
        paymentId: internalId,
        externalPaymentId: gatewayResponse.id,
        domain,
        entityId,
        timestamp: new Date(),
        triggeredBy: 'system.update',
        refundedAmount:
          gatewayResponse.transaction_amount_refunded ??
          gatewayResponse.transaction_amount,
        originalAmount: gatewayResponse.transaction_amount,
      };
      this.eventEmitter.emit(EventTypes.PAYMENT_REFUNDED, payload);
      this.logger.log(`Entity ${entityId} (${domain}) notified of refunded payment`);
      return;
    }

    if (gatewayResponse.status === 'pending' || gatewayResponse.status === 'in_process') {
      this.eventEmitter.emit(EventTypes.PAYMENT_PENDING, {
        paymentId: internalId,
        externalPaymentId: gatewayResponse.id,
        domain,
        entityId,
        timestamp: new Date(),
        triggeredBy: 'system.update',
      });
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

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
