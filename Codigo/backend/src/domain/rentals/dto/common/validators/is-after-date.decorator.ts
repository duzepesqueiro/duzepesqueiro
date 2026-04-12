import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function IsAfterDate(
  property: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'IsAfterDate',
      target: target.constructor,
      propertyName: propertyName.toString(),
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          if (!value) {
            return true;
          }
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as Record<string, unknown>)[
            relatedPropertyName
          ];
          if (!relatedValue) {
            return true;
          }
          const currentDate = new Date(String(value));
          const relatedDate = new Date(String(relatedValue));
          if (Number.isNaN(currentDate.getTime()) || Number.isNaN(relatedDate.getTime())) {
            return false;
          }
          return currentDate.getTime() > relatedDate.getTime();
        },
        defaultMessage(args: ValidationArguments): string {
          const [relatedPropertyName] = args.constraints;
          return `${args.property} deve ser maior que ${relatedPropertyName}.`;
        },
      },
    });
  };
}
