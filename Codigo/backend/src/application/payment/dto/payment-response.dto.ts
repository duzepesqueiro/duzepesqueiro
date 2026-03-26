import { ApiProperty } from '@nestjs/swagger';
import { IPaymentResponse, ISearchPaymentResponse } from '../interfaces';

export class PaymentResponseDto implements IPaymentResponse {
  @ApiProperty()
  id: number;

  @ApiProperty()
  dateCreated: Date;

  @ApiProperty({ required: false })
  dateApproved?: Date;

  @ApiProperty()
  dateLastUpdated: Date;

  @ApiProperty({ required: false })
  moneyReleaseDate?: Date;

  @ApiProperty()
  status: any;

  @ApiProperty()
  statusDetail: string;

  @ApiProperty()
  currencyId: string;

  @ApiProperty()
  transactionAmount: number;

  @ApiProperty({ required: false })
  transactionAmountRefunded?: number;

  @ApiProperty()
  paymentMethodId: string;

  @ApiProperty()
  paymentTypeId: string;

  @ApiProperty({ required: false })
  issuerId?: string;

  @ApiProperty()
  installments: number;

  @ApiProperty()
  externalReference: string;

  @ApiProperty({ type: Object })
  payer: any;

  @ApiProperty({ required: false, type: Object })
  transactionDetails?: any;

  @ApiProperty({ required: false, type: [Object] })
  feeDetails?: any[];

  @ApiProperty({ required: false })
  threeDSStatus?: string;

  @ApiProperty({ required: false, type: Object })
  pointOfInteraction?: any;
}

export class SearchPaymentResponseDto implements ISearchPaymentResponse {
  @ApiProperty({ type: Object })
  paging: { total: number; limit: number; offset: number };

  @ApiProperty({ type: [PaymentResponseDto] })
  results: IPaymentResponse[];
}
