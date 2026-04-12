interface RentalBaseEventPayload {
  timestamp: Date;
  triggeredBy: string;
}

export interface RentalCreatedPayload extends RentalBaseEventPayload {
  rentalId: string;
  userId: string;
  userEmail: string;
  userName: string;
  items: Array<{ productId: string; quantity: number }>;
  startDate: Date;
  endDate: Date;
  total: number;
}

export interface RentalBookingPayload extends RentalBaseEventPayload {
  bookingId: string;
  rentalId: string;
  userId: string;
  userEmail: string;
  userName: string;
  period: number;
  value: number;
  startDate: Date;
  endDate: Date;
  status: string;
  rentalDetails: {
    rentalNumber: string;
    startDate: string;
    endDate: string;
    total: string | number;
    items: Array<{ name: string; quantity: number }>;
  };
}

export interface RentalPaymentPayload extends RentalBaseEventPayload {
  paymentId: string;
  rentalId: string;
  bookingId?: string;
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  status: string;
  method: string;
}

export interface RentalStatusPayload extends RentalBaseEventPayload {
  rentalId: string;
  bookingId?: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  previousStatus?: string;
  newStatus: string;
  returnDate?: Date;
}
