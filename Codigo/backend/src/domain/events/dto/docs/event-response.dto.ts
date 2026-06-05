import { ApiProperty } from '@nestjs/swagger';

export class MessageResponseDto {
  @ApiProperty({ example: 'Operação realizada com sucesso' })
  message: string;
}

export class EventResponseDto {
  @ApiProperty({ example: '7e92f4af-06a3-497e-82c3-faf0fcd49527' })
  id: string;

  @ApiProperty({ example: 'Torneio de Pesca 2026' })
  title: string;

  @ApiProperty({ example: 'Evento de pesca esportiva com premiações.' })
  description: string;

  @ApiProperty({ example: 'Chegar 30 minutos antes. Proibido redes.' })
  rules: string;

  @ApiProperty({ example: 'Lago Azul - Setor Norte' })
  location: string;

  @ApiProperty({ example: 'https://cdn.example.com/events/evento-1.webp' })
  imageUrl: string;

  @ApiProperty({ example: 'events/evento-1.webp' })
  imageKey: string;

  @ApiProperty({
    type: [String],
    example: [
      'https://cdn.example.com/events/evento-1.webp',
      'https://cdn.example.com/events/evento-2.webp',
    ],
  })
  images: string[];

  @ApiProperty({ example: 120 })
  totalSlots: number;

  @ApiProperty({ example: 75 })
  availableSlots: number;

  @ApiProperty({ example: '2026-08-18T00:00:00.000Z' })
  eventDate: Date;

  @ApiProperty({ example: '08:30' })
  eventTime: string;

  @ApiProperty({
    enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'UPCOMING'],
    example: 'UPCOMING',
  })
  status: string;

  @ApiProperty({ example: 75.9, nullable: true })
  price?: number | null;

  @ApiProperty({ example: true })
  isPaid: boolean;

  @ApiProperty({ example: '2026-03-24T14:10:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-24T14:15:00.000Z' })
  updatedAt: Date;
}

export class EventCardResponseDto {
  @ApiProperty({ example: '7e92f4af-06a3-497e-82c3-faf0fcd49527' })
  id: string;

  @ApiProperty({ example: 'Torneio de Pesca 2026' })
  title: string;

  @ApiProperty({ example: 'https://cdn.example.com/events/evento-1.webp' })
  imageUrl: string;

  @ApiProperty({
    type: [String],
    example: [
      'https://cdn.example.com/events/evento-1.webp',
      'https://cdn.example.com/events/evento-2.webp',
    ],
  })
  images: string[];

  @ApiProperty({ example: 'Lago Azul - Setor Norte' })
  location: string;

  @ApiProperty({ example: '2026-08-18T00:00:00.000Z' })
  eventDate: Date;

  @ApiProperty({ example: '08:30' })
  eventTime: string;

  @ApiProperty({
    enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'UPCOMING'],
    example: 'UPCOMING',
  })
  status: string;

  @ApiProperty({ example: true })
  isPaid: boolean;

  @ApiProperty({ example: 75.9, nullable: true })
  price?: number | null;

  @ApiProperty({ example: 75 })
  availableSlots: number;

  @ApiProperty({ example: 120 })
  totalSlots: number;
}

export class EventRegistrationResponseDto {
  @ApiProperty({ example: '8747733d-20f8-4d1f-ac53-84fe95f47fcb' })
  id: string;

  @ApiProperty({ example: 'baf5acc6-9b9f-40d0-983f-be2cc143f6fd' })
  userId: string;

  @ApiProperty({ example: '7e92f4af-06a3-497e-82c3-faf0fcd49527' })
  eventId: string;

  @ApiProperty({ enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'PAID'], example: 'PENDING' })
  status: string;

  @ApiProperty({ enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'], nullable: true, example: 'PENDING' })
  paymentStatus?: string | null;

  @ApiProperty({ example: 'event_7e92f4af-06a3-497e-82c3-faf0fcd49527', nullable: true })
  orderId?: string | null;

  @ApiProperty({ example: '2026-03-24T14:20:00.000Z' })
  registeredAt: Date;
}

export class UserEventRegistrationResponseDto {
  @ApiProperty({ example: '8747733d-20f8-4d1f-ac53-84fe95f47fcb' })
  registrationId: string;

  @ApiProperty({ enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'PAID'], example: 'PENDING' })
  status: string;

  @ApiProperty({ enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'], nullable: true, example: 'PENDING' })
  paymentStatus?: string | null;

  @ApiProperty({ example: 'event_7e92f4af-06a3-497e-82c3-faf0fcd49527', nullable: true })
  orderId?: string | null;

  @ApiProperty({ example: '2026-03-24T14:20:00.000Z' })
  registeredAt: Date;

  @ApiProperty({ type: EventCardResponseDto })
  event: EventCardResponseDto;
}

export class RegistrationStatusResponseDto {
  @ApiProperty({ example: true })
  isRegistered: boolean;

  @ApiProperty({ required: false, type: EventRegistrationResponseDto })
  registration?: EventRegistrationResponseDto;
}

export class PaymentIntentResponseDto {
  @ApiProperty({ example: '128439201' })
  paymentId: string;

  @ApiProperty({ example: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=...' })
  checkoutUrl: string;

  @ApiProperty({ example: 75.9 })
  amount: number;

  @ApiProperty({ example: 'BRL' })
  currency: string;

  @ApiProperty({ example: '2026-03-24T15:00:00.000Z' })
  expiresAt: Date;
}

export class PaymentStatusResponseDto {
  @ApiProperty({ example: '8747733d-20f8-4d1f-ac53-84fe95f47fcb' })
  registrationId: string;

  @ApiProperty({ enum: ['PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED'], example: 'PAID' })
  status: string;

  @ApiProperty({ enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'], nullable: true, example: 'PAID' })
  paymentStatus: string | null;

  @ApiProperty({ nullable: true, example: 'event_7e92f4af-06a3-497e-82c3-faf0fcd49527' })
  orderId?: string | null;

  @ApiProperty({ nullable: true, example: '128439201' })
  paymentId?: string | null;

  @ApiProperty({ nullable: true, example: 75.9 })
  amount?: number | null;

  @ApiProperty({ nullable: true, example: '2026-03-24T14:31:00.000Z' })
  paidAt?: Date | null;
}

export class WebhookAckResponseDto {
  @ApiProperty({ example: true })
  received: true;
}

export class KpiResponseDto {
  @ApiProperty({ example: 25 })
  value: number;

  @ApiProperty({ example: 20 })
  previousValue: number;

  @ApiProperty({ example: 25 })
  percentageChange: number;

  @ApiProperty({ enum: ['increase', 'decrease', 'stable'], example: 'increase' })
  changeType: string;

  @ApiProperty({ nullable: true, example: 30 })
  goal: number | null;

  @ApiProperty({ nullable: true, example: 83.3 })
  goalPercentage: number | null;

  @ApiProperty({ enum: ['achieved', 'in_progress', 'not_set'], example: 'in_progress' })
  goalStatus: string;
}

export class KpiGoalResponseDto {
  @ApiProperty({ example: '956dc9c8-f2c5-4ca9-aa83-ec06487f3274' })
  id: string;

  @ApiProperty({
    enum: ['ACTIVE_EVENTS', 'REGISTERED_PARTICIPANTS', 'REGISTRATION_PERCENTAGE', 'SOLD_OUT_EVENTS'],
    example: 'ACTIVE_EVENTS',
  })
  kpiType: string;

  @ApiProperty({ example: 30 })
  targetValue: number;

  @ApiProperty({ example: 7 })
  month: number;

  @ApiProperty({ example: 2026 })
  year: number;
}

export class AllKpisResponseDto {
  @ApiProperty({ type: KpiResponseDto })
  activeEvents: KpiResponseDto;

  @ApiProperty({ type: KpiResponseDto })
  registeredParticipants: KpiResponseDto;

  @ApiProperty({ type: KpiResponseDto })
  registrationPercentage: KpiResponseDto;

  @ApiProperty({ type: KpiResponseDto })
  soldOutEvents: KpiResponseDto;
}

export class MonthlyChartResponseDto {
  @ApiProperty({ type: [String], example: ['Jan', 'Fev', 'Mar'] })
  months: string[];

  @ApiProperty({ type: [Number], example: [35, 52, 41] })
  participants: number[];

  @ApiProperty({ type: [Number], example: [3, 5, 4] })
  events: number[];

  @ApiProperty({ example: 128 })
  totalParticipants: number;

  @ApiProperty({ example: 12 })
  totalEvents: number;
}

export class WeeklyChartResponseDto {
  @ApiProperty({ type: [String], example: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] })
  days: string[];

  @ApiProperty({ type: [Number], example: [12, 8, 5, 9, 7, 11, 4] })
  participants: number[];

  @ApiProperty({ type: [Number], example: [2, 1, 1, 2, 1, 2, 1] })
  events: number[];

  @ApiProperty({ example: 56 })
  totalParticipants: number;

  @ApiProperty({ example: 10 })
  totalEvents: number;
}

export class YearlyChartResponseDto {
  @ApiProperty({ type: [Number], example: [2024, 2025, 2026] })
  years: number[];

  @ApiProperty({ type: [Number], example: [450, 612, 701] })
  participants: number[];

  @ApiProperty({ type: [Number], example: [30, 42, 47] })
  events: number[];

  @ApiProperty({ example: 1763 })
  totalParticipants: number;

  @ApiProperty({ example: 119 })
  totalEvents: number;
}

export class StatusDistributionResponseDto {
  @ApiProperty({ example: 8 })
  scheduled: number;

  @ApiProperty({ example: 2 })
  inProgress: number;

  @ApiProperty({ example: 15 })
  completed: number;

  @ApiProperty({ example: 1 })
  cancelled: number;

  @ApiProperty({ example: 4 })
  upcoming: number;
}

export class TrendDataResponseDto {
  @ApiProperty({ type: [String], example: ['Abr', 'Mai', 'Jun'] })
  labels: string[];

  @ApiProperty({ type: [Number], example: [20, 30, 45] })
  values: number[];

  @ApiProperty({ type: [Number], example: [18, 25, 32] })
  movingAverage: number[];

  @ApiProperty({ enum: ['upward', 'downward', 'stable'], example: 'upward' })
  trend: string;
}

export class TopEventResponseDto {
  @ApiProperty({ example: '7e92f4af-06a3-497e-82c3-faf0fcd49527' })
  eventId: string;

  @ApiProperty({ example: 'Torneio de Pesca 2026' })
  title: string;

  @ApiProperty({ example: 112 })
  participants: number;

  @ApiProperty({ example: 120 })
  totalSlots: number;

  @ApiProperty({ example: 8 })
  availableSlots: number;

  @ApiProperty({ example: 93.3 })
  occupancyPercentage: number;
}

export class PaginatedEventResponseDto {
  @ApiProperty({ type: [EventResponseDto] })
  items: EventResponseDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  pageSize: number;
}

export class PaginatedEventCardResponseDto {
  @ApiProperty({ type: [EventCardResponseDto] })
  items: EventCardResponseDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  pageSize: number;
}
