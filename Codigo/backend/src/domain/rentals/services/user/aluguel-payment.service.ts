import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentItemDto, PayerDto } from '../../../../application/payment/dto';
import { IPaymentDomain, IPaymentMethod } from '../../../../application/payment/interfaces';
import { PaymentFacadeService } from '../../../../application/payment/services';
import { LogsService } from '../../../../application/logs/services';
import { AluguelEventName } from '../../events';
import { AluguelRepository } from '../../repositories';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AluguelPaymentService {
  constructor(
    private readonly aluguelRepository: AluguelRepository,
    private readonly paymentFacadeService: PaymentFacadeService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logsService: LogsService,
  ) {}

  async createPayment(aluguelId: string, userId: string) {
    const aluguel = await this.aluguelRepository.findById(aluguelId);
    if (!aluguel || aluguel.userId !== userId) {
      throw new NotFoundException('Aluguel não encontrado');
    }

    const payer: PayerDto = {
      email: 'cliente@exemplo.com',
      firstName: 'Cliente',
      lastName: 'Duze',
      identification: {
        type: 'CPF',
        number: '00000000000',
      },
    };

    const items: PaymentItemDto[] = [
      {
        id: aluguel.id,
        title: `Aluguel ${aluguel.id}`,
        description: 'Pagamento de aluguel',
        quantity: 1,
        unitPrice: aluguel.totalAmount,
      },
    ];

    const payment = await this.paymentFacadeService.createRentalPayment(
      aluguel.id,
      aluguel.totalAmount,
      IPaymentMethod.PIX,
      payer,
      items,
    );

    this.eventEmitter.emit(AluguelEventName.PAID, {
      aluguelId: aluguel.id,
      userId: aluguel.userId,
      amount: aluguel.totalAmount,
      domain: IPaymentDomain.RENTAL,
      paymentId: payment.id,
    });

    void this.logsService.info(
      'rental',
      'RentalPaymentCreated',
      { aluguelId: aluguel.id, paymentId: payment.id, userId },
      aluguel.id,
    );

    return payment;
  }
}
