export enum DeliveryStatus {
  COMPLETE = 'COMPLETE',
  PARTIAL = 'PARTIAL',
  LATE = 'LATE',
}

export type DeliveryStatusValue = `${DeliveryStatus}`;
