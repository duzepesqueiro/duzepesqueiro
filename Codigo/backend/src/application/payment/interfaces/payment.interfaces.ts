export enum IPaymentDomain {
  SALES = 'sales',
  RENTAL = 'rental',
  HOSTING = 'hosting',
  EVENT = 'event',
}

export enum IPaymentMethod {
  CREDIT = 'credit_card',
  DEBIT = 'debit_card',
  PIX = 'pix',
}

export interface IPointOfInteraction {
  ticketUrl?: string;
  qrCode?: string;
  qrCodeBase64?: string;
}

export interface IPaymentResponse {
  id: string | number;
  externalReference: string;
  transactionAmount: number;
  currencyId: string;
  status?: string;
  paymentMethodId?: string;
  payer?: { email?: string };
  dateApproved?: Date;
  pointOfInteraction?: IPointOfInteraction;
}
