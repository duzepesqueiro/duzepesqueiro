import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsCnpj } from '../../../../../shared/validators';

/**
 * DTO para criação de fornecedor.
 */
export class CreateSupplierDto {
  @ApiProperty({ description: 'Nome do fornecedor', maxLength: 255 })
  @IsString({ message: 'O nome do fornecedor deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome do fornecedor é obrigatório.' })
  @MaxLength(255, { message: 'O nome do fornecedor deve ter no máximo 255 caracteres.' })
  name: string;

  @ApiProperty({ description: 'CNPJ do fornecedor (aceita máscara ou somente números)' })
  @IsString({ message: 'O CNPJ deve ser um texto.' })
  @IsNotEmpty({ message: 'O CNPJ é obrigatório.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\D/g, '') : value))
  @IsCnpj({ message: 'CNPJ inválido.' })
  cnpj: string;

  @ApiProperty({ description: 'Classificação do fornecedor (1 a 5)', minimum: 1, maximum: 5 })
  @Transform(({ value }) => Number(value))
  @IsInt({ message: 'A classificação deve ser um número inteiro.' })
  @Min(1, { message: 'A classificação mínima é 1.' })
  @Max(5, { message: 'A classificação máxima é 5.' })
  rating: number;

  @ApiPropertyOptional({ description: 'Telefone de contato do fornecedor' })
  @IsOptional()
  @IsString({ message: 'O telefone deve ser um texto.' })
  phone?: string;

  @ApiPropertyOptional({ description: 'E-mail de contato do fornecedor' })
  @IsOptional()
  @IsEmail({}, { message: 'O e-mail informado é inválido.' })
  email?: string;

  @ApiPropertyOptional({ description: 'Endereço completo do fornecedor' })
  @IsOptional()
  @IsString({ message: 'O endereço deve ser um texto.' })
  address?: string;
}
