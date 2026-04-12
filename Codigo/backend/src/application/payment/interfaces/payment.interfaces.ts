import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export interface IMercadoPagoConfig {
  accessToken: string;
  publicKey: string;
  webhookSecret?: string;
}

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

export enum IPaymentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  AUTHORIZED = 'authorized',
  IN_PROCESS = 'in_process',
  IN_MEDIATION = 'in_mediation',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  CHARGED_BACK = 'charged_back',
}

export interface IPaymentItem {
  id: string;
  title: string;
  description?: string;
  pictureUrl?: string;
  categoryId?: string;
  quantity: number;
  unitPrice: number;
  type?: string;
}

export interface IPayerAddress {
  zipCode: string;
  streetName: string;
  streetNumber: number;
  neighborhood?: string;
  city?: string;
  federalUnit?: string;
}

export interface IPayer {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: { areaCode: string; number: string };
  identification?: { type: string; number: string };
  address?: IPayerAddress;
  type?: 'customer' | 'guest';
}

export interface ICreatePaymentRequest {
  domain: IPaymentDomain;
  entityId: string;
  transactionAmount: number;
  installments: number;
  paymentMethodId: string;
  token?: string;
  payer: IPayer;
  items: IPaymentItem[];
  description?: string;
  externalReference: string;
  notificationUrl?: string;
  metadata?: Record<string, any>;
}

export interface ITransactionDetails {
  netReceivedAmount: number;
  totalPaidAmount: number;
  overpaidAmount: number;
  installmentAmount: number;
}

export interface IPointOfInteraction {
  type: string;
  qrCodeBase64?: string;
  qrCode?: string;
  ticketUrl?: string;
}

export interface IFeeDetail {
  type: string;
  amount: number;
  feePayer?: string;
}

export interface IPaymentResponse {
  id: number;
  dateCreated: Date;
  dateApproved?: Date;
  dateLastUpdated: Date;
  moneyReleaseDate?: Date;
  status: IPaymentStatus;
  statusDetail: string;
  currencyId: string;
  transactionAmount: number;
  transactionAmountRefunded?: number;
  paymentMethodId: string;
  paymentTypeId: string;
  issuerId?: string;
  installments: number;
  externalReference: string;
  payer: IPayer;
  transactionDetails?: ITransactionDetails;
  feeDetails?: IFeeDetail[];
  threeDSStatus?: string;
  pointOfInteraction?: IPointOfInteraction;
}

export interface ISearchPaymentParams {
  sort?: 'date_created' | 'date_approved' | 'date_last_updated' | 'id';
  criteria?: 'asc' | 'desc';
  externalReference?: string;
  range?: 'date_created' | 'date_last_updated' | 'date_approved';
  beginDate?: string;
  endDate?: string;
  status?: IPaymentStatus;
  limit?: number;
  offset?: number;
}

export interface ISearchPaymentResponse {
  paging: { total: number; limit: number; offset: number };
  results: IPaymentResponse[];
}

export class CreatePaymentRequestDto implements ICreatePaymentRequest {
  @IsEnum(IPaymentDomain)
  domain: IPaymentDomain;

  @IsString()
  entityId: string;

  @IsNumber()
  @Min(0.01)
  transactionAmount: number;

  @IsInt()
  @Min(1)
  installments: number;

  @IsString()
  paymentMethodId: string;

  @IsOptional()
  @IsString()
  token?: string;

  @IsObject()
  payer: IPayer;

  @IsArray()
  @ArrayMinSize(1)
  items: IPaymentItem[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  externalReference: string;

  @IsOptional()
  @IsString()
  notificationUrl?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class SearchPaymentParamsDto implements ISearchPaymentParams {
  @IsOptional()
  @IsEnum(['date_created', 'date_approved', 'date_last_updated', 'id'])
  sort?: 'date_created' | 'date_approved' | 'date_last_updated' | 'id';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  criteria?: 'asc' | 'desc';

  @IsOptional()
  @IsString()
  externalReference?: string;

  @IsOptional()
  @IsEnum(['date_created', 'date_last_updated', 'date_approved'])
  range?: 'date_created' | 'date_last_updated' | 'date_approved';

  @IsOptional()
  @IsDateString()
  beginDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(IPaymentStatus)
  status?: IPaymentStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

export class PayerDto implements IPayer {
  @IsOptional()
  @IsString()
  id?: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsObject()
  phone?: { areaCode: string; number: string };

  @IsOptional()
  @IsObject()
  identification?: { type: string; number: string };

  @IsOptional()
  @IsObject()
  address?: IPayerAddress;

  @IsOptional()
  @IsEnum(['customer', 'guest'])
  type?: 'customer' | 'guest';
}
