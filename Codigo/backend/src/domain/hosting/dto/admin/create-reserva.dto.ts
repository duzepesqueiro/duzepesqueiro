import { HostingContactChannel, HostingReservationOrigin, PaymentStatus, ReservationStatus } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsISO8601,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateHospedeDTO } from './create-hospede.dto';

export class CreateReservaGuestDTO extends CreateHospedeDTO {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  age?: number;
}

export class CreateReservaDTO {
  @IsUUID('4')
  chaletId: string;
  @IsOptional()
  @IsUUID('4')
  userId?: string;
  @IsOptional()
  @IsUUID('4')
  pricingRuleId?: string;
  @IsOptional()
  @IsUUID('4')
  cancellationPolicyId?: string;
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;
  @IsOptional()
  @IsEnum(HostingReservationOrigin)
  origin?: HostingReservationOrigin;
  @IsString()
  @MaxLength(255)
  guestName: string;
  @IsOptional()
  @IsEmail()
  guestEmail?: string;
  @IsOptional()
  @IsString()
  @MaxLength(30)
  guestPhone?: string;
  @IsISO8601()
  checkInDate: string;
  @IsISO8601()
  checkOutDate: string;
  @IsOptional()
  @IsNumber()
  @Min(0)
  adults?: number;
  @IsOptional()
  @IsNumber()
  @Min(0)
  children?: number;
  @IsOptional()
  @IsNumber()
  discountAmount?: number;
  @IsOptional()
  @IsNumber()
  surchargeAmount?: number;
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;
  @IsOptional()
  @IsString()
  paymentMethod?: string;
  @IsOptional()
  @IsString()
  paymentId?: string;
  @IsOptional()
  @IsISO8601()
  paidAt?: string;
  @IsOptional()
  @IsBoolean()
  extraBedRequested?: boolean;
  @IsOptional()
  @IsNumber()
  extraBedFee?: number;
  @IsOptional()
  @IsString()
  negotiationNotes?: string;
  @IsOptional()
  @IsEnum(HostingContactChannel)
  contactChannel?: HostingContactChannel;
  @IsOptional()
  @IsString()
  contactNotes?: string;
  @IsOptional()
  @IsBoolean()
  policiesAccepted?: boolean;
  @IsOptional()
  @IsISO8601()
  policiesAcceptedAt?: string;
  @IsOptional()
  @IsString()
  policyVersion?: string;
  @IsOptional()
  @IsString()
  policyTerm?: string;
  @IsOptional()
  @IsString()
  @MaxLength(20)
  vehiclePlate?: string;
  @IsOptional()
  @IsString()
  notes?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReservaGuestDTO)
  guests?: CreateReservaGuestDTO[];
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  responsibleGuestIndex?: number;
  @IsOptional()
  @IsUUID('4')
  createdById?: string;
}
