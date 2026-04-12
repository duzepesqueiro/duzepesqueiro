import { Module } from '@nestjs/common';
import { AuthModule } from '../../application/auth/auth.module';
import { LogsModule } from '../../application/logs/logs.module';
import { MailModule } from '../../application/mail/mail.module';
import { NotificationsModule } from '../../application/notifications/notifications.module';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { UsersAdminController, UsersUserController } from './controllers';
import { UsersRepository } from './repositories';
import { UsersService } from './services';

@Module({
  imports: [PrismaModule, AuthModule, LogsModule, MailModule, NotificationsModule],
  controllers: [UsersAdminController, UsersUserController],
  providers: [UsersRepository, UsersService],
  exports: [UsersRepository, UsersService],
})
export class UsersModule {}
