import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentDomain,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { Preference } from 'mercadopago';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  IPaymentDomain,
  IPaymentMethod,
  IPaymentResponse,
} from '../interfaces';
import { MERCADO_PAGO_SDK_CLIENT } from '../providers/mercadopago';
import {
  CheckoutPreferenceResponseDto,
  PayerDto,
  PaymentItemDto,
} from '../dto';

type CreatePreferenceInput = {
  domain: IPaymentDomain;
  entityId: string;
  userId?: string;
  payer: PayerDto;
  items: PaymentItemDto[];
  paymentMethod?: IPaymentMethod;
  externalReference?: string;
  successUrl?: string;
  pendingUrl?: string;
  failureUrl?: string;
};

@Injectable()
export class PaymentService {
  constructor(
    @Inject(MERCADO_PAGO_SDK_CLIENT)
    private readonly mercadoPagoClient: ConstructorParameters<typeof Preference>[0],
    private readonly prisma: PrismaService,
  ) {}

  async createCheckoutPreference(
    input: CreatePreferenceInput,
  ): Promise<CheckoutPreferenceResponseDto> {
    const externalReference =
      input.externalReference ?? `${input.domain}_${input.entityId}`;
    const fallbackBaseUrl = this.resolveBaseUrl(
      process.env.FRONTEND_URL,
      'http://localhost:5173',
    );
    const successUrl = this.resolveBackUrl(
      input.successUrl,
      process.env.MERCADOPAGO_CHECKOUT_SUCCESS_URL,
      `${fallbackBaseUrl}/pagamento/sucesso`,
    );
    const pendingUrl = this.resolveBackUrl(
      input.pendingUrl,
      process.env.MERCADOPAGO_CHECKOUT_PENDING_URL,
      `${fallbackBaseUrl}/pagamento/pendente`,
    );
    const failureUrl = this.resolveBackUrl(
      input.failureUrl,
      process.env.MERCADOPAGO_CHECKOUT_FAILURE_URL,
      `${fallbackBaseUrl}/pagamento/falha`,
    );
    const preference = new Preference(this.mercadoPagoClient);

    let result: any;
    try {
      result = await preference.create({
        body: {
          external_reference: externalReference,
          payer: { email: input.payer.email },
          items: input.items.map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            currency_id: 'BRL',
          })),
          back_urls: {
            success: successUrl,
            pending: pendingUrl,
            failure: failureUrl,
          },
          auto_return: 'approved',
          notification_url: process.env.MERCADOPAGO_WEBHOOK_URL,
        },
      });
    } catch (error: any) {
      const cause = error?.cause ?? error;
      const status = cause?.status ?? cause?.response?.status;
      const responseData = cause?.response?.data ?? cause?.message ?? cause;

      if (status && status >= 400 && status < 500) {
        throw new BadRequestException({
          message: 'Mercado Pago rejeitou a criação da preferência',
          error: 'Bad Request',
          details: responseData,
        });
      }

      throw new BadGatewayException({
        message: 'Falha de comunicação com Mercado Pago ao criar preferência',
        details: responseData,
      });
    }
    const preferenceData = this.extractPreferenceData(result);
    if (!preferenceData.id) {
      throw new BadGatewayException(
        'Mercado Pago não retornou o ID da preferência',
      );
    }

    const totalAmount = input.items.reduce(
      (acc, item) => acc + item.unitPrice * item.quantity,
      0,
    );
    const resolvedUserId = await this.resolveUserId(input.userId, input.payer.email);
    const saved = await this.prisma.payment.upsert({
      where: { externalReference },
      create: {
        domain: this.toPrismaDomain(input.domain),
        entityId: input.entityId,
        externalReference,
        transactionAmount: new Prisma.Decimal(totalAmount),
        installments: 1,
        status: PaymentStatus.PENDING,
        paymentMethod: this.toPrismaMethod(input.paymentMethod),
        paymentMethodId: input.paymentMethod ?? IPaymentMethod.PIX,
        paymentTypeId: 'checkout_pro',
        payerEmail: input.payer.email,
        payerName: [input.payer.firstName, input.payer.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() || null,
        payerDocument: input.payer.identification?.number ?? null,
        payerDocumentType: input.payer.identification?.type ?? null,
        idempotencyKey: randomUUID(),
        userId: resolvedUserId,
        metadata: {
          checkoutPro: {
            preferenceId: String(preferenceData.id),
            initPoint: preferenceData.initPoint ?? null,
            sandboxInitPoint: preferenceData.sandboxInitPoint ?? null,
          },
        },
      },
      update: {
        status: PaymentStatus.PENDING,
        paymentMethod: this.toPrismaMethod(input.paymentMethod),
        paymentMethodId: input.paymentMethod ?? IPaymentMethod.PIX,
        paymentTypeId: 'checkout_pro',
        payerEmail: input.payer.email,
        payerName: [input.payer.firstName, input.payer.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() || null,
        metadata: {
          checkoutPro: {
            preferenceId: String(preferenceData.id),
            initPoint: preferenceData.initPoint ?? null,
            sandboxInitPoint: preferenceData.sandboxInitPoint ?? null,
          },
        },
      },
      select: { id: true },
    });

    return {
      id: String(preferenceData.id),
      preferenceId: String(preferenceData.id),
      initPoint: preferenceData.initPoint ?? preferenceData.sandboxInitPoint ?? '',
      externalReference,
      amount: totalAmount,
      currencyId: 'BRL',
      localPaymentId: saved.id,
    };
  }

  async refundByDomainEntity(
    domain: IPaymentDomain,
    entityId: string,
    reason?: string,
  ): Promise<void> {
    const payment = await this.prisma.payment.findFirst({
      where: { domain: this.toPrismaDomain(domain), entityId },
      orderBy: { dateLastUpdated: 'desc' },
    });

    if (!payment) {
      throw new Error('Payment not found for refund');
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.REFUNDED,
        statusDetail: reason ?? 'refunded_manually',
      },
    });
  }

  async cancelByDomainEntity(
    domain: IPaymentDomain,
    entityId: string,
    reason?: string,
  ): Promise<void> {
    const payment = await this.prisma.payment.findFirst({
      where: { domain: this.toPrismaDomain(domain), entityId },
      orderBy: { dateLastUpdated: 'desc' },
    });
    if (!payment) {
      throw new Error('Payment not found for cancellation');
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.CANCELLED,
        statusDetail: reason ?? 'cancelled_manually',
      },
    });
  }

  async getByDomainEntity(
    domain: IPaymentDomain,
    entityId: string,
  ): Promise<IPaymentResponse | null> {
    const payment = await this.prisma.payment.findFirst({
      where: { domain: this.toPrismaDomain(domain), entityId },
      orderBy: { dateLastUpdated: 'desc' },
    });
    if (!payment) {
      return null;
    }

    return {
      id: payment.externalId ?? payment.id,
      externalReference: payment.externalReference,
      transactionAmount: Number(payment.transactionAmount),
      currencyId: 'BRL',
      status: payment.status,
      paymentMethodId: payment.paymentMethodId ?? undefined,
      payer: { email: payment.payerEmail },
      dateApproved: payment.dateApproved ?? undefined,
      pointOfInteraction: {
        ticketUrl: payment.pixTicketUrl ?? undefined,
        qrCode: payment.pixQrCode ?? undefined,
        qrCodeBase64: payment.pixQrCodeBase64 ?? undefined,
      },
    };
  }

  toPublicPaymentResponse(data: {
    id: string | number;
    externalReference: string;
    amount: number;
    initPoint?: string;
  }): IPaymentResponse {
    return {
      id: data.id,
      externalReference: data.externalReference,
      transactionAmount: data.amount,
      currencyId: 'BRL',
      pointOfInteraction: {
        ticketUrl: data.initPoint,
      },
    };
  }

  private toPrismaDomain(domain: IPaymentDomain): PaymentDomain {
    if (domain === IPaymentDomain.SALES) return PaymentDomain.SALES;
    if (domain === IPaymentDomain.RENTAL) return PaymentDomain.RENTAL;
    if (domain === IPaymentDomain.EVENT) return PaymentDomain.EVENT;
    return PaymentDomain.HOSTING;
  }

  private toPrismaMethod(method?: IPaymentMethod): PaymentMethod {
    if (method === IPaymentMethod.CREDIT) return PaymentMethod.CREDIT_CARD;
    if (method === IPaymentMethod.DEBIT) return PaymentMethod.DEBIT_CARD;
    return PaymentMethod.PIX;
  }

  private async resolveUserId(
    userId: string | undefined,
    payerEmail: string,
  ): Promise<string> {
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (!user) {
        throw new BadRequestException(
          'userId informado não existe na base de dados',
        );
      }
      return userId;
    }

    const userByEmail = await this.prisma.user.findFirst({
      where: {
        emails: {
          some: {
            email: payerEmail,
          },
        },
      },
      select: { id: true },
    });
    if (userByEmail) {
      return userByEmail.id;
    }

    const fallbackUser = await this.prisma.user.findFirst({
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!fallbackUser) {
      throw new Error(
        'No user available to associate payment record. Create at least one user first.',
      );
    }
    return fallbackUser.id;
  }

  private extractPreferenceData(result: any): {
    id?: string | number;
    initPoint?: string;
    sandboxInitPoint?: string;
  } {
    const payload = result?.response ?? result ?? {};
    return {
      id: payload.id,
      initPoint: payload.init_point,
      sandboxInitPoint: payload.sandbox_init_point,
    };
  }

  private resolveBackUrl(
    first?: string,
    second?: string,
    fallback?: string,
  ): string {
    const candidates = [first, second, fallback]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value));

    const valid = candidates.find((value) => this.isHttpUrl(value));
    if (valid) {
      return valid;
    }

    throw new BadRequestException(
      'URLs de retorno inválidas. Configure back_urls válidas (success, pending, failure).',
    );
  }

  private resolveBaseUrl(value: string | undefined, fallback: string): string {
    const candidate = value?.trim();
    if (candidate && this.isHttpUrl(candidate)) {
      return candidate.replace(/\/+$/, '');
    }
    return fallback;
  }

  private isHttpUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
