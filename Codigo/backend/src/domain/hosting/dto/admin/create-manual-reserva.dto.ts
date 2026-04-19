import { CreateHospedeDTO } from './create-hospede.dto';
import { CreateReservaDTO } from './create-reserva.dto';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';

export class CreateManualReservaDTO extends CreateReservaDTO {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateHospedeDTO)
  guests?: CreateHospedeDTO[];
}
