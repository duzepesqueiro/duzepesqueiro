import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';
import { CreatePaymentDto } from '../application/payment/dto';
import {
  InstallmentNotAllowedException,
  MinInstallmentValueException,
  MinValueForInstallmentsException,
  PaymentGatewayException,
  PaymentRateLimitException,
  PaymentTimeoutException,
  PaymentValidationException,
} from '../application/payment/exceptions';
import { IPaymentDomain, IPaymentMethod } from '../application/payment/interfaces';
import { MercadoPagoHttpService } from '../application/payment/providers/mercadopago';
import { CreatePaymentService } from '../application/payment/services/create-payment.service';

type MockType<T> = {
  [P in keyof T]?: jest.Mock<unknown>;
};

describe('CreatePaymentService', () => {
  let service: CreatePaymentService;
  let httpService: MockType<MercadoPagoHttpService>;
  let prisma: {
    payment: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let eventEmitter: MockType<EventEmitter2>;

  const baseDto = (): CreatePaymentDto => ({
    domain: IPaymentDomain.SALES,
    entityId: 'order-1',
    transactionAmount: 1000,
    installments: 2,
    paymentMethodId: IPaymentMethod.CREDIT,
    token: 'token-123',
    payer: {
      email: 'customer@example.com',
      firstName: 'John',
      lastName: 'Doe',
      identification: { type: 'CPF', number: '12345678901' },
    },
    items: [
      {
        id: 'item-1',
        title: 'Produto',
        quantity: 1,
        unitPrice: 1000,
      },
    ],
    description: 'Pagamento teste',
    externalReference: 'sales_order-1',
  });

  const mpResponse = (overrides?: Partial<Record<string, unknown>>) => ({
    id: 1234,
    date_created: new Date().toISOString(),
    date_last_updated: new Date().toISOString(),
    status: 'pending',
    status_detail: 'pending_waiting_payment',
    currency_id: 'BRL',
    transaction_amount: 1000,
    payment_method_id: 'pix',
    payment_type_id: 'bank_transfer',
    installments: 1,
    external_reference: 'sales_order-1',
    payer: {
      email: 'customer@example.com',
    },
    point_of_interaction: {
      type: 'PIX',
      transaction_data: {
        qr_code: 'qr-code-value',
        qr_code_base64: 'qr-code-base64',
        ticket_url: 'https://ticket-url',
      },
    },
    ...overrides,
  });

  beforeEach(async () => {
    httpService = {
      post: jest.fn(),
      get: jest.fn(),
    };
    prisma = {
      payment: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'payment-id-1',
          metadata: null,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatePaymentService,
        { provide: MercadoPagoHttpService, useValue: httpService },
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: Logger, useValue: { error: jest.fn(), log: jest.fn() } },
      ],
    }).compile();

    service = module.get(CreatePaymentService);
  });

  describe('execute', () => {
    describe('Domain Rules - SALES', () => {
      it('should allow credit card payment with installments', async () => {
        (httpService.post as jest.Mock).mockResolvedValue(mpResponse());

        const result = await service.execute(baseDto(), 'user-1');

        expect(result.id).toBe(1234);
        expect(httpService.post).toHaveBeenCalled();
      });

      it('should reject installments below minimum value', async () => {
        const dto = baseDto();
        dto.transactionAmount = 150;
        dto.installments = 4;

        await expect(service.execute(dto, 'user-1')).rejects.toBeInstanceOf(
          MinInstallmentValueException,
        );
      });

      it('should reject installments for amount below threshold', async () => {
        const dto = baseDto();
        dto.transactionAmount = 80;
        dto.installments = 2;

        await expect(service.execute(dto, 'user-1')).rejects.toBeInstanceOf(
          MinValueForInstallmentsException,
        );
      });

      it('should allow PIX payment', async () => {
        const dto = baseDto();
        dto.paymentMethodId = IPaymentMethod.PIX;
        dto.installments = 1;
        (httpService.post as jest.Mock).mockResolvedValue(mpResponse());

        await service.execute(dto, 'user-1');

        expect(httpService.post).toHaveBeenCalled();
      });
    });

    describe('Domain Rules - RENTAL', () => {
      it('should only allow single installment', async () => {
        const dto = baseDto();
        dto.domain = IPaymentDomain.RENTAL;
        dto.installments = 1;
        (httpService.post as jest.Mock).mockResolvedValue(mpResponse());

        await expect(service.execute(dto, 'user-1')).resolves.toBeDefined();
      });

      it('should reject multiple installments', async () => {
        const dto = baseDto();
        dto.domain = IPaymentDomain.RENTAL;
        dto.installments = 2;

        await expect(service.execute(dto, 'user-1')).rejects.toBeInstanceOf(
          InstallmentNotAllowedException,
        );
      });

      it('should allow debit card', async () => {
        const dto = baseDto();
        dto.domain = IPaymentDomain.RENTAL;
        dto.paymentMethodId = IPaymentMethod.DEBIT;
        dto.installments = 1;
        (httpService.post as jest.Mock).mockResolvedValue(mpResponse());

        await expect(service.execute(dto, 'user-1')).resolves.toBeDefined();
      });
    });

    describe('Domain Rules - HOSTING', () => {
      it('should only allow single installment', async () => {
        const dto = baseDto();
        dto.domain = IPaymentDomain.HOSTING;
        dto.installments = 1;
        (httpService.post as jest.Mock).mockResolvedValue(mpResponse());

        await expect(service.execute(dto, 'user-1')).resolves.toBeDefined();
      });

      it('should allow all payment methods', async () => {
        const dtoCredit = baseDto();
        dtoCredit.domain = IPaymentDomain.HOSTING;
        dtoCredit.installments = 1;
        dtoCredit.paymentMethodId = IPaymentMethod.CREDIT;
        const dtoDebit = { ...dtoCredit, paymentMethodId: IPaymentMethod.DEBIT };
        const dtoPix = { ...dtoCredit, paymentMethodId: IPaymentMethod.PIX };
        (httpService.post as jest.Mock).mockResolvedValue(mpResponse());

        await expect(service.execute(dtoCredit, 'user-1')).resolves.toBeDefined();
        await expect(service.execute(dtoDebit, 'user-1')).resolves.toBeDefined();
        await expect(service.execute(dtoPix, 'user-1')).resolves.toBeDefined();
      });
    });

    describe('Mercado Pago Integration', () => {
      it('should send correct payload to MP', async () => {
        (httpService.post as jest.Mock).mockResolvedValue(mpResponse());

        await service.execute(baseDto(), 'user-1');

        const [, payload] = (httpService.post as jest.Mock).mock.calls[0];
        expect(payload.external_reference).toBe('sales_order-1');
        expect(payload.metadata.domain).toBe('sales');
      });

      it('should include idempotency key', async () => {
        (httpService.post as jest.Mock).mockResolvedValue(mpResponse());

        await service.execute(baseDto(), 'user-1');

        const [, , idempotencyKey] = (httpService.post as jest.Mock).mock.calls[0];
        expect(typeof idempotencyKey).toBe('string');
        expect(idempotencyKey.length).toBeGreaterThan(0);
      });

      it('should handle timeout error', async () => {
        (httpService.post as jest.Mock).mockRejectedValue(
          new PaymentTimeoutException(),
        );

        await expect(service.execute(baseDto(), 'user-1')).rejects.toBeInstanceOf(
          PaymentTimeoutException,
        );
      });

      it('should handle rate limit error', async () => {
        (httpService.post as jest.Mock).mockRejectedValue(
          new PaymentRateLimitException(),
        );

        await expect(service.execute(baseDto(), 'user-1')).rejects.toBeInstanceOf(
          PaymentRateLimitException,
        );
      });

      it('should handle validation error', async () => {
        (httpService.post as jest.Mock).mockRejectedValue(
          new PaymentValidationException('invalid payload', 'PAYMENT_INVALID'),
        );

        await expect(service.execute(baseDto(), 'user-1')).rejects.toBeInstanceOf(
          PaymentGatewayException,
        );
      });
    });

    describe('PIX Payment', () => {
      it('should return QR code data', async () => {
        (httpService.post as jest.Mock).mockResolvedValue(mpResponse());

        const result = await service.execute(baseDto(), 'user-1');

        expect(result.pointOfInteraction?.qrCode).toBe('qr-code-value');
        expect(result.pointOfInteraction?.ticketUrl).toBe('https://ticket-url');
      });

      it('should persist PIX data locally', async () => {
        (httpService.post as jest.Mock).mockResolvedValue(mpResponse());

        await service.execute(baseDto(), 'user-1');

        const updateCalls = prisma.payment.update.mock.calls;
        const finalUpdate = updateCalls[updateCalls.length - 1][0];
        expect(finalUpdate.data.pixQrCode).toBe('qr-code-value');
        expect(finalUpdate.data.pixQrCodeBase64).toBe('qr-code-base64');
      });
    });

    describe('Events', () => {
      it('should emit PAYMENT_CREATED event', async () => {
        (httpService.post as jest.Mock).mockResolvedValue(mpResponse());

        await service.execute(baseDto(), 'user-1');

        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'payment.created',
          expect.any(Object),
        );
      });

      it('should emit PAYMENT_APPROVED for binary mode', async () => {
        (httpService.post as jest.Mock).mockResolvedValue(
          mpResponse({
            status: 'approved',
            date_approved: new Date().toISOString(),
            transaction_details: {
              net_received_amount: 950,
              total_paid_amount: 1000,
              overpaid_amount: 0,
              installment_amount: 1000,
            },
          }),
        );

        await service.execute(baseDto(), 'user-1');

        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'payment.approved',
          expect.any(Object),
        );
      });
    });
  });
});
