import { ReviewDomain } from '@prisma/client';

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
  codigoReserva: string;
  accommodationName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  guestList: string[];
  valorDiaria: string | number;
  total: string | number;
  valorPagoApp: string | number;
  valorRestanteCheckin: string | number;
  politicaNoShow: string;
  politicaCancelamentoAte7: string;
  politicaCancelamento7a14: string;
  contactPhone: string;
  contactWhatsApp: string;
  contactEmail: string;
}

export interface HostingBookedCompanyGuestDetail {
  fullName: string;
  email?: string | null;
  phone?: string | null;
  cpf?: string | null;
  rg?: string | null;
  birthDate?: string | null;
  isPrimary?: boolean;
}

export interface HostingBookedCompanyMailPayload {
  email: string;
  codigoReserva: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  accommodationName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  adults: number;
  children: number;
  guestList: string[];
  guestDetails: HostingBookedCompanyGuestDetail[];
  valorDiaria: string | number;
  total: string | number;
  valorPagoApp: string | number;
  valorRestanteCheckin: string | number;
  paymentStatus: string;
  paymentMethod?: string | null;
  reservationStatus: string;
  observacoes?: string | null;
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

export interface ProductLifecycleNotificationMailPayload {
  email: string;
  adminName: string;
  action: 'CREATION' | 'UPDATE' | 'DELETION';
  productName: string;
  sku: string;
  productStatus: string;
  category: string;
  stockQuantity: number;
  salePrice: string | number;
  costPrice: string | number;
  actorName: string;
  actorEmail: string;
  occurredAt: string;
}

export interface HostingPaymentConfirmedMailPayload {
  email: string;
  customerName: string;
  codigoReserva: string;
  valorTotal: string | number;
  quantidadeDiarias?: number;
  valorDiaria?: string | number;
  metodoPagamento?: string;
}

export interface HostingVoucherMailPayload {
  email: string;
  customerName: string;
  codigoReserva: string;
  qrCode: string;
  checkIn: string;
  checkOut: string;
  accommodationName?: string;
  instrucoesChegada?: string;
  contatos?: string;
}

export interface HostingCheckinMailPayload {
  email: string;
  customerName: string;
  codigoReserva: string;
  checkinRealizadoEm: string;
}

export interface HostingCheckoutMailPayload {
  email: string;
  customerName: string;
  codigoReserva: string;
  checkoutRealizadoEm: string;
}

export interface HostingCompletedMailPayload {
  email: string;
  customerName: string;
  codigoReserva: string;
  valorTotal: string | number;
  quantidadeDiarias?: number;
  valorDiaria?: string | number;
}

export interface HostingCancellationMailPayload {
  email: string;
  customerName: string;
  codigoReserva: string;
  motivo?: string;
  valorMulta?: string | number;
  valorReembolso?: string | number;
  regraPolitica?: string;
}

export interface HostingNoShowMailPayload {
  email: string;
  customerName: string;
  codigoReserva: string;
  valorCobrado: string | number;
}

export interface HostingPaymentReminderMailPayload {
  email: string;
  customerName: string;
  codigoReserva: string;
  valorTotal: string | number;
  quantidadeDiarias?: number;
  valorDiaria?: string | number;
  checkIn: string;
  checkOut: string;
}

export interface ReviewPublishedMailPayload {
  email: string;
  name: string;
  domain: ReviewDomain;
  targetName: string | null;
  rating: number;
}
