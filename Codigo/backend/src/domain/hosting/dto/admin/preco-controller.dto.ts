import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsDate, IsOptional } from 'class-validator';

export class ListPrecoRegrasQueryDTO {
  @ApiPropertyOptional({ description: 'Incluir regras inativas', default: false })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : value === 'true' || value === true))
  @IsBoolean()
  includeInactive?: boolean;
}

export class SimulacaoPrecoQueryDTO {
  @ApiProperty({ description: 'Data de simulação (ISO string)' })
  @Transform(({ value }) => (value ? new Date(value) : value))
  @IsDate()
  data: Date;
}

export class TogglePrecoRegraDTO {
  @ApiPropertyOptional({ description: 'Definir status ativo/inativo. Se omitido, alterna automaticamente.' })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : value === 'true' || value === true))
  @IsBoolean()
  isActive?: boolean;
}
