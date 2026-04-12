import { Global, Module } from '@nestjs/common';
import { LogsEventsListener } from './listeners/logs-events.listener';
import { LogsMongoRepository } from './services/logs-mongo.repository';
import { LogsService } from './services/logs.service';

@Global()
@Module({
  providers: [LogsMongoRepository, LogsService, LogsEventsListener],
  exports: [LogsService],
})
export class LogsModule {}
