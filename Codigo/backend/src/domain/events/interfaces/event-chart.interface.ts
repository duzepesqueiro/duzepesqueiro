export interface IMonthlyChartData {
  months: string[];
  participants: number[];
  events: number[];
  totalParticipants: number;
  totalEvents: number;
}

export interface IWeeklyChartData {
  days: string[];
  participants: number[];
  events: number[];
  totalParticipants: number;
  totalEvents: number;
}

export interface IYearlyChartData {
  years: number[];
  participants: number[];
  events: number[];
  totalParticipants: number;
  totalEvents: number;
}

export interface IStatusDistribution {
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  upcoming: number;
}

export interface ITrendData {
  labels: string[];
  values: number[];
  movingAverage: number[];
  trend: 'upward' | 'downward' | 'stable';
}

export interface ITopEvent {
  eventId: string;
  title: string;
  participants: number;
  totalSlots: number;
  availableSlots: number;
  occupancyPercentage: number;
}
