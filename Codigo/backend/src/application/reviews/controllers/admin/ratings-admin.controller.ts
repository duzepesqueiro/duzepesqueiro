import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { ListAdminRatingsQueryDTO, UpdateAdminRatingRequestDTO } from '../../dto';
import { RatingsAdminService } from '../../services/admin/ratings-admin.service';

@Controller(['admin/ratings', 'api/admin/ratings'])
@ApiTags('Admin - Ratings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
export class RatingsAdminController {
  constructor(private readonly ratingsAdminService: RatingsAdminService) {}

  @Get()
  @ApiOperation({ summary: 'Listar avaliações (todos os domínios)' })
  async list(@Query() query: ListAdminRatingsQueryDTO) {
    return this.ratingsAdminService.list(query);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar avaliação (Admin)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateAdminRatingRequestDTO,
  ) {
    return this.ratingsAdminService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover avaliação (Admin)' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.ratingsAdminService.remove(id);
  }
}

