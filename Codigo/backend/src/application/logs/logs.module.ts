import { Global, Module } from '@nestjs/common';
import { LogsAdminController } from './controllers/admin/logs-admin.controller';
import { LogsEventsListener } from './listeners/logs-events.listener';
import { LogsMongoRepository } from './services/logs-mongo.repository';
import { LogsAdminService } from './services/admin/logs-admin.service';
import { LogsService } from './services/logs.service';

@Global()
@Module({
  controllers: [LogsAdminController],
  providers: [LogsMongoRepository, LogsService, LogsEventsListener, LogsAdminService],
  exports: [LogsService],
})
export class LogsModule {}
