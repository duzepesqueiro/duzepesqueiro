import { IsBoolean, IsEmail, IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateHospedeDTO {
  @IsOptional()
  @IsUUID('4')
  reservationId?: string;
  @IsString()
  @MaxLength(255)
  fullName: string;
  @IsOptional()
  @IsEmail()
  email?: string;
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
  @IsOptional()
  @IsString()
  @MaxLength(14)
  cpf?: string;
  @IsOptional()
  @IsString()
  @MaxLength(20)
  rg?: string;
  @IsOptional()
  @IsISO8601()
  birthDate?: string;
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
