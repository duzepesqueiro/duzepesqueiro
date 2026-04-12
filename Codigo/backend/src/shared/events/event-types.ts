import { EventsEventTypes } from './events/event-types';
import { HostingEventTypes } from './hosting/event-types';
import { InventoryEventTypes } from './inventory/event-types';
import { RentalEventTypes } from './rental/event-types';
import { SalesEventTypes } from './sales/event-types';
import { UserEventTypes } from './user/event-types';

export const EventTypes = {
  ...SalesEventTypes,
  ...RentalEventTypes,
  ...EventsEventTypes,
  ...HostingEventTypes,
  ...UserEventTypes,
  ...InventoryEventTypes,
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];
