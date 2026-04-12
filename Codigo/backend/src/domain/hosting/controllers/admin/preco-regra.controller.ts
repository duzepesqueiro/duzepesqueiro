import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
  CreatePrecoRegraDTO,
  ListPrecoRegrasQueryDTO,
  PrecoRegraDTO,
  PrecoRegraListDTO,
  PriceSimulationDTO,
  SimulacaoPrecoQueryDTO,
  TogglePrecoRegraDTO,
  UpdatePrecoRegraDTO,
} from '../../dto';
import { PrecoService } from '../../services';

type AuthUser = {
  id: string;
};

@Controller(['precos', 'api/precos'])
@ApiTags('Hosting - Preços Dinâmicos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class PrecoRegraController {
  constructor(private readonly precoService: PrecoService) {}

  @Get('regras')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar regras (Admin)' })
  @ApiResponse({ status: 200, type: PrecoRegraListDTO, isArray: true })
  async listarRegras(@Query() query: ListPrecoRegrasQueryDTO): Promise<PrecoRegraListDTO[]> {
    return this.precoService.listarRegras(query.includeInactive ?? false);
  }

  @Get('regras/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obter detalhes de regra' })
  @ApiResponse({ status: 200, type: PrecoRegraDTO })
  async obterRegra(@Param('id', ParseUUIDPipe) id: string): Promise<PrecoRegraDTO> {
    return this.precoService.obterRegra(id);
  }

  @Post('regras')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Criar regra (Admin)' })
  @ApiResponse({ status: 201, type: PrecoRegraDTO })
  async criarRegra(
    @Body() data: CreatePrecoRegraDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<PrecoRegraDTO> {
    return this.precoService.criarRegra(data, user.id);
  }

  @Put('regras/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar regra (Admin)' })
  @ApiResponse({ status: 200, type: PrecoRegraDTO })
  async atualizarRegra(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdatePrecoRegraDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<PrecoRegraDTO> {
    return this.precoService.atualizarRegra(id, {
      ...data,
      updatedById: user.id,
    });
  }

  @Patch('regras/:id/toggle')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Ativar/Desativar regra (Admin)' })
  @ApiResponse({ status: 200, type: PrecoRegraDTO })
  async toggleRegra(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: TogglePrecoRegraDTO,
  ): Promise<PrecoRegraDTO> {
    if (body.isActive === undefined) {
      const atual = await this.precoService.obterRegra(id);
      return atual.isActive
        ? this.precoService.desativarRegra(id)
        : this.precoService.ativarRegra(id);
    }
    return body.isActive
      ? this.precoService.ativarRegra(id)
      : this.precoService.desativarRegra(id);
  }

  @Delete('regras/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover regra (Admin)' })
  @ApiResponse({ status: 204, description: 'Regra removida' })
  async removerRegra(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.precoService.removerRegra(id);
  }

  @Get('simulacao')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Simular preços para uma data' })
  @ApiResponse({ status: 200, type: PriceSimulationDTO, isArray: true })
  async simularPrecos(@Query() query: SimulacaoPrecoQueryDTO): Promise<PriceSimulationDTO[]> {
    return this.precoService.simularPrecos(query.data);
  }

  @Get('chale/:chaleId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar regras de um chalé' })
  @ApiResponse({ status: 200, type: PrecoRegraListDTO, isArray: true })
  async listarRegrasDoChale(
    @Param('chaleId', ParseUUIDPipe) chaleId: string,
  ): Promise<PrecoRegraListDTO[]> {
    return this.precoService.listarRegrasDoChale(chaleId);
  }
}
