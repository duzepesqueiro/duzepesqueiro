import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChaleType, ReservationStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsDate, IsIn, IsOptional, IsUUID } from 'class-validator';

export class DateRangeDTO {
  @ApiProperty()
  @Transform(({ value }) => (value ? new Date(value) : value))
  @IsDate()
  startDate: Date;

  @ApiProperty()
  @Transform(({ value }) => (value ? new Date(value) : value))
  @IsDate()
  endDate: Date;
}

export class HospedagemKPIsDTO {
  totalChales: number;
  chalesOcupados: number;
  taxaOcupacao: number;
  reservasAtivas: number;
  reservasCanceladas: number;
  receitaTotal: number;
}

export class ReceitaChaleDTO {
  chaletId: string;
  chaletNome: string;
  chaletTipo: ChaleType;
  receitaTotal: number;
  totalReservas: number;
}

export class OcupacaoDiariaDTO {
  chaletId: string;
  chaletNome: string;
  status: 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'BLOCKED';
  dataReferencia: Date;
}

export class MapaOcupacaoDiaDTO {
  data: Date;
  status: 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'BLOCKED';
}

export class MapaOcupacaoDTO {
  chaletId: string;
  chaletNome: string;
  mes: number;
  ano: number;
  dias: MapaOcupacaoDiaDTO[];
}

export class GraficoBarrasDTO {
  labels: string[];
  receitas: number[];
  reservas: number[];
}

export class DashboardPeriodoQueryDTO {
  @ApiPropertyOptional({ enum: ['semana', 'mes', 'ano'], default: 'mes' })
  @IsOptional()
  @IsIn(['semana', 'mes', 'ano'])
  periodo?: 'semana' | 'mes' | 'ano';

  @ApiPropertyOptional({ description: 'Data de referência (ISO)' })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : value))
  @IsDate()
  dataReferencia?: Date;

  @ApiPropertyOptional({ description: 'Chalé específico', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  chaleId?: string;
}

export class DashboardReservasStatsDTO {
  status: Record<ReservationStatus, number>;
  taxaOcupacao: number;
}
