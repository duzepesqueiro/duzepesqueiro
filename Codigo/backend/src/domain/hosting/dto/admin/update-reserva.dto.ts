import { HostingContactChannel, HostingReservationOrigin, PaymentStatus, ReservationStatus } from '@prisma/client';

export class UpdateReservaDTO {
  chaletId?: string;
  userId?: string | null;
  pricingRuleId?: string | null;
  cancellationPolicyId?: string | null;
  status?: ReservationStatus;
  origin?: HostingReservationOrigin;
  guestName?: string;
  guestEmail?: string | null;
  guestPhone?: string | null;
  checkInDate?: string;
  checkOutDate?: string;
  adults?: number;
  children?: number;
  discountAmount?: number;
  surchargeAmount?: number;
  paymentStatus?: PaymentStatus;
  paymentMethod?: string | null;
  paymentId?: string | null;
  paidAt?: string | null;
  cancellationReason?: string | null;
  notes?: string | null;
  extraBedRequested?: boolean;
  extraBedFee?: number;
  negotiationNotes?: string | null;
  contactChannel?: HostingContactChannel | null;
  contactNotes?: string | null;
  policiesAccepted?: boolean;
  policiesAcceptedAt?: string | null;
  policyVersion?: string | null;
  policyTerm?: string | null;
  vehiclePlate?: string | null;
  updatedById?: string | null;
}
