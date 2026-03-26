import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { App } from 'supertest/types';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { RolesGuard } from '../src/application/auth/guards/roles.guard';
import { JwtAuthGuard } from '../src/application/auth/guards/jwt-auth.guard';
import { PaymentNotFoundException } from '../src/application/payment/exceptions';
import { MercadoPagoHttpService } from '../src/application/payment/providers/mercadopago';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';

describe('Payment API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: any;
  let jwtToken: string;
  let adminToken: string;
  let createdExternalId: number;
  let webhookCreateCalls = 0;

  const gatewayPayments = new Map<number, any>();
  let seq = 1000;

  const toGatewayPayment = (overrides?: Partial<Record<string, unknown>>) => ({
    id: 0,
    date_created: new Date().toISOString(),
    date_last_updated: new Date().toISOString(),
    status: 'pending',
    status_detail: 'pending_waiting_payment',
    currency_id: 'BRL',
    transaction_amount: 1000,
    payment_method_id: 'pix',
    payment_type_id: 'bank_transfer',
    installments: 1,
    external_reference: 'sales_order-e2e',
    payer: { email: 'e2e@example.com' },
    point_of_interaction: {
      type: 'PIX',
      transaction_data: {
        qr_code: 'qr-e2e',
        qr_code_base64: 'qr-base64-e2e',
        ticket_url: 'https://ticket-e2e',
      },
    },
    ...overrides,
  });

  const mockMercadoPagoService = {
    post: jest.fn(async (endpoint: string, data: any) => {
      if (endpoint !== '/v1/payments') {
        throw new Error('Unsupported endpoint');
      }
      const id = ++seq;
      const payment = toGatewayPayment({
        id,
        external_reference: data.external_reference,
        transaction_amount: data.transaction_amount,
        installments: data.installments,
        payment_method_id: data.payment_method_id,
      });
      gatewayPayments.set(id, payment);
      return payment;
    }),
    get: jest.fn(async (endpoint: string, params?: any) => {
      if (endpoint === '/v1/payments/search') {
        let results = Array.from(gatewayPayments.values());
        if (params?.status) {
          results = results.filter((item) => item.status === params.status);
        }
        if (params?.external_reference) {
          results = results.filter(
            (item) => item.external_reference === params.external_reference,
          );
        }
        return {
          paging: {
            total: results.length,
            limit: params?.limit ?? 30,
            offset: params?.offset ?? 0,
          },
          results,
        };
      }

      const id = Number(endpoint.split('/').pop());
      const payment = gatewayPayments.get(id);
      if (!payment) {
        throw new PaymentNotFoundException(String(id));
      }
      return payment;
    }),
    put: jest.fn(async (endpoint: string, data: any) => {
      const id = Number(endpoint.split('/').pop());
      const current = gatewayPayments.get(id);
      if (!current) {
        const error: any = new Error('Payment not found');
        error.response = { status: 404 };
        throw error;
      }
      const updated = {
        ...current,
        status: data.status ?? (data.capture ? 'approved' : current.status),
        date_approved:
          data.capture || data.status === 'approved'
            ? new Date().toISOString()
            : current.date_approved,
        date_last_updated: new Date().toISOString(),
      };
      gatewayPayments.set(id, updated);
      return updated;
    }),
  };

  beforeAll(async () => {
    process.env.MERCADOPAGO_WEBHOOK_SECRET = 'secret-e2e';
    process.env.MERCADOPAGO_ACCESS_TOKEN = 'access-token-e2e';
    process.env.MERCADOPAGO_PUBLIC_KEY = 'public-key-e2e';
    process.env.MERCADOPAGO_CLIENT_ID = 'client-id-e2e';
    process.env.MERCADOPAGO_CLIENT_SECRET = 'client-secret-e2e';
    jwtToken = 'token-user';
    adminToken = 'token-admin';

    const paymentStore: any[] = [];
    const webhookLogStore: any[] = [];

    prisma = {
      payment: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (where?.id) {
            return paymentStore.find((p) => p.id === where.id) ?? null;
          }
          if (where?.externalReference) {
            return (
              paymentStore.find((p) => p.externalReference === where.externalReference) ??
              null
            );
          }
          return null;
        }),
        findFirst: jest.fn(async ({ where, orderBy }: any) => {
          let list = [...paymentStore];
          if (where?.externalReference) {
            list = list.filter((p) => p.externalReference === where.externalReference);
          }
          if (where?.externalId !== undefined) {
            list = list.filter((p) => p.externalId === where.externalId);
          }
          if (where?.domain) {
            list = list.filter((p) => p.domain === where.domain);
          }
          if (where?.entityId) {
            list = list.filter((p) => p.entityId === where.entityId);
          }
          if (orderBy?.dateLastUpdated === 'desc') {
            list.sort((a, b) => b.dateLastUpdated.getTime() - a.dateLastUpdated.getTime());
          }
          return list[0] ?? null;
        }),
        findMany: jest.fn(async ({ where }: any) => {
          if (where?.externalId?.in) {
            return paymentStore.filter((p) => where.externalId.in.includes(p.externalId));
          }
          return paymentStore;
        }),
        create: jest.fn(async ({ data }: any) => {
          const row = {
            id: `payment-${paymentStore.length + 1}`,
            externalId: null,
            domain: data.domain,
            entityId: data.entityId,
            externalReference: data.externalReference,
            transactionAmount: data.transactionAmount,
            netReceivedAmount: null,
            installments: data.installments,
            installmentAmount: data.installmentAmount ?? null,
            status: data.status,
            statusDetail: data.statusDetail ?? null,
            paymentMethod: data.paymentMethod,
            paymentMethodId: data.paymentMethodId ?? null,
            paymentTypeId: data.paymentTypeId ?? null,
            issuerId: data.issuerId ?? null,
            payerEmail: data.payerEmail,
            payerName: data.payerName ?? null,
            payerDocument: data.payerDocument ?? null,
            payerDocumentType: data.payerDocumentType ?? null,
            pixQrCode: null,
            pixQrCodeBase64: null,
            pixTicketUrl: null,
            idempotencyKey: data.idempotencyKey,
            captured: data.captured ?? false,
            binaryMode: data.binaryMode ?? false,
            metadata: data.metadata ?? null,
            dateCreated: new Date(),
            dateApproved: null,
            dateLastUpdated: new Date(),
            dateOfExpiration: null,
            moneyReleaseDate: null,
            userId: data.userId,
          };
          paymentStore.push(row);
          return row;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const idx = paymentStore.findIndex((p) => p.id === where.id);
          if (idx < 0) {
            throw new Error('Payment not found');
          }
          paymentStore[idx] = {
            ...paymentStore[idx],
            ...data,
            dateLastUpdated: new Date(),
          };
          return paymentStore[idx];
        }),
      },
      paymentWebhookLog: {
        findUnique: jest.fn(async ({ where }: any) => {
          return webhookLogStore.find((w) => w.requestId === where.requestId) ?? null;
        }),
        create: jest.fn(async ({ data }: any) => {
          webhookCreateCalls += 1;
          const row = {
            id: `wh-${webhookLogStore.length + 1}`,
            ...data,
            processedAt: new Date(),
          };
          webhookLogStore.push(row);
          return row;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const idx = webhookLogStore.findIndex((w) => w.id === where.id);
          webhookLogStore[idx] = { ...webhookLogStore[idx], ...data };
          return webhookLogStore[idx];
        }),
      },
      userEmail: {
        findUnique: jest.fn(async () => ({ userId: 'user-1' })),
      },
      user: {
        findFirst: jest.fn(async () => ({ id: 'user-1', isActive: true })),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MercadoPagoHttpService)
      .useValue(mockMercadoPagoService)
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          const auth = req.headers.authorization;
          if (!auth) {
            throw new UnauthorizedException();
          }
          if (auth === `Bearer ${adminToken}`) {
            req.user = { id: 'admin-1', role: 'ADMIN' };
            return true;
          }
          if (auth === `Bearer ${jwtToken}`) {
            req.user = { id: 'user-1', role: 'CUSTOMER' };
            return true;
          }
          throw new UnauthorizedException();
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          if (
            req.method === 'PUT' ||
            req.url.endsWith('/capture')
          ) {
            return req.user?.role === 'ADMIN';
          }
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  describe('POST /payments', () => {
    const validPaymentDto = {
      domain: 'sales',
      entityId: 'order-e2e',
      transactionAmount: 1000,
      installments: 1,
      paymentMethodId: 'pix',
      payer: {
        email: 'e2e@example.com',
      },
      items: [
        {
          id: 'item-e2e',
          title: 'Produto E2E',
          quantity: 1,
          unitPrice: 1000,
        },
      ],
      externalReference: 'sales_order-e2e',
    };

    it('should create a payment successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send(validPaymentDto)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('pending');
      createdExternalId = res.body.id;
    });

    it('should return 400 for invalid data', async () => {
      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          ...validPaymentDto,
          installments: 13,
        })
        .expect(400);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).post('/payments').send(validPaymentDto).expect(401);
    });

    it('should return 400 for invalid payment method', async () => {
      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          ...validPaymentDto,
          paymentMethodId: 'boleto',
        })
        .expect(400);
    });
  });

  describe('GET /payments/search', () => {
    it('should return paginated results', async () => {
      const res = await request(app.getHttpServer())
        .get('/payments/search')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('paging');
      expect(Array.isArray(res.body.results)).toBe(true);
    });

    it('should filter by date range', async () => {
      const begin = new Date(Date.now() - 86400000).toISOString();
      const end = new Date().toISOString();
      await request(app.getHttpServer())
        .get('/payments/search')
        .query({ beginDate: begin, endDate: end })
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);
    });

    it('should filter by status', async () => {
      const res = await request(app.getHttpServer())
        .get('/payments/search')
        .query({ status: 'pending' })
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(res.body.results.every((item: any) => item.status === 'pending')).toBe(
        true,
      );
    });
  });

  describe('GET /payments/:id', () => {
    it('should return payment details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/payments/${createdExternalId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(res.body.id).toBe(createdExternalId);
    });

    it('should return 404 for non-existent payment', async () => {
      await request(app.getHttpServer())
        .get('/payments/999999')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(404);
    });
  });

  describe('PUT /payments/:id', () => {
    it('should update payment status', async () => {
      const res = await request(app.getHttpServer())
        .put(`/payments/${createdExternalId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'cancelled' })
        .expect(200);

      expect(res.body.status).toBe('cancelled');
    });

    it('should return 403 for non-admin user', async () => {
      await request(app.getHttpServer())
        .put(`/payments/${createdExternalId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ status: 'cancelled' })
        .expect(403);
    });
  });

  describe('POST /payments/webhook/mercadopago', () => {
    const webhookPayload = () => ({
      action: 'payment.updated',
      data: { id: String(createdExternalId) },
      type: 'payment',
      dateCreated: new Date().toISOString(),
    });

    const sign = (body: any) =>
      require('crypto')
        .createHmac('sha256', 'secret-e2e')
        .update(JSON.stringify(body))
        .digest('hex');

    it('should process valid webhook', async () => {
      const payload = webhookPayload();
      await request(app.getHttpServer())
        .post('/payments/webhook/mercadopago')
        .set('x-request-id', 'wh-1')
        .set('x-signature', sign(payload))
        .send(payload)
        .expect(200);
    });

    it('should reject invalid signature', async () => {
      const payload = webhookPayload();
      await request(app.getHttpServer())
        .post('/payments/webhook/mercadopago')
        .set('x-request-id', 'wh-2')
        .set('x-signature', 'invalid')
        .send(payload)
        .expect(401);
    });

    it('should be idempotent', async () => {
      const payload = webhookPayload();
      const before = webhookCreateCalls;
      await request(app.getHttpServer())
        .post('/payments/webhook/mercadopago')
        .set('x-request-id', 'wh-3')
        .set('x-signature', sign(payload))
        .send(payload)
        .expect(200);
      await request(app.getHttpServer())
        .post('/payments/webhook/mercadopago')
        .set('x-request-id', 'wh-3')
        .set('x-signature', sign(payload))
        .send(payload)
        .expect(200);

      expect(webhookCreateCalls).toBe(before + 1);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
