import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReviewDomain, UserRole } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CreateReviewRequestDTO, ListReviewsQueryDTO, ReviewDTO, ReviewSummaryDTO, ReviewSummaryQueryDTO } from '../dto';
import { ReviewsService } from '../services';

type AuthUser = { id: string; role: UserRole };

@Controller(['reviews', 'api/reviews'])
@ApiTags('Reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Publicar uma avaliação' })
  @ApiResponse({ status: 201, type: ReviewDTO })
  async create(@Body() body: CreateReviewRequestDTO, @CurrentUser() user: AuthUser): Promise<ReviewDTO> {
    return this.reviewsService.createReview(body, user.id);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Listar avaliações por alvo (paginado)' })
  @ApiResponse({ status: 200, type: ReviewDTO, isArray: true })
  async list(@Query() query: ListReviewsQueryDTO): Promise<ReviewDTO[]> {
    return this.reviewsService.listReviews(query);
  }

  @Get('summary')
  @Public()
  @ApiOperation({ summary: 'Obter resumo (média e quantidade) por alvo' })
  @ApiResponse({ status: 200, type: ReviewSummaryDTO })
  async summary(@Query() query: ReviewSummaryQueryDTO): Promise<ReviewSummaryDTO> {
    return this.reviewsService.getSummary({ domain: query.domain, targetId: query.targetId });
  }

  @Get('subject/:domain/:subjectId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Obter avaliação por registro (ex.: reservationId, rentalId, registrationId)' })
  @ApiResponse({ status: 200, type: ReviewDTO })
  async getBySubject(
    @Param('domain', new ParseEnumPipe(ReviewDomain)) domain: ReviewDomain,
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ReviewDTO> {
    return this.reviewsService.getBySubject({ domain, subjectId }, user.id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover avaliação (Admin)' })
  @ApiResponse({ status: 204, description: 'Avaliação removida' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.reviewsService.deleteReview(id);
  }
}
