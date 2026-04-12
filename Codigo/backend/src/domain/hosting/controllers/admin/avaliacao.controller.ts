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
import { Public } from '../../../../application/auth/decorators/public.decorator';
import { Roles } from '../../../../application/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../application/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../application/auth/guards/roles.guard';
import {
  AvaliacaoDTO,
  AvaliacaoDetailDTO,
  AvaliacaoListDTO,
  CreateAvaliacaoRequestDTO,
  ListAvaliacoesChaleQueryDTO,
  UpdateAvaliacaoRequestDTO,
} from '../../dto';
import { AvaliacaoService } from '../../services';

type AuthUser = {
  id: string;
  role: UserRole;
};

@Controller(['avaliacoes', 'api/avaliacoes'])
@ApiTags('Hosting - Avaliações')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class AvaliacaoController {
  constructor(private readonly avaliacaoService: AvaliacaoService) {}

  @Get('chale/:chaleId')
  @Public()
  @ApiOperation({ summary: 'Listar avaliações do chalé' })
  @ApiResponse({ status: 200, type: AvaliacaoListDTO, isArray: true })
  async listarDoChale(
    @Param('chaleId', ParseUUIDPipe) chaleId: string,
    @Query() query: ListAvaliacoesChaleQueryDTO,
  ): Promise<AvaliacaoListDTO[]> {
    return this.avaliacaoService.listarAvaliacoesDoChale(chaleId, query.page, query.limit);
  }

  @Get('reserva/:reservaId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Obter avaliação da reserva' })
  @ApiResponse({ status: 200, type: AvaliacaoDetailDTO })
  async obterDaReserva(
    @Param('reservaId', ParseUUIDPipe) reservaId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<AvaliacaoDetailDTO> {
    const avaliacao = await this.avaliacaoService.obterAvaliacaoDaReserva(reservaId);
    this.ensureCanAccessOwnReview(user, avaliacao.userId ?? null);
    return avaliacao;
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Obter detalhes de avaliação' })
  @ApiResponse({ status: 200, type: AvaliacaoDetailDTO })
  async obter(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<AvaliacaoDetailDTO> {
    const avaliacao = await this.avaliacaoService.obterAvaliacao(id);
    this.ensureCanAccessOwnReview(user, avaliacao.userId ?? null);
    return avaliacao;
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Criar avaliação (Turista)' })
  @ApiResponse({ status: 201, type: AvaliacaoDTO })
  async criar(
    @Body() data: CreateAvaliacaoRequestDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<AvaliacaoDTO> {
    return this.avaliacaoService.criarAvaliacao(
      {
        reservationId: data.reservationId,
        chaletId: data.chaletId,
        rating: data.rating,
        comment: data.comment,
      },
      user.id,
    );
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Atualizar avaliação (Turista)' })
  @ApiResponse({ status: 200, type: AvaliacaoDTO })
  async atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateAvaliacaoRequestDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<AvaliacaoDTO> {
    const existing = await this.avaliacaoService.obterAvaliacao(id);
    this.ensureCanAccessOwnReview(user, existing.userId ?? null);
    return this.avaliacaoService.atualizarAvaliacao(id, data);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover avaliação (Admin)' })
  @ApiResponse({ status: 204, description: 'Avaliação removida' })
  async remover(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.avaliacaoService.removerAvaliacao(id);
  }

  private ensureCanAccessOwnReview(user: AuthUser, reviewUserId: string | null): void {
    if (user.role !== UserRole.CUSTOMER) {
      return;
    }
    if (!reviewUserId || reviewUserId !== user.id) {
      throw new BadRequestException('Usuário não possui acesso a esta avaliação.');
    }
  }
}
