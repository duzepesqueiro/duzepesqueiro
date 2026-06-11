import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { ReviewsController } from './controllers';
import { RatingsAdminController } from './controllers/admin/ratings-admin.controller';
import { ReviewsRepository } from './repositories';
import { ReviewsService } from './services';
import { RatingsAdminService } from './services/admin/ratings-admin.service';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [ReviewsController, RatingsAdminController],
  providers: [ReviewsRepository, ReviewsService, RatingsAdminService],
  exports: [ReviewsService, ReviewsRepository],
})
export class ReviewsModule {}

