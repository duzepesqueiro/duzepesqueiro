import { Injectable, NotFoundException } from '@nestjs/common';
import { IPaymentDomain, IPaymentMethod, IPaymentResponse } from '../interfaces';
import { PayerDto, PaymentItemDto } from '../dto';
import { PaymentService } from './payment.service';

@Injectable()
export class PaymentFacadeService {
  constructor(private readonly paymentService: PaymentService) {}

  async createEventPayment(
    entityId: string,
    amount: number,
    paymentMethod: IPaymentMethod,
    payer: PayerDto,
    items: PaymentItemDto[],
  ): Promise<IPaymentResponse> {
    return this.createByDomain(
      IPaymentDomain.EVENT,
      entityId,
      amount,
      paymentMethod,
      payer,
      items,
    );
  }

  async createRentalPayment(
    entityId: string,
    amount: number,
    paymentMethod: IPaymentMethod,
    payer: PayerDto,
    items: PaymentItemDto[],
  ): Promise<IPaymentResponse> {
    return this.createByDomain(
      IPaymentDomain.RENTAL,
      entityId,
      amount,
      paymentMethod,
      payer,
      items,
    );
  }

  async createHostingPayment(
    entityId: string,
    amount: number,
    paymentMethod: IPaymentMethod,
    payer: PayerDto,
    items: PaymentItemDto[],
  ): Promise<IPaymentResponse> {
    return this.createByDomain(
      IPaymentDomain.HOSTING,
      entityId,
      amount,
      paymentMethod,
      payer,
      items,
    );
  }

  async refundPayment(
    domain: IPaymentDomain,
    entityId: string,
    reason?: string,
  ): Promise<void> {
    try {
      await this.paymentService.refundByDomainEntity(domain, entityId, reason);
    } catch {
      throw new NotFoundException('Pagamento não encontrado para estorno');
    }
  }

  async cancelPayment(
    domain: IPaymentDomain,
    entityId: string,
    reason?: string,
  ): Promise<void> {
    try {
      await this.paymentService.cancelByDomainEntity(domain, entityId, reason);
    } catch {
      throw new NotFoundException('Pagamento não encontrado para cancelamento');
    }
  }

  async checkPaymentStatus(
    domain: IPaymentDomain,
    entityId: string,
  ): Promise<IPaymentResponse | null> {
    return this.paymentService.getByDomainEntity(domain, entityId);
  }

  private async createByDomain(
    domain: IPaymentDomain,
    entityId: string,
    amount: number,
    paymentMethod: IPaymentMethod,
    payer: PayerDto,
    items: PaymentItemDto[],
  ): Promise<IPaymentResponse> {
    const pref = await this.paymentService.createCheckoutPreference({
      domain,
      entityId,
      payer,
      items,
      paymentMethod,
      externalReference: `${domain}_${entityId}`,
    });

    return this.paymentService.toPublicPaymentResponse({
      id: pref.preferenceId,
      externalReference: pref.externalReference,
      amount,
      initPoint: pref.initPoint,
    });
  }
}
