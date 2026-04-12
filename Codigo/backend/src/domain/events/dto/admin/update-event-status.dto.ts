import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

const EVENT_STATUSES = [
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'UPCOMING',
] as const;

export class UpdateEventStatusDto {
  @ApiProperty({ enum: EVENT_STATUSES, example: 'IN_PROGRESS' })
  @IsString({ message: 'O status deve ser um texto.' })
  @IsIn(EVENT_STATUSES, {
    message:
      'O status deve ser SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED ou UPCOMING.',
  })
  status: (typeof EVENT_STATUSES)[number];
}
