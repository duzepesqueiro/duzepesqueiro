import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty({
    description: 'Título do evento',
    example: 'Torneio de Pesca 2026',
    minLength: 3,
    maxLength: 100,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'O título deve ser um texto.' })
  @IsNotEmpty({ message: 'O título é obrigatório.' })
  @MinLength(3, { message: 'O título deve ter no mínimo 3 caracteres.' })
  @MaxLength(100, { message: 'O título deve ter no máximo 100 caracteres.' })
  title: string;

  @ApiProperty({
    description: 'Descrição completa do evento',
    example: 'Competição esportiva com categorias de pesca em equipe.',
    minLength: 10,
    maxLength: 1000,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'A descrição deve ser um texto.' })
  @IsNotEmpty({ message: 'A descrição é obrigatória.' })
  @MinLength(10, { message: 'A descrição deve ter no mínimo 10 caracteres.' })
  @MaxLength(1000, { message: 'A descrição deve ter no máximo 1000 caracteres.' })
  description: string;

  @ApiProperty({
    description: 'Regras oficiais do evento',
    example: 'Uso obrigatório de colete salva-vidas e respeito aos horários.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'As regras devem ser um texto.' })
  @IsNotEmpty({ message: 'As regras são obrigatórias.' })
  rules: string;

  @ApiProperty({
    description: 'Local onde o evento ocorrerá',
    example: 'Lago Azul, setor norte',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'A localização deve ser um texto.' })
  @IsNotEmpty({ message: 'A localização é obrigatória.' })
  location: string;

  @ApiProperty({
    description: 'Quantidade total de vagas disponíveis',
    minimum: 1,
    example: 150,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'O total de vagas deve ser um número.' })
  @Min(1, { message: 'O total de vagas deve ser no mínimo 1.' })
  totalSlots: number;

  @ApiProperty({
    description: 'Data do evento',
    example: '2026-12-31',
    format: 'date',
  })
  @IsDateString(
    {},
    { message: 'A data do evento deve estar em formato ISO válido.' },
  )
  eventDate: string;

  @ApiProperty({
    description: 'Horário do evento no formato hh:mm',
    example: '19:30',
  })
  @IsString({ message: 'O horário deve ser um texto.' })
  @Matches(/^([01][0-9]|2[0-3]):([0-5][0-9])$/, {
    message: 'O horário deve estar no formato hh:mm.',
  })
  eventTime: string;

  @ApiPropertyOptional({
    description: 'Preço do evento quando isPaid for true',
    example: 99.9,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'O preço deve ser um número.' })
  @Min(0, { message: 'O preço deve ser maior ou igual a 0.' })
  price?: number;

  @ApiProperty({
    description: 'Define se o evento exige pagamento',
    default: false,
    example: false,
  })
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @Type(() => Boolean)
  @IsBoolean({ message: 'isPaid deve ser verdadeiro ou falso.' })
  isPaid: boolean = false;
}
