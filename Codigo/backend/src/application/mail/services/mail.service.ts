import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { OnEvent } from '@nestjs/event-emitter';
import { EventTypes } from '../../../shared/events/event-types';
import {
  UserActivatedPayload,
  UserRegisteredPayload,
} from '../../../shared/events/event-payloads';
import { LogsService } from '../../logs/services';
import {
  EventBookingConfirmationMailPayload,
  HostingBookedMailPayload,
  HostingBookedCompanyMailPayload,
  HostingCancellationMailPayload,
  HostingCheckinMailPayload,
  HostingCheckoutMailPayload,
  HostingCompletedMailPayload,
  HostingNoShowMailPayload,
  HostingPaymentConfirmedMailPayload,
  HostingPaymentReminderMailPayload,
  HostingReminder1DayMailPayload,
  HostingVoucherMailPayload,
  OrderConfirmationMailPayload,
  ProductLifecycleNotificationMailPayload,
  ProductPurchaseConfirmationMailPayload,
  RentalConfirmationMailPayload,
  ReviewPublishedMailPayload,
} from '../interfaces/mail-template-payloads.interface';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private mailerService: MailerService,
    private readonly logsService: LogsService,
  ) {}

  private toErrorMetadata(error: unknown): { message: string; stack?: string } {
    if (error instanceof Error) {
      return { message: error.message, stack: error.stack };
    }
    return { message: String(error) };
  }

  private async sendTemplatedEmail(
    params: {
      to: string;
      subject: string;
      template: string;
      context: Record<string, unknown>;
      event: string;
      metadata?: Record<string, unknown>;
    },
    rethrow = false,
  ): Promise<void> {
    const { to, subject, template, context, event, metadata } = params;
    this.logger.log(`[${event}] Iniciando envio de e-mail para ${to}`);
    void this.logsService.info('mail', `${event}Started`, {
      to,
      subject,
      template,
      ...(metadata ?? {}),
    });

    try {
      await this.mailerService.sendMail({
        to,
        subject,
        template,
        context,
      });
      this.logger.log(`[${event}] E-mail enviado para ${to}`);
      void this.logsService.info('mail', `${event}Sent`, {
        to,
        subject,
        template,
        ...(metadata ?? {}),
      });
    } catch (error) {
      const errorMeta = this.toErrorMetadata(error);
      this.logger.error(
        `[${event}] Falha ao enviar e-mail para ${to}: ${errorMeta.message}`,
        errorMeta.stack,
      );
      void this.logsService.error('mail', `${event}Failed`, {
        to,
        subject,
        template,
        ...(metadata ?? {}),
        error: errorMeta.message,
        stack: errorMeta.stack,
      });
      if (rethrow) {
        throw error;
      }
    }
  }

  @OnEvent(EventTypes.USER_REGISTERED)
  async handleUserRegistered(payload: UserRegisteredPayload) {
    if (payload.requiresEmailConfirmation) {
      await this.sendWelcomeEmail(
        payload.email,
        payload.name,
        payload.confirmationCode,
      );
    }
  }

  @OnEvent(EventTypes.USER_ACTIVATED)
  async handleUserActivated(payload: UserActivatedPayload) {
    await this.sendAccountVerifiedEmail(payload.email, payload.name);
  }

  async sendWelcomeEmail(email: string, name: string, confirmationCode: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Bem-vindo ao DuZePesqueiro!',
        template: 'welcome',
        context: {
          name,
          confirmationCode,
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`Welcome email sent to ${email}`);
      void this.logsService.info('mail', 'WelcomeEmailSent', { email, name });
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}`, error);
      void this.logsService.error('mail', 'WelcomeEmailFailed', {
        email,
        name,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  async sendAccountVerifiedEmail(email: string, name: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Conta verificada com sucesso - DuZePesqueiro',
        template: 'account-verified',
        context: {
          name,
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`Account verified email sent to ${email}`);
      void this.logsService.info('mail', 'AccountVerifiedEmailSent', { email, name });
    } catch (error) {
      this.logger.error(
        `Failed to send account verified email to ${email}`,
        error,
      );
      void this.logsService.error('mail', 'AccountVerifiedEmailFailed', {
        email,
        name,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  async sendPasswordResetCodeEmail(
    email: string,
    name: string,
    resetCode: string,
    expiresInMinutes: number,
  ) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Recuperação de Senha - DuZePesqueiro',
        template: 'reset-password',
        context: {
          name,
          resetCode,
          expiresInMinutes,
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`Password reset code email sent to ${email}`);
      void this.logsService.info('mail', 'PasswordResetCodeEmailSent', { email, name });
    } catch (error) {
      this.logger.error(`Failed to send password reset code email to ${email}`, error);
      void this.logsService.error('mail', 'PasswordResetCodeEmailFailed', {
        email,
        name,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  async sendPasswordUpdatedEmail(email: string, name: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Senha Atualizada com Sucesso - DuZePesqueiro',
        template: 'password-updated-success',
        context: {
          name,
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`Password updated notification sent to ${email}`);
      void this.logsService.info('mail', 'PasswordUpdatedEmailSent', {
        email,
        name,
      });
    } catch (error) {
      this.logger.error(`Failed to send password updated email to ${email}`, error);
      void this.logsService.error('mail', 'PasswordUpdatedEmailFailed', {
        email,
        name,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  async sendHostingBookedCompanyEmail(payload: HostingBookedCompanyMailPayload) {
    await this.sendTemplatedEmail(
      {
        to: payload.email,
        subject: `Nova Reserva de Hospedagem - ${payload.codigoReserva}`,
        template: 'hosting-booked-company',
        context: {
          ...payload,
          year: new Date().getFullYear(),
        },
        event: 'HostingBookedCompanyEmail',
        metadata: {
          codigoReserva: payload.codigoReserva,
          accommodationName: payload.accommodationName,
          reservationStatus: payload.reservationStatus,
          paymentStatus: payload.paymentStatus,
        },
      },
      true,
    );
  }

  async sendOrderConfirmation(payload: OrderConfirmationMailPayload) {
    try {
      await this.mailerService.sendMail({
        to: payload.email,
        subject: `Pedido Confirmado #${payload.orderNumber} - DuZePesqueiro`,
        template: 'order-confirmation',
        context: {
          ...payload,
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`Order confirmation sent to ${payload.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send order confirmation to ${payload.email}`,
        error,
      );
    }
  }

  async sendRentalConfirmation(payload: RentalConfirmationMailPayload) {
    try {
      await this.mailerService.sendMail({
        to: payload.email,
        subject: `Aluguel Confirmado #${payload.rentalNumber} - DuZePesqueiro`,
        template: 'rental-confirmation',
        context: {
          ...payload,
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`Rental confirmation sent to ${payload.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send rental confirmation to ${payload.email}`,
        error,
      );
    }
  }

  async sendRentalCancellation(payload: RentalConfirmationMailPayload) {
    try {
      await this.mailerService.sendMail({
        to: payload.email,
        subject: `Reserva Cancelada #${payload.rentalNumber} - DuZePesqueiro`,
        template: 'rental-cancellation',
        context: {
          ...payload,
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`Rental cancellation email sent to ${payload.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send rental cancellation email to ${payload.email}`,
        error,
      );
    }
  }

  async sendRentalReminder(payload: RentalConfirmationMailPayload) {
    try {
      await this.mailerService.sendMail({
        to: payload.email,
        subject: `Lembrete de Devolução #${payload.rentalNumber} - DuZePesqueiro`,
        template: 'rental-reminder',
        context: {
          ...payload,
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`Rental reminder email sent to ${payload.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send rental reminder email to ${payload.email}`,
        error,
      );
    }
  }

  async sendRentalReturnConfirmation(payload: RentalConfirmationMailPayload) {
    try {
      await this.mailerService.sendMail({
        to: payload.email,
        subject: `Devolução Confirmada #${payload.rentalNumber} - DuZePesqueiro`,
        template: 'rental-return-confirmation',
        context: {
          ...payload,
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`Rental return confirmation email sent to ${payload.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send rental return confirmation email to ${payload.email}`,
        error,
      );
    }
  }

  async sendEventBookingConfirmation(
    payload: EventBookingConfirmationMailPayload,
  ) {
    try {
      await this.mailerService.sendMail({
        to: payload.email,
        subject: `Reserva de Evento Confirmada - ${payload.eventName}`,
        template: 'event-booking-confirmation',
        context: {
          ...payload,
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`Event booking confirmation sent to ${payload.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send event booking confirmation to ${payload.email}`,
        error,
      );
    }
  }

  async sendHostingBookedEmail(payload: HostingBookedMailPayload) {
    await this.sendTemplatedEmail(
      {
        to: payload.email,
        subject: `Hospedagem Reservada - ${payload.accommodationName}`,
        template: 'hosting-booked',
        context: {
          ...payload,
          year: new Date().getFullYear(),
        },
        event: 'HostingBookedEmail',
        metadata: {
          codigoReserva: payload.codigoReserva,
          accommodationName: payload.accommodationName,
        },
      },
      true,
    );
  }

  async sendProductPurchaseConfirmation(
    payload: ProductPurchaseConfirmationMailPayload,
  ) {
    try {
      await this.mailerService.sendMail({
        to: payload.email,
        subject: `Compra Confirmada #${payload.orderNumber} - DuZePesqueiro`,
        template: 'product-purchase-confirmation',
        context: {
          ...payload,
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`Product purchase confirmation sent to ${payload.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send product purchase confirmation to ${payload.email}`,
        error,
      );
    }
  }

  async sendHostingReminder1Day(payload: HostingReminder1DayMailPayload) {
    try {
      await this.mailerService.sendMail({
        to: payload.email,
        subject: `Lembrete: sua hospedagem começa amanhã - ${payload.accommodationName}`,
        template: 'hosting-reminder-1day',
        context: {
          ...payload,
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`Hosting reminder email sent to ${payload.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send hosting reminder email to ${payload.email}`,
        error,
      );
    }
  }

  async sendHostingPaymentConfirmedEmail(
    payload: HostingPaymentConfirmedMailPayload,
  ) {
    try {
      await this.mailerService.sendMail({
        to: payload.email,
        subject: `Pagamento confirmado da reserva ${payload.codigoReserva}`,
        template: 'hosting-payment-confirmed',
        context: {
          ...payload,
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`Hosting payment confirmation email sent to ${payload.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send hosting payment confirmation email to ${payload.email}`,
        error,
      );
    }
  }

  async sendHostingVoucherEmail(payload: HostingVoucherMailPayload) {
    await this.sendTemplatedEmail(
      {
        to: payload.email,
        subject: `Voucher da reserva ${payload.codigoReserva}`,
        template: 'hosting-voucher-details',
        context: {
          ...payload,
          year: new Date().getFullYear(),
        },
        event: 'HostingVoucherEmail',
        metadata: {
          codigoReserva: payload.codigoReserva,
        },
      },
      true,
    );
  }

  async sendHostingCheckinEmail(payload: HostingCheckinMailPayload) {
    try {
      await this.mailerService.sendMail({
        to: payload.email,
        subject: `Check-in confirmado da reserva ${payload.codigoReserva}`,
        template: 'hosting-checkin-confirmed',
        context: {
          ...payload,
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`Hosting check-in email sent to ${payload.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send hosting check-in email to ${payload.email}`,
        error,
      );
      throw error;
    }
  }

  async sendHostingCheckoutEmail(payload: HostingCheckoutMailPayload) {
    try {
      await this.mailerService.sendMail({
        to: payload.email,
        subject: `Check-out registrado da reserva ${payload.codigoReserva}`,
        template: 'hosting-checkout-confirmed',
        context: {
          ...payload,
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`Hosting check-out email sent to ${payload.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send hosting check-out email to ${payload.email}`,
        error,
      );
    }
  }

  async sendHostingCompletedEmail(payload: HostingCompletedMailPayload) {
    try {
      await this.mailerService.sendMail({
        to: payload.email,
        subject: `Reserva ${payload.codigoReserva} finalizada`,
        template: 'hosting-reservation-completed',
        context: {
          ...payload,
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`Hosting completed email sent to ${payload.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send hosting completed email to ${payload.email}`,
        error,
      );
    }
  }

  async sendHostingCancellationEmail(payload: HostingCancellationMailPayload) {
    try {
      await this.mailerService.sendMail({
        to: payload.email,
        subject: `Cancelamento da reserva ${payload.codigoReserva}`,
        template: 'hosting-cancellation',
        context: {
          ...payload,
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`Hosting cancellation email sent to ${payload.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send hosting cancellation email to ${payload.email}`,
        error,
      );
    }
  }

  async sendHostingNoShowEmail(payload: HostingNoShowMailPayload) {
    try {
      await this.mailerService.sendMail({
        to: payload.email,
        subject: `Registro de no-show da reserva ${payload.codigoReserva}`,
        template: 'hosting-no-show',
        context: {
          ...payload,
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`Hosting no-show email sent to ${payload.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send hosting no-show email to ${payload.email}`,
        error,
      );
    }
  }

  async sendHostingPaymentReminderEmail(payload: HostingPaymentReminderMailPayload) {
    try {
      await this.mailerService.sendMail({
        to: payload.email,
        subject: `Lembrete de pagamento da reserva ${payload.codigoReserva}`,
        template: 'hosting-payment-reminder',
        context: {
          ...payload,
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`Hosting payment reminder email sent to ${payload.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send hosting payment reminder email to ${payload.email}`,
        error,
      );
    }
  }

  async sendReviewPublishedEmail(payload: ReviewPublishedMailPayload) {
    const domainLabel: Record<ReviewPublishedMailPayload['domain'], string> = {
      HOSTING: 'Hospedagem',
      EVENT: 'Evento',
      RENTAL: 'Aluguel',
      SALES: 'Vendas',
    };

    await this.sendTemplatedEmail(
      {
        to: payload.email,
        subject: `Avaliação publicada - ${payload.targetName ?? domainLabel[payload.domain]}`,
        template: 'review-published',
        context: {
          ...payload,
          domainLabel: domainLabel[payload.domain],
          targetName: payload.targetName ?? domainLabel[payload.domain],
          year: new Date().getFullYear(),
        },
        event: 'ReviewPublishedEmail',
        metadata: {
          domain: payload.domain,
          rating: payload.rating,
        },
      },
      true,
    );
  }

  async sendProductLifecycleNotification(
    payload: ProductLifecycleNotificationMailPayload,
  ) {
    const actionLabelByType: Record<
      ProductLifecycleNotificationMailPayload['action'],
      string
    > = {
      CREATION: 'Cadastro',
      UPDATE: 'Edição',
      DELETION: 'Exclusão',
    };

    await this.sendTemplatedEmail(
      {
        to: payload.email,
        subject: `[Estoque] ${actionLabelByType[payload.action]} de Produto - ${payload.sku}`,
        template: 'product-lifecycle-notification',
        context: {
          ...payload,
          actionLabel: actionLabelByType[payload.action],
          year: new Date().getFullYear(),
        },
        event: 'ProductLifecycleNotification',
        metadata: {
          email: payload.email,
          sku: payload.sku,
          action: payload.action,
        },
      },
      true,
    );
  }
}
