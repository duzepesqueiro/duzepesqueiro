import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PaymentDomain as PrismaPaymentDomain,
  PaymentMethod as PrismaPaymentMethod,
  PaymentStatus as PrismaPaymentStatus,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { EventTypes } from '../../../shared/events';
import { CreatePaymentDto } from '../dto';
import {
  PAYMENT_DOMAIN_RULES,
  PAYMENT_STATUS_DETAIL,
} from '../constants';
import {
  InstallmentNotAllowedException,
  MinInstallmentValueException,
  MinValueForInstallmentsException,
  PaymentGatewayException,
  PaymentMethodNotAllowedException,
  PaymentValidationException,
} from '../exceptions';
import {
  BasePaymentEventPayload,
  PaymentApprovedPayload,
  PaymentCreatedPayload,
} from '../events';
import { IPaymentResponse, IPointOfInteraction, ITransactionDetails } from '../interfaces';
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
  point_of_interaction?: {
    type: string;
    transaction_data?: {
      qr_code_base64?: string;
      qr_code?: string;
      ticket_url?: string;
    };
  };
};

@Injectable()
export class CreatePaymentService {
  private readonly logger = new Logger(CreatePaymentService.name);

  constructor(
    private readonly httpService: MercadoPagoHttpService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly loggerProvider: Logger,
  ) {}

  async execute(dto: CreatePaymentDto, userId: string): Promise<IPaymentResponse> {
    this.validateBusinessRules(dto);

    const externalReference = `${dto.domain}_${dto.entityId}`;
    const existingPayment = await this.prisma.payment.findUnique({
      where: { externalReference },
    });

    if (existingPayment?.externalId) {
      const currentGatewayPayment = await this.httpService.get<MercadoPagoPaymentResponse>(
        `/v1/payments/${existingPayment.externalId}`,
      );
      return this.mapToPaymentResponse(currentGatewayPayment);
    }

    const idempotencyKey = existingPayment?.idempotencyKey ?? randomUUID();
    const requestPayload = this.buildMercadoPagoPayload(dto, userId, externalReference);
    const paymentMethod = this.toPrismaMethod(dto.paymentMethodId);
    const payerName = [dto.payer.firstName, dto.payer.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    const paymentRecord = existingPayment
      ? await this.prisma.payment.update({
          where: { id: existingPayment.id },
          data: {
            transactionAmount: dto.transactionAmount,
            installments: dto.installments,
            installmentAmount: dto.transactionAmount / dto.installments,
            paymentMethod,
            paymentMethodId: dto.paymentMethodId,
            paymentTypeId: dto.paymentMethodId,
            status: PrismaPaymentStatus.PENDING,
            statusDetail: 'pending_waiting_payment',
            payerEmail: dto.payer.email,
            payerName: payerName || null,
            payerDocument: dto.payer.identification?.number ?? null,
            payerDocumentType: dto.payer.identification?.type ?? null,
            metadata: this.toJson({
              ...((existingPayment.metadata as Record<string, unknown>) ?? {}),
              requestPayload,
              items: dto.items,
              payer: dto.payer,
              domain: dto.domain,
              entityId: dto.entityId,
              userId,
            }),
          },
        })
      : await this.prisma.payment.create({
          data: {
            userId,
            domain: this.toPrismaDomain(dto.domain),
            entityId: dto.entityId,
            externalReference,
            transactionAmount: dto.transactionAmount,
            installments: dto.installments,
            installmentAmount: dto.transactionAmount / dto.installments,
            paymentMethod,
            paymentMethodId: dto.paymentMethodId,
            paymentTypeId: dto.paymentMethodId,
            status: PrismaPaymentStatus.PENDING,
            statusDetail: 'pending_waiting_payment',
            idempotencyKey,
            payerEmail: dto.payer.email,
            payerName: payerName || null,
            payerDocument: dto.payer.identification?.number ?? null,
            payerDocumentType: dto.payer.identification?.type ?? null,
            binaryMode: false,
            captured: false,
            metadata: this.toJson({
              requestPayload,
              items: dto.items,
              payer: dto.payer,
              domain: dto.domain,
              entityId: dto.entityId,
              userId,
            }),
          },
        });

    try {
      const gatewayResponse = await this.httpService.post<MercadoPagoPaymentResponse>(
        '/v1/payments',
        requestPayload,
        idempotencyKey,
      );

      await this.prisma.payment.update({
        where: { id: paymentRecord.id },
        data: {
          externalId: gatewayResponse.id,
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
          pixQrCode:
            gatewayResponse.point_of_interaction?.transaction_data?.qr_code ?? null,
          pixQrCodeBase64:
            gatewayResponse.point_of_interaction?.transaction_data?.qr_code_base64 ??
            null,
          pixTicketUrl:
            gatewayResponse.point_of_interaction?.transaction_data?.ticket_url ?? null,
          dateApproved: gatewayResponse.date_approved
            ? new Date(gatewayResponse.date_approved)
            : null,
          moneyReleaseDate: gatewayResponse.money_release_date
            ? new Date(gatewayResponse.money_release_date)
            : null,
          captured: gatewayResponse.status === 'approved',
          metadata: this.toJson({
            ...((paymentRecord.metadata as Record<string, unknown>) ?? {}),
            gatewayResponse,
          }),
        },
      });

      this.emitPaymentEvents(paymentRecord.id, dto, gatewayResponse);
      return this.mapToPaymentResponse(gatewayResponse);
    } catch (error) {
      await this.prisma.payment.update({
        where: { id: paymentRecord.id },
        data: {
          status: PrismaPaymentStatus.FAILED,
          statusDetail: 'gateway_error',
          metadata: this.toJson({
            ...((paymentRecord.metadata as Record<string, unknown>) ?? {}),
            lastGatewayError:
              error instanceof Error ? error.message : 'Unknown error',
          }),
        },
      });
      this.loggerProvider.error(
        `Payment ${paymentRecord.id} failed after persistence`,
        error as Error,
      );
      if (error instanceof PaymentGatewayException) {
        throw error;
      }
      throw new PaymentGatewayException('Failed to create payment', 'PAYMENT_CREATE_FAILED');
    }
  }

  private validateBusinessRules(dto: CreatePaymentDto) {
    const rules = PAYMENT_DOMAIN_RULES[dto.domain];
    if (!rules) {
      throw new PaymentValidationException(
        `Unsupported payment domain "${dto.domain}"`,
        'UNSUPPORTED_PAYMENT_DOMAIN',
      );
    }

    const normalizedMethod = this.normalizeMethodForRules(dto.paymentMethodId);
    if (!rules.allowedMethods.includes(normalizedMethod as any)) {
      throw new PaymentMethodNotAllowedException(dto.domain, dto.paymentMethodId);
    }

    if (!rules.allowInstallments && dto.installments > 1) {
      throw new InstallmentNotAllowedException(dto.domain, dto.installments);
    }

    if (dto.installments > rules.maxInstallments) {
      throw new PaymentValidationException(
        `Installments exceed domain limit (${rules.maxInstallments})`,
        'INSTALLMENTS_LIMIT_EXCEEDED',
        { maxInstallments: rules.maxInstallments, installments: dto.installments },
      );
    }

    if (dto.installments > 1 && rules.allowInstallments) {
      if (
        rules.minValueForInstallments &&
        dto.transactionAmount < rules.minValueForInstallments
      ) {
        throw new MinValueForInstallmentsException(
          rules.minValueForInstallments,
          dto.transactionAmount,
        );
      }

      const installmentValue = dto.transactionAmount / dto.installments;
      if (rules.minInstallmentValue && installmentValue < rules.minInstallmentValue) {
        throw new MinInstallmentValueException(
          rules.minInstallmentValue,
          installmentValue,
        );
      }
    }
  }

  private buildMercadoPagoPayload(
    dto: CreatePaymentDto,
    userId: string,
    externalReference: string,
  ) {
    const notificationUrl =
      dto.notificationUrl ?? process.env.MERCADOPAGO_WEBHOOK_URL;

    return {
      transaction_amount: dto.transactionAmount,
      installments: dto.installments,
      payment_method_id: dto.paymentMethodId,
      token: dto.token,
      description: dto.description,
      external_reference: externalReference,
      notification_url: notificationUrl,
      payer: {
        email: dto.payer.email,
        first_name: dto.payer.firstName,
        last_name: dto.payer.lastName,
        identification: dto.payer.identification
          ? {
              type: dto.payer.identification.type,
              number: dto.payer.identification.number,
            }
          : undefined,
      },
      additional_info: {
        items: dto.items.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          picture_url: item.pictureUrl,
          category_id: item.categoryId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          type: item.type,
        })),
        payer: {
          first_name: dto.payer.firstName,
          last_name: dto.payer.lastName,
          phone: dto.payer.phone
            ? {
                area_code: dto.payer.phone.areaCode,
                number: dto.payer.phone.number,
              }
            : undefined,
          address: dto.payer.address
            ? {
                zip_code: dto.payer.address.zipCode,
                street_name: dto.payer.address.streetName,
                street_number: dto.payer.address.streetNumber,
              }
            : undefined,
        },
        shipments: {},
      },
      metadata: {
        domain: dto.domain,
        entityId: dto.entityId,
        userId,
        ...(dto.metadata ?? {}),
      },
    };
  }

  private emitPaymentEvents(
    paymentId: string,
    dto: CreatePaymentDto,
    gatewayResponse: MercadoPagoPaymentResponse,
  ) {
    const basePayload: BasePaymentEventPayload = {
      paymentId,
      externalPaymentId: gatewayResponse.id,
      domain: dto.domain,
      entityId: dto.entityId,
      timestamp: new Date(),
      triggeredBy: 'system',
    };

    const createdPayload: PaymentCreatedPayload = {
      ...basePayload,
      amount: dto.transactionAmount,
      paymentMethod: dto.paymentMethodId,
      installments: dto.installments,
      payer: {
        email: dto.payer.email,
        name: [dto.payer.firstName, dto.payer.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() || undefined,
      },
    };

    this.eventEmitter.emit(EventTypes.PAYMENT_CREATED, createdPayload);

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
    }
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

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private toPrismaDomain(domain: string): PrismaPaymentDomain {
    if (domain === 'sales') {
      return PrismaPaymentDomain.SALES;
    }
    if (domain === 'rental') {
      return PrismaPaymentDomain.RENTAL;
    }
    if (domain === 'event') {
      return PrismaPaymentDomain.EVENT;
    }
    return PrismaPaymentDomain.HOSTING;
  }

  private toPrismaMethod(paymentMethodId: string): PrismaPaymentMethod {
    const normalizedMethod = this.normalizeMethodForRules(paymentMethodId);
    if (normalizedMethod === 'debit_card') {
      return PrismaPaymentMethod.DEBIT_CARD;
    }
    if (normalizedMethod === 'pix') {
      return PrismaPaymentMethod.PIX;
    }
    return PrismaPaymentMethod.CREDIT_CARD;
  }

  private normalizeMethodForRules(paymentMethodId: string): string {
    if (paymentMethodId === 'pix') {
      return 'pix';
    }
    if (paymentMethodId === 'debit_card') {
      return 'debit_card';
    }
    if (paymentMethodId === 'credit_card') {
      return 'credit_card';
    }
    return 'credit_card';
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
