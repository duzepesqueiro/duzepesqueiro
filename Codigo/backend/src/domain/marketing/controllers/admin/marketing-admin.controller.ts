import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../../../application/auth/decorators/current-user.decorator';
import { Roles } from '../../../../application/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../application/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../application/auth/guards/roles.guard';
import { MarketingAdminService } from '../../services';

class ListRecipientsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsString()
  search?: string;
}

class SendCampaignDto {
  @IsString()
  subject: string;

  @IsString()
  html: string;

  @IsIn(['all', 'selected'])
  mode: 'all' | 'selected';

  @IsOptional()
  userIds?: string[];
}

@Controller(['admin/marketing', 'api/admin/marketing'])
@ApiTags('Marketing - Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class MarketingAdminController {
  constructor(private readonly marketingAdminService: MarketingAdminService) {}

  @Get('recipients')
  @ApiOperation({ summary: 'Listar usuários para seleção de destinatários (paginado)' })
  async listRecipients(@Query() query: ListRecipientsQueryDto) {
    const data = await this.marketingAdminService.listRecipients(query);
    return { message: 'Destinatários carregados com sucesso', data };
  }

  @Post('campaigns/send')
  @ApiOperation({ summary: 'Criar e enviar campanha de e-mail' })
  async sendCampaign(
    @Body() payload: SendCampaignDto,
    @CurrentUser() currentUser: { id: string; role: UserRole },
  ) {
    const data = await this.marketingAdminService.sendCampaign({
      ...payload,
      triggeredBy: { id: currentUser.id, role: currentUser.role },
    });
    return { message: 'Campanha enviada com sucesso', data };
  }
}

