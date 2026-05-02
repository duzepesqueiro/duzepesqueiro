import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { IPaymentResponse } from '../interfaces';

@Injectable()
export class GetPaymentService {
  constructor(private readonly prisma: PrismaService) {}

  async getByExternalReference(externalReference: string): Promise<IPaymentResponse> {
    const payment = await this.prisma.payment.findUnique({
      where: { externalReference },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado');
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
}
