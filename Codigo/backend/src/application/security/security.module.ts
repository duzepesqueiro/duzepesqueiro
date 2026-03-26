import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { HelmetMiddleware } from './middlewares/helmet.middleware';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: Number.parseInt(process.env.THROTTLE_TTL ?? '60', 10),
        limit: Number.parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
      },
    ]),
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class SecurityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HelmetMiddleware).forRoutes('*');
  }
}
