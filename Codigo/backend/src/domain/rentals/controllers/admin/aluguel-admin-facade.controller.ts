import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { Roles } from '../../../../application/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../application/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../application/auth/guards/roles.guard';
import { RentalAdminFacadeService } from '../../services/admin/aluguel-admin-facade.service';

class TimelineQueryDto {
  @IsOptional()
  @IsIn(['today', 'week', 'month'])
  range?: 'today' | 'week' | 'month' = 'today';
}

class ReturnPayloadDto {
  @IsOptional()
  @IsString()
  condition?: string | null;
}

class ConditionPayloadDto {
  @IsOptional()
  @IsString()
  condition?: string | null;
}

@Controller(['admin/alugueis', 'api/admin/alugueis'])
@ApiTags('Rental - Admin Facade')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false,
  }),
)
export class AluguelAdminFacadeController {
  constructor(private readonly facade: RentalAdminFacadeService) {}

  @Get('kpis')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get rental KPI cards for admin dashboard' })
  async getKpis() {
    return this.facade.getKpis();
  }

  @Get('history')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get rental history for admin dashboard' })
  async getHistory() {
    return this.facade.getHistory();
  }

  @Get('timeline')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get rental timeline for admin dashboard' })
  async getTimeline(@Query() query: TimelineQueryDto) {
    return this.facade.getTimeline(query.range ?? 'today');
  }

  @Patch(':id/return')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Mark rental as returned' })
  async markReturned(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: ReturnPayloadDto,
  ) {
    return this.facade.markAsReturned(id, payload.condition);
  }

  @Patch(':id/condition')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Update condition for rental items' })
  async updateCondition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: ConditionPayloadDto,
  ) {
    return this.facade.updateCondition(id, payload.condition);
  }
}

export { AluguelAdminFacadeController as RentalAdminFacadeController };
