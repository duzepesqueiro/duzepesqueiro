import { HostingContactChannel, HostingReservationOrigin, PaymentStatus, ReservationStatus } from '@prisma/client';

export class HospedeDTO {
  id: string;
  reservationId: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  cpf?: string | null;
  rg?: string | null;
  birthDate?: Date | null;
  isPrimary: boolean;
}

export class VoucherDTO {
  id: string;
  reservationId: string;
  qrCode: string;
  arrivalInstructions?: string | null;
  complexContacts?: string | null;
  generatedAt: Date;
  sentByEmail: boolean;
}

export class ReservaDTO {
  id: string;
  code: string;
  chaletId: string;
  userId?: string | null;
  status: ReservationStatus;
  origin: HostingReservationOrigin;
  guestName: string;
  guestEmail?: string | null;
  guestPhone?: string | null;
  checkInDate: Date;
  checkOutDate: Date;
  adults: number;
  children: number;
  baseAmount: number;
  discountAmount: number;
  surchargeAmount: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: string | null;
  paymentId?: string | null;
  paidAt?: Date | null;
  checkedInAt?: Date | null;
  checkedOutAt?: Date | null;
  cancelledAt?: Date | null;
  noShowAt?: Date | null;
  noShowFeeAmount?: number | null;
  noShowReason?: string | null;
  cancellationReason?: string | null;
  vehiclePlate?: string | null;
  vehicleModel?: string | null;
  vehicleColor?: string | null;
  vehicleType?: string | null;
  extraBedRequested: boolean;
  extraBedFee: number;
  negotiationNotes?: string | null;
  contactChannel?: HostingContactChannel | null;
  contactNotes?: string | null;
  policiesAccepted: boolean;
  policiesAcceptedAt?: Date | null;
  policyVersion?: string | null;
  policyTerm?: string | null;
  cancellationPolicyId?: string | null;
  pricingRuleId?: string | null;
  notes?: string | null;
  createdById?: string | null;
  updatedById?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ReservaListDTO extends ReservaDTO {}

export class ReservaDetailDTO extends ReservaDTO {
  guests: HospedeDTO[];
  vouchers: VoucherDTO[];
}

export class CheckinResponseDTO {
  reservationId: string;
  status: ReservationStatus;
  checkedInAt: Date;
}

export class CheckoutResponseDTO {
  reservationId: string;
  status: ReservationStatus;
  checkedOutAt: Date;
}

export class CancellationResponseDTO {
  reservationId: string;
  status: ReservationStatus;
  cancelledAt: Date;
  cancellationReason?: string | null;
  penaltyAmount: number;
}

export class NoShowResponseDTO {
  reservationId: string;
  status: ReservationStatus;
  noShowAt: Date;
  noShowFeeAmount?: number | null;
}

export class PriceCalculationDTO {
  chaletId: string;
  checkInDate: Date;
  checkOutDate: Date;
  guests: number;
  totalAmount: number;
}

export class AvailabilityDTO {
  chaletId: string;
  checkInDate: Date;
  checkOutDate: Date;
  available: boolean;
}
