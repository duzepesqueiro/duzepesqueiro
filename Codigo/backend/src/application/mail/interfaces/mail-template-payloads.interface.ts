export interface OrderConfirmationItem {
  name: string;
  quantity: number;
  price?: string | number;
}

export interface OrderConfirmationMailPayload {
  email: string;
  customerName: string;
  orderNumber: string;
  total: string | number;
  items?: OrderConfirmationItem[];
}

export interface RentalConfirmationItem {
  name: string;
  quantity: number;
}

export interface RentalConfirmationMailPayload {
  email: string;
  customerName: string;
  rentalNumber: string;
  startDate: string;
  endDate: string;
  total: string | number;
  items: RentalConfirmationItem[];
}

export interface EventBookingConfirmationMailPayload {
  email: string;
  customerName: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  guests: number;
  total: string | number;
}

export interface HostingBookedMailPayload {
  email: string;
  customerName: string;
  accommodationName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: string | number;
}

export interface ProductPurchaseConfirmationMailPayload {
  email: string;
  customerName: string;
  orderNumber: string;
  total: string | number;
  items: OrderConfirmationItem[];
}

export interface HostingReminder1DayMailPayload {
  email: string;
  customerName: string;
  accommodationName: string;
  checkIn: string;
  checkOut: string;
  address: string;
}
