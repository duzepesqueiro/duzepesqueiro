export const HostingEventTypes = {
  HOSTING_BOOKED: 'hosting.booked',
  HOSTING_PAID: 'hosting.paid',
  HOSTING_CANCELLED: 'hosting.cancelled',
  HOSTING_CHECKIN: 'hosting.checkin',
  HOSTING_CHECKOUT: 'hosting.checkout',
} as const;

export type HostingEventType = (typeof HostingEventTypes)[keyof typeof HostingEventTypes];
