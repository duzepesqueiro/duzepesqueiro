import { CreateHospedeDTO } from './create-hospede.dto';
import { CreateReservaDTO } from './create-reserva.dto';

export class CreateManualReservaDTO extends CreateReservaDTO {
  guests?: CreateHospedeDTO[];
}
