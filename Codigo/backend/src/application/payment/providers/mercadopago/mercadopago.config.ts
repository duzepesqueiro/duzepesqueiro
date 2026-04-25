import { registerAs } from '@nestjs/config';

export default registerAs('mercadopago', () => ({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  webhookUrl: process.env.MERCADOPAGO_WEBHOOK_URL,
  checkoutSuccessUrl: process.env.MERCADOPAGO_CHECKOUT_SUCCESS_URL,
  checkoutPendingUrl: process.env.MERCADOPAGO_CHECKOUT_PENDING_URL,
  checkoutFailureUrl: process.env.MERCADOPAGO_CHECKOUT_FAILURE_URL,
}));
