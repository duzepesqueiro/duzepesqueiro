import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { createHmac } from 'crypto';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';
import { MercadoPagoWebhookDto } from '../application/payment/dto';
import { PaymentAuthenticationException } from '../application/payment/exceptions';
import { GetPaymentService } from '../application/payment/services/get-payment.service';
import { PaymentWebhookService } from '../application/payment/services/payment-webhook.service';

type MockType<T> = {
  [P in keyof T]?: jest.Mock<unknown>;
};

describe('PaymentWebhookService', () => {
  let service: PaymentWebhookService;
  let prisma: {
    paymentWebhookLog: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    payment: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };
  let eventEmitter: MockType<EventEmitter2>;
  let configService: MockType<ConfigService>;
  let getPaymentService: MockType<GetPaymentService>;

  const payload: MercadoPagoWebhookDto = {
    action: 'payment.updated',
    data: { id: '1234' },
    type: 'payment',
    dateCreated: new Date(),
  };

  const signatureFor = (body: unknown, secret: string): string =>
    createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex');

  const drainBackground = async (): Promise<void> =>
    new Promise((resolve) => setImmediate(() => resolve()));

  beforeEach(async () => {
    prisma = {
      paymentWebhookLog: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      payment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'payment-local-id',
          userId: 'user-1',
          domain: 'SALES',
          entityId: 'order-1',
          transactionAmount: 100,
          status: 'PENDING',
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    eventEmitter = {
      emit: jest.fn(),
    };
    configService = {
      get: jest.fn().mockReturnValue('secret-123'),
    };
    getPaymentService = {
      execute: jest.fn().mockResolvedValue({
        id: 1234,
        dateCreated: new Date(),
        dateLastUpdated: new Date(),
        status: 'approved',
        statusDetail: 'accredited',
        currencyId: 'BRL',
        transactionAmount: 100,
        paymentMethodId: 'pix',
        paymentTypeId: 'bank_transfer',
        installments: 1,
        externalReference: 'sales_order-1',
        payer: { email: 'customer@example.com' },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentWebhookService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: ConfigService, useValue: configService },
        { provide: GetPaymentService, useValue: getPaymentService },
        { provide: Logger, useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } },
      ],
    }).compile();

    service = module.get(PaymentWebhookService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('processWebhook', () => {
    it('should validate signature', async () => {
      const signature = signatureFor(payload, 'secret-123');

      await service.processWebhook(signature, 'req-1', payload);

      expect(prisma.paymentWebhookLog.create).toHaveBeenCalled();
    });

    it('should reject invalid signature', async () => {
      await expect(
        service.processWebhook('invalid-signature', 'req-1', payload),
      ).rejects.toBeInstanceOf(PaymentAuthenticationException);
    });

    it('should be idempotent', async () => {
      (prisma.paymentWebhookLog.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing',
      });
      const signature = signatureFor(payload, 'secret-123');

      await service.processWebhook(signature, 'req-1', payload);

      expect(prisma.paymentWebhookLog.create).not.toHaveBeenCalled();
    });

    it('should update payment status', async () => {
      const signature = signatureFor(payload, 'secret-123');

      await service.processWebhook(signature, 'req-1', payload);
      await drainBackground();

      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'APPROVED',
          }),
        }),
      );
    });

    it('should emit correct events', async () => {
      const signature = signatureFor(payload, 'secret-123');

      await service.processWebhook(signature, 'req-1', payload);
      await drainBackground();

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'payment.webhook.received',
        expect.any(Object),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'payment.approved',
        expect.any(Object),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'order.paid',
        expect.any(Object),
      );
    });
  });
});
