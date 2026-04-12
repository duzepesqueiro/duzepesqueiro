import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { CreateEventDto } from './create-event.dto';

const EVENT_STATUSES = [
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'UPCOMING',
] as const;

export class UpdateEventDto extends PartialType(CreateEventDto) {
  @ApiPropertyOptional({
    enum: EVENT_STATUSES,
    example: 'UPCOMING',
  })
  @IsOptional()
  @IsString({ message: 'O status deve ser um texto.' })
  @IsIn(EVENT_STATUSES, {
    message:
      'O status deve ser SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED ou UPCOMING.',
  })
  status?: (typeof EVENT_STATUSES)[number];
}
