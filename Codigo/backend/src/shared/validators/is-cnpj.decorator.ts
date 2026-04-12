import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function allDigitsEqual(value: string): boolean {
  return /^(\d)\1+$/.test(value);
}

function calculateVerifier(base: string, weights: number[]): number {
  const sum = base
    .split('')
    .reduce((acc, digit, index) => acc + Number(digit) * weights[index], 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

function isValidCnpj(value: string): boolean {
  const cleaned = onlyDigits(value);
  if (cleaned.length !== 14 || allDigitsEqual(cleaned)) {
    return false;
  }

  const firstBase = cleaned.slice(0, 12);
  const firstWeights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const firstDigit = calculateVerifier(firstBase, firstWeights);
  if (firstDigit !== Number(cleaned[12])) {
    return false;
  }

  const secondBase = cleaned.slice(0, 13);
  const secondWeights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const secondDigit = calculateVerifier(secondBase, secondWeights);
  return secondDigit === Number(cleaned[13]);
}

export function IsCnpj(validationOptions?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'IsCnpj',
      target: target.constructor,
      propertyName: propertyName.toString(),
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') {
            return false;
          }
          return isValidCnpj(value);
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} deve conter um CNPJ válido.`;
        },
      },
    });
  };
}
