export const InventoryEventTypes = {
  INVENTORY_UPDATED: 'inventory.updated',
  INVENTORY_LOW_STOCK: 'inventory.low.stock',
} as const;

export type InventoryEventType =
  (typeof InventoryEventTypes)[keyof typeof InventoryEventTypes];
