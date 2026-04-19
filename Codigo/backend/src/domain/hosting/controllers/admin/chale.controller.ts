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
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
  UploadedFiles,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Roles } from '../../../../application/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../application/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../application/auth/guards/roles.guard';
import {
  AvailabilityDTO,
  ChaleCalendarioDTO,
  ChaleCalendarioQueryDTO,
  AvaliacaoListDTO,
  ChaleDetailDTO,
  ChaleDTO,
  ChaleImagemDTO,
  ChaleListDTO,
  CreateChaleDTO,
  DisponibilidadeChaleQueryDTO,
  ListAvaliacoesQueryDTO,
  ListChalesQueryDTO,
  UpdateChaleDTO,
  UpdateChaleStatusDTO,
} from '../../dto';
import { AvaliacaoService, ChaleService, ReservaService } from '../../services';

@Controller(['chales', 'api/chales'])
@ApiTags('Hosting - Chalés')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class ChaleController {
  constructor(
    private readonly chaleService: ChaleService,
    private readonly avaliacaoService: AvaliacaoService,
    private readonly reservaService: ReservaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar chalés com filtros e disponibilidade opcional' })
  @ApiResponse({ status: 200, type: ChaleListDTO, isArray: true })
  async listar(@Query() query: ListChalesQueryDTO): Promise<ChaleListDTO[]> {
    const hasDateFilter = Boolean(query.checkin || query.checkout);
    if (hasDateFilter && (!query.checkin || !query.checkout)) {
      throw new BadRequestException('Para filtrar por disponibilidade, informe checkin e checkout.');
    }

    if (query.checkin && query.checkout) {
      const result = await this.chaleService.listarChalesDisponiveis(
        query.checkin,
        query.checkout,
        query.capacidadeAdultos,
        query.capacidadeCriancas,
      );
      return query.tipo ? result.filter((item) => item.unitType === query.tipo) : result;
    }

    const minGuests = (query.capacidadeAdultos ?? 0) + (query.capacidadeCriancas ?? 0);
    return this.chaleService.listarChales({
      unitType: query.tipo,
      minGuests: minGuests > 0 ? minGuests : undefined,
    });
  }

  @Get('disponibilidade')
  @ApiOperation({ summary: 'Verificar disponibilidade de um chalé no período' })
  @ApiResponse({ status: 200, type: AvailabilityDTO })
  async verificarDisponibilidade(
    @Query() query: DisponibilidadeChaleQueryDTO,
  ): Promise<AvailabilityDTO> {
    if (!query.chaleId) {
      throw new BadRequestException('O parâmetro chaleId é obrigatório para verificar disponibilidade.');
    }
    return this.reservaService.verificarDisponibilidade(query.chaleId, query.checkin, query.checkout);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de um chalé' })
  @ApiResponse({ status: 200, type: ChaleDetailDTO })
  @ApiResponse({ status: 404, description: 'Chalé não encontrado' })
  async obter(@Param('id', ParseUUIDPipe) id: string): Promise<ChaleDetailDTO> {
    return this.chaleService.obterChale(id);
  }

  @Get(':id/calendario')
  @ApiOperation({ summary: 'Obter calendário de disponibilidade/reservas do chalé' })
  @ApiResponse({ status: 200, type: ChaleCalendarioDTO })
  async obterCalendario(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ChaleCalendarioQueryDTO,
  ): Promise<ChaleCalendarioDTO> {
    return this.chaleService.obterCalendarioChale(id, query.from, query.to);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Criar novo chalé (Admin)' })
  @ApiResponse({ status: 201, type: ChaleDTO })
  async criar(@Body() data: CreateChaleDTO): Promise<ChaleDTO> {
    return this.chaleService.criarChale(data);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar chalé (Admin)' })
  @ApiResponse({ status: 200, type: ChaleDTO })
  async atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateChaleDTO,
  ): Promise<ChaleDTO> {
    return this.chaleService.atualizarChale(id, data);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir chalé (Admin)' })
  @ApiResponse({ status: 204, description: 'Chalé excluído' })
  async excluir(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.chaleService.excluirChale(id);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Atualizar status do chalé (Admin/Operador)' })
  @ApiResponse({ status: 200, type: ChaleDTO })
  async atualizarStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateChaleStatusDTO,
  ): Promise<ChaleDTO> {
    return this.chaleService.atualizarStatus(id, data.status);
  }

  @Get(':id/avaliacoes')
  @ApiOperation({ summary: 'Listar avaliações do chalé' })
  @ApiResponse({ status: 200, type: AvaliacaoListDTO, isArray: true })
  async listarAvaliacoes(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListAvaliacoesQueryDTO,
  ): Promise<AvaliacaoListDTO[]> {
    return this.avaliacaoService.listarAvaliacoesDoChale(id, query.page, query.limit);
  }

  @Post(':id/imagens')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FilesInterceptor('images', 10))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          maxItems: 10,
        },
      },
      required: ['images'],
    },
  })
  @ApiOperation({ summary: 'Adicionar imagem ao chalé (Admin)' })
  @ApiResponse({ status: 201, type: ChaleImagemDTO, isArray: true })
  async adicionarImagem(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<ChaleImagemDTO[]> {
    return this.chaleService.adicionarImagens(id, files ?? []);
  }

  @Delete(':id/imagens/:imgId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover imagem do chalé (Admin)' })
  @ApiResponse({ status: 204, description: 'Imagem removida' })
  async removerImagem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imgId', ParseUUIDPipe) imgId: string,
  ): Promise<void> {
    await this.chaleService.obterChale(id);
    await this.chaleService.removerImagem(imgId);
  }
}
