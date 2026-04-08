import type { Room, Reservation, Guest } from './booking';

export type RoomStatus = 'free' | 'occupied' | 'reserved' | 'blocked';

export interface DateBlock {
  id: string;
  roomId: string;
  startDate: string;
  endDate: string;
  reason: 'maintenance' | 'cleaning' | 'administrative' | 'interdiction';
  notes: string;
}

export interface PricingRule {
  id: string;
  name: string;
  type: 'season' | 'weekend' | 'holiday' | 'discount';
  startDate: string;
  endDate: string;
  modifier: number; // percentage: 1.3 = +30%, 0.8 = -20%
  roomIds: string[]; // empty = all rooms
  active: boolean;
}

export interface AdminReservation extends Reservation {
  checkInAt?: Date;
  checkOutAt?: Date;
  noShow?: boolean;
  cancellationPenalty?: string;
}

export interface RoomWithStatus extends Room {
  status: RoomStatus;
  currentReservation?: AdminReservation;
}

export interface DashboardMetrics {
  totalRooms: number;
  occupiedRooms: number;
  reservedRooms: number;
  freeRooms: number;
  blockedRooms: number;
  occupancyRate: number;
  totalRevenue: number;
  avgDailyRate: number;
  cancelledReservations: number;
  activeReservations: number;
}
