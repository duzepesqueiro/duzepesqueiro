import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseDatePipe implements PipeTransform<string, Date> {
  transform(value: string): Date {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException('Data inválida: valor vazio.');
    }

    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) {
      throw new BadRequestException('Data inválida: use o formato dd/mm/yyyy.');
    }

    const [, dayRaw, monthRaw, yearRaw] = match;
    const day = Number(dayRaw);
    const month = Number(monthRaw);
    const year = Number(yearRaw);
    const date = new Date(year, month - 1, day, 0, 0, 0, 0);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      throw new BadRequestException('Data inválida: valor inexistente.');
    }

    return date;
  }
}
