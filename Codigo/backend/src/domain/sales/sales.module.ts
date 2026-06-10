import { Module } from '@nestjs/common';
import { AuthModule } from '../../application/auth/auth.module';
import { ExceptionModule } from '../../application/exception/exception.module';
import { LogsModule } from '../../application/logs/logs.module';
import { SecurityModule } from '../../application/security/security.module';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { SalesAdminController, SalesOrdersController } from './controllers';
import { SalesOrderRepository } from './repositories';
import { SalesAdminService, SalesOrdersService } from './services';

@Module({
  imports: [PrismaModule, AuthModule, ExceptionModule, SecurityModule, LogsModule],
  controllers: [SalesOrdersController, SalesAdminController],
  providers: [SalesOrderRepository, SalesOrdersService, SalesAdminService],
  exports: [SalesOrderRepository, SalesOrdersService],
})
export class SalesModule {}
