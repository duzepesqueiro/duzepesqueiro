import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { TransformInterceptor } from '../interceptors/transform.interceptor';

@Injectable()
export class CustomValidationPipe implements PipeTransform {
  constructor(
    private readonly whitelist = true,
    private readonly forbidNonWhitelisted = true,
    private readonly shouldTransform = true,
  ) {}

  transform(value: any, { metatype }: ArgumentMetadata): any {
    if (!this.shouldTransform || !metatype) {
      return value;
    }

    if (value instanceof TransformInterceptor) {
      return value;
    }

    return plainToInstance(metatype, value, {
      excludeExtraneousValues: this.whitelist || this.forbidNonWhitelisted,
    });
  }
}
