import { ApiProperty } from '@nestjs/swagger';
import { IPaymentResponse, ISearchPaymentResponse } from '../interfaces';

export class PaymentPayerResponseDto {
  @ApiProperty({ example: 'payer_123' })
  id?: string;

  @ApiProperty({ example: 'customer@example.com' })
  email: string;

  @ApiProperty({ example: 'João' })
  firstName?: string;

  @ApiProperty({ example: 'Silva' })
  lastName?: string;
}

export class PaymentTransactionDetailsResponseDto {
  @ApiProperty({ example: 97.5 })
  netReceivedAmount: number;

  @ApiProperty({ example: 100.0 })
  totalPaidAmount: number;

  @ApiProperty({ example: 0 })
  overpaidAmount: number;

  @ApiProperty({ example: 100.0 })
  installmentAmount: number;
}

export class PaymentFeeDetailResponseDto {
  @ApiProperty({ example: 'mercadopago_fee' })
  type: string;

  @ApiProperty({ example: 2.5 })
  amount: number;

  @ApiProperty({ example: 'collector', required: false })
  feePayer?: string;
}

export class PaymentPointOfInteractionResponseDto {
  @ApiProperty({ example: 'PIX' })
  type: string;

  @ApiProperty({ example: 'iVBORw0KGgoAAAANSUhEUgAA...' })
  qrCodeBase64?: string;

  @ApiProperty({ example: '00020101021226990014br.gov.bcb.pix...' })
  qrCode?: string;

  @ApiProperty({ example: 'https://www.mercadopago.com.br/payments/123/ticket' })
  ticketUrl?: string;
}

export class PaymentResponseDto implements IPaymentResponse {
  @ApiProperty({ example: 123456789 })
  id: number;

  @ApiProperty({ example: '2026-03-22T16:30:00.000Z' })
  dateCreated: Date;

  @ApiProperty({ example: '2026-03-22T16:31:00.000Z', required: false })
  dateApproved?: Date;

  @ApiProperty({ example: '2026-03-22T16:31:00.000Z' })
  dateLastUpdated: Date;

  @ApiProperty({ example: '2026-03-23T12:00:00.000Z', required: false })
  moneyReleaseDate?: Date;

  @ApiProperty({ example: 'pending' })
  status: any;

  @ApiProperty({ example: 'Aguardando pagamento' })
  statusDetail: string;

  @ApiProperty({ example: 'BRL' })
  currencyId: string;

  @ApiProperty({ example: 100.0 })
  transactionAmount: number;

  @ApiProperty({ example: 0, required: false })
  transactionAmountRefunded?: number;

  @ApiProperty({ example: 'pix' })
  paymentMethodId: string;

  @ApiProperty({ example: 'bank_transfer' })
  paymentTypeId: string;

  @ApiProperty({ example: '123', required: false })
  issuerId?: string;

  @ApiProperty({ example: 1 })
  installments: number;

  @ApiProperty({ example: 'sales_order-123' })
  externalReference: string;

  @ApiProperty({ type: PaymentPayerResponseDto })
  payer: PaymentPayerResponseDto;

  @ApiProperty({ type: PaymentTransactionDetailsResponseDto, required: false })
  transactionDetails?: PaymentTransactionDetailsResponseDto;

  @ApiProperty({ type: [PaymentFeeDetailResponseDto], required: false })
  feeDetails?: PaymentFeeDetailResponseDto[];

  @ApiProperty({ example: 'AUTHENTICATED', required: false })
  threeDSStatus?: string;

  @ApiProperty({ type: PaymentPointOfInteractionResponseDto, required: false })
  pointOfInteraction?: PaymentPointOfInteractionResponseDto;
}

export class SearchPaymentPagingResponseDto {
  @ApiProperty({ example: 57 })
  total: number;

  @ApiProperty({ example: 30 })
  limit: number;

  @ApiProperty({ example: 0 })
  offset: number;
}

export class SearchPaymentResponseDto implements ISearchPaymentResponse {
  @ApiProperty({ type: SearchPaymentPagingResponseDto })
  paging: SearchPaymentPagingResponseDto;

  @ApiProperty({ type: [PaymentResponseDto] })
  results: IPaymentResponse[];
}

export class PaymentHealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status: string;

  @ApiProperty({ example: true })
  database: boolean;

  @ApiProperty({ example: true })
  mercadoPago: boolean;

  @ApiProperty({ example: '7c4b3b52-9b08-4dc8-9f84-2e6cf59d7bcb' })
  correlationId: string;

  @ApiProperty({ example: '2026-03-22T17:00:00.000Z' })
  timestamp: string;
}
