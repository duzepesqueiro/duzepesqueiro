export interface Room {
  id: string;
  name: string;
  type: 'standard' | 'deluxe' | 'suite' | 'cabin';
  description: string;
  capacity: number;
  pricePerNight: number;
  amenities: string[];
  petFriendly: boolean;
  images: string[];
  beds: string;
  bathroom: string;
  extras: string[];
  rules: string[];
  unavailableDates: string[];
}

export interface Guest {
  name: string;
  age: number;
  document: string;
  address: {
    street: string;
    number: string;
    city: string;
    state: string;
    zip: string;
  };
}

export interface BookingData {
  roomId: string;
  checkIn: Date | null;
  checkOut: Date | null;
  guests: number;
  pets: boolean;
  guestDetails: Guest[];
  responsibleGuestIndex: number | null;
  vehiclePlate: string;
  observations: string;
  termsAccepted: boolean;
  policyVersion: string;
  policyTerm: string;
}

export interface PaymentData {
  method: 'card' | 'pix' | null;
  status: 'idle' | 'processing' | 'success' | 'error';
  card?: {
    number: string;
    name: string;
    expiry: string;
    cvv: string;
  };
}

export interface Reservation {
  id: string;
  bookingData: BookingData;
  paymentData: PaymentData;
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt: Date;
  totalPrice: number;
}
