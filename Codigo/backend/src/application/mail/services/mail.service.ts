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
  HostingReminder1DayMailPayload,
  OrderConfirmationMailPayload,
  ProductPurchaseConfirmationMailPayload,
  RentalConfirmationMailPayload,
} from '../interfaces/mail-template-payloads.interface';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private mailerService: MailerService,
    private readonly logsService: LogsService,
  ) {}

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

  async sendPasswordResetEmail(email: string, name: string, resetToken: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Recuperação de Senha - DuZePesqueiro',
        template: 'reset-password',
        context: {
          name,
          resetUrl,
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`Password reset email sent to ${email}`);
      void this.logsService.info('mail', 'PasswordResetEmailSent', { email, name });
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}`, error);
      void this.logsService.error('mail', 'PasswordResetEmailFailed', {
        email,
        name,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
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
    try {
      await this.mailerService.sendMail({
        to: payload.email,
        subject: `Hospedagem Reservada - ${payload.accommodationName}`,
        template: 'hosting-booked',
        context: {
          ...payload,
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`Hosting booked email sent to ${payload.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send hosting booked email to ${payload.email}`,
        error,
      );
    }
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
}
