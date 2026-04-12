import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class RegisterEventDto {
  @ApiProperty({
    description: 'ID do evento para inscrição',
    example: 'b9e6a30b-51fd-4a42-8bb9-c9e6f5e3c645',
  })
  @IsNotEmpty({ message: 'O eventId é obrigatório.' })
  @IsUUID('4', { message: 'O eventId deve ser um UUID válido.' })
  eventId: string;
}
