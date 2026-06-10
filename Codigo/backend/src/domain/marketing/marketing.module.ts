import { Module } from '@nestjs/common';
import { AuthModule } from '../../application/auth/auth.module';
import { LogsModule } from '../../application/logs/logs.module';
import { MailModule } from '../../application/mail/mail.module';
import { SecurityModule } from '../../application/security/security.module';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { UsersModule } from '../users';
import { MarketingAdminController } from './controllers';
import { MarketingAdminService } from './services';

@Module({
  imports: [PrismaModule, AuthModule, SecurityModule, LogsModule, MailModule, UsersModule],
  controllers: [MarketingAdminController],
  providers: [MarketingAdminService],
  exports: [MarketingAdminService],
})
export class MarketingModule {}

