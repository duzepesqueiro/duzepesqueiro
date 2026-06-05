import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { ReviewsController } from './controllers';
import { ReviewsRepository } from './repositories';
import { ReviewsService } from './services';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [ReviewsController],
  providers: [ReviewsRepository, ReviewsService],
  exports: [ReviewsService, ReviewsRepository],
})
export class ReviewsModule {}

