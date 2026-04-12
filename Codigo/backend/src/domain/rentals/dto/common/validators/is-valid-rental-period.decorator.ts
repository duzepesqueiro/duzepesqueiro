import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { RentalPeriod } from '@prisma/client';

function isValidByPeriod(period: RentalPeriod | undefined, value: number): boolean {
  if (!Number.isFinite(value) || value < 1) {
    return false;
  }
  if (period === RentalPeriod.DAILY) {
    return value >= 1 && value <= 365;
  }
  if (period === RentalPeriod.WEEKLY) {
    return value >= 1 && value <= 52;
  }
  if (period === RentalPeriod.MONTHLY) {
    return value >= 1 && value <= 12;
  }
  return false;
}

export function IsValidRentalPeriod(
  periodTypeField: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'IsValidRentalPeriod',
      target: target.constructor,
      propertyName: propertyName.toString(),
      constraints: [periodTypeField],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const [periodField] = args.constraints;
          const period = (args.object as Record<string, unknown>)[periodField] as
            | RentalPeriod
            | undefined;
          return isValidByPeriod(period, Number(value));
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} é inválido para o período informado. Use mínimo de 1 dia e máximo de 12 meses.`;
        },
      },
    });
  };
}
