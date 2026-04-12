interface HostingBaseEventPayload {
  timestamp: Date;
  triggeredBy: string;
}

export interface HostingBookedPayload extends HostingBaseEventPayload {
  hostingId: string;
  userId: string;
  accommodationId: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  total: number;
}
