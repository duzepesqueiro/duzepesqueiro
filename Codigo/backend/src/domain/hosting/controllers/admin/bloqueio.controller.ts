import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../../../application/auth/decorators/current-user.decorator';
import { Roles } from '../../../../application/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../application/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../application/auth/guards/roles.guard';
import {
  BloqueioDTO,
  BloqueioListDTO,
  CreateBloqueioRequestDTO,
  ListBloqueiosQueryDTO,
  UpdateBloqueioRequestDTO,
} from '../../dto';
import { BloqueioService } from '../../services';

type AuthUser = {
  id: string;
  role: UserRole;
};

@Controller(['bloqueios', 'api/bloqueios'])
@ApiTags('Hosting - Bloqueios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class BloqueioController {
  constructor(private readonly bloqueioService: BloqueioService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Listar bloqueios (Admin/Operador)' })
  @ApiResponse({ status: 200, type: BloqueioListDTO, isArray: true })
  async listar(@Query() query: ListBloqueiosQueryDTO): Promise<BloqueioListDTO[]> {
    return this.bloqueioService.listarBloqueios({
      chaleId: query.chaleId,
      isActive: query.isActive,
      reason: query.reason,
      dataInicioFrom: query.dataInicioFrom?.toISOString(),
      dataFimTo: query.dataFimTo?.toISOString(),
    });
  }

  @Get('chale/:chaleId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Listar bloqueios de um chalé' })
  @ApiResponse({ status: 200, type: BloqueioListDTO, isArray: true })
  async listarDoChale(
    @Param('chaleId', ParseUUIDPipe) chaleId: string,
  ): Promise<BloqueioListDTO[]> {
    return this.bloqueioService.listarBloqueiosDoChale(chaleId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Obter detalhes de bloqueio' })
  @ApiResponse({ status: 200, type: BloqueioDTO })
  async obter(@Param('id', ParseUUIDPipe) id: string): Promise<BloqueioDTO> {
    return this.bloqueioService.obterBloqueio(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Criar bloqueio (Operador/Admin)' })
  @ApiResponse({ status: 201, type: BloqueioDTO })
  async criar(
    @Body() data: CreateBloqueioRequestDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<BloqueioDTO> {
    this.validateDateRange(data.dataInicio, data.dataFim);
    return this.bloqueioService.criarBloqueio(
      {
        chaletId: data.chaletId,
        dataInicio: data.dataInicio.toISOString(),
        dataFim: data.dataFim.toISOString(),
        reason: data.reason,
        notes: data.notes,
        isActive: data.isActive,
      },
      user.id,
    );
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar bloqueio (Admin)' })
  @ApiResponse({ status: 200, type: BloqueioDTO })
  async atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateBloqueioRequestDTO,
  ): Promise<BloqueioDTO> {
    if (data.dataInicio && data.dataFim) {
      this.validateDateRange(data.dataInicio, data.dataFim);
    }

    return this.bloqueioService.atualizarBloqueio(id, {
      chaletId: data.chaletId,
      dataInicio: data.dataInicio?.toISOString(),
      dataFim: data.dataFim?.toISOString(),
      reason: data.reason,
      notes: data.notes,
      isActive: data.isActive,
    });
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover bloqueio (Admin)' })
  @ApiResponse({ status: 204, description: 'Bloqueio removido' })
  async remover(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.bloqueioService.removerBloqueio(id);
  }

  private validateDateRange(dataInicio: Date, dataFim: Date): void {
    if (dataFim <= dataInicio) {
      throw new BadRequestException('Data fim deve ser posterior à data início.');
    }
  }
}
