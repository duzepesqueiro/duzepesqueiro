import { HostingContactChannel, HostingReservationOrigin, PaymentStatus, ReservationStatus } from '@prisma/client';

export class CreateReservaDTO {
  chaletId: string;
  userId?: string;
  pricingRuleId?: string;
  cancellationPolicyId?: string;
  status?: ReservationStatus;
  origin?: HostingReservationOrigin;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  checkInDate: string;
  checkOutDate: string;
  adults?: number;
  children?: number;
  discountAmount?: number;
  surchargeAmount?: number;
  paymentStatus?: PaymentStatus;
  paymentMethod?: string;
  paymentId?: string;
  paidAt?: string;
  extraBedRequested?: boolean;
  extraBedFee?: number;
  negotiationNotes?: string;
  contactChannel?: HostingContactChannel;
  contactNotes?: string;
  policiesAccepted?: boolean;
  policiesAcceptedAt?: string;
  policyVersion?: string;
  policyTerm?: string;
  notes?: string;
  createdById?: string;
}
