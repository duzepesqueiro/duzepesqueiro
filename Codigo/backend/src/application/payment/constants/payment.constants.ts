import { IPaymentDomain, IPaymentMethod } from '../interfaces';

export const PAYMENT_DOMAIN_RULES = {
  [IPaymentDomain.SALES]: {
    allowedMethods: [
      IPaymentMethod.CREDIT,
      IPaymentMethod.DEBIT,
      IPaymentMethod.PIX,
    ],
    allowInstallments: true,
    minInstallmentValue: 50,
    maxInstallments: 12,
    minValueForInstallments: 100,
  },
  [IPaymentDomain.RENTAL]: {
    allowedMethods: [
      IPaymentMethod.CREDIT,
      IPaymentMethod.DEBIT,
      IPaymentMethod.PIX,
    ],
    allowInstallments: false,
    maxInstallments: 1,
  },
  [IPaymentDomain.HOSTING]: {
    allowedMethods: [
      IPaymentMethod.CREDIT,
      IPaymentMethod.DEBIT,
      IPaymentMethod.PIX,
    ],
    allowInstallments: false,
    maxInstallments: 1,
    futureFeatures: {
      splitPayment: {
        onReservation: 0.5,
        onCheckin: 0.5,
      },
    },
  },
  [IPaymentDomain.EVENT]: {
    allowedMethods: [
      IPaymentMethod.CREDIT,
      IPaymentMethod.DEBIT,
      IPaymentMethod.PIX,
    ],
    allowInstallments: false,
    maxInstallments: 1,
  },
} as const;

export const MERCADOPAGO_API = {
  BASE_URL: 'https://api.mercadopago.com',
  OAUTH_TOKEN: '/oauth/token',
  PAYMENTS: '/v1/payments',
  PAYMENTS_SEARCH: '/v1/payments/search',
} as const;

export const PAYMENT_ERROR_CODES = {
  invalid_client: 'Credenciais inválidas para autenticação no provedor',
  invalid_grant: 'Token inválido, expirado ou revogado',
  invalid_scope: 'Escopo informado não permitido',
  invalid_request: 'Requisição inválida para o provedor',
  forbidden: 'Acesso negado para esta operação',
  unauthorized_client: 'Cliente não autorizado para a operação',
  local_rate_limited: 'Limite de taxa excedido temporariamente',
  cc_rejected_bad_filled_card_number: 'Número do cartão inválido',
  cc_rejected_bad_filled_date: 'Data de validade inválida',
  cc_rejected_bad_filled_other: 'Dados do cartão inválidos',
  cc_rejected_bad_filled_security_code: 'Código de segurança inválido',
  cc_rejected_bad_filled_cardholder_name: 'Nome do titular inválido',
  cc_rejected_blacklist: 'Cartão ou pagador em blacklist',
  cc_rejected_call_for_authorize: 'Pagamento requer autorização da operadora',
  cc_rejected_card_disabled: 'Cartão desabilitado',
  cc_rejected_card_error: 'Erro interno com cartão',
  cc_rejected_duplicated_payment: 'Pagamento duplicado detectado',
  cc_rejected_high_risk: 'Pagamento rejeitado por alto risco',
  cc_rejected_insufficient_amount: 'Saldo insuficiente',
  cc_rejected_invalid_installments: 'Parcelamento inválido para o cartão',
  cc_rejected_max_attempts: 'Máximo de tentativas atingido',
  cc_rejected_other_reason: 'Pagamento rejeitado por motivo não especificado',
} as const;

export const PAYMENT_STATUS_DETAIL = {
  accredited: 'Pagamento aprovado e creditado',
  pending_capture: 'Pagamento autorizado aguardando captura',
  offline_process: 'Pagamento em processamento offline',
  pending_contingency: 'Pagamento pendente por contingência',
  pending_review_manual: 'Pagamento pendente de revisão manual',
  pending_waiting_payment: 'Pagamento aguardando efetivação',
  pending_waiting_transfer: 'Pagamento aguardando transferência',
  pending_challenge: 'Pagamento pendente de desafio antifraude',
  cc_rejected_call_for_authorize: 'Pagamento requer contato com emissor',
  cc_rejected_insufficient_amount: 'Pagamento recusado por saldo insuficiente',
  cc_rejected_bad_filled_security_code: 'Pagamento recusado por CVV inválido',
  cc_rejected_bad_filled_date: 'Pagamento recusado por validade inválida',
  cc_rejected_bad_filled_card_number: 'Pagamento recusado por número inválido',
  refunded: 'Pagamento estornado',
  charged_back: 'Pagamento contestado e devolvido',
  cancelled: 'Pagamento cancelado',
} as const;

export const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 5000,
  backoffMultiplier: 2,
} as const;
