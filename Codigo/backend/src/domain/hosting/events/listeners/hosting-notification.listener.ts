import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventTypes } from '../../../../shared/events/event-types';
import { HospedagemNotificationService } from '../../services';

@Injectable()
export class HostingNotificationListener {
  constructor(
    private readonly hospedagemNotificationService: HospedagemNotificationService,
  ) {}

  @OnEvent(EventTypes.HOSTING_PAID)
  async handleHostingPaid(event: { bookingId?: string; hostingId?: string }) {
    const reservaId = event.bookingId ?? event.hostingId;
    if (!reservaId) {
      return;
    }

    await this.hospedagemNotificationService.enviarConfirmacaoPagamento(reservaId);
  }
}
