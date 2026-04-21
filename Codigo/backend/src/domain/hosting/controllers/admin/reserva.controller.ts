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
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReservationStatus, UserRole } from '@prisma/client';
import { Response } from 'express';
import { CurrentUser } from '../../../../application/auth/decorators/current-user.decorator';
import { Roles } from '../../../../application/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../application/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../application/auth/guards/roles.guard';
import {
  AdicionarHospedeDTO,
  AvailabilityDTO,
  CalculoReservaQueryDTO,
  CancellationResponseDTO,
  CancelarReservaDTO,
  CheckinResponseDTO,
  CheckoutResponseDTO,
  CreateManualReservaDTO,
  CreateReservaDTO,
  EnviarVoucherDTO,
  HospedeDTO,
  ListReservasQueryDTO,
  NoShowResponseDTO,
  PoliticaCancelamentoDTO,
  PriceCalculationDTO,
  ReservaDTO,
  ReservaDetailDTO,
  ReservaListDTO,
  UpdateReservaDTO,
  VoucherDTO,
} from '../../dto';
import { ReservaService } from '../../services';

type AuthUser = {
  id: string;
  role: UserRole;
};

@Controller(['reservas', 'api/reservas'])
@ApiTags('Hosting - Reservas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class ReservaController {
  constructor(private readonly reservaService: ReservaService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Listar reservas (Admin/Operador)' })
  @ApiResponse({ status: 200, type: ReservaListDTO, isArray: true })
  async listar(@Query() query: ListReservasQueryDTO): Promise<ReservaListDTO[]> {
    const resultByStatus: ReservaListDTO[] = [];

    if (query.status?.length) {
      for (const status of query.status) {
        const items = await this.reservaService.listarReservas({
          status,
          chaleId: query.chaleId,
          codigo: query.search,
          checkinFrom: query.dataCheckin?.toISOString(),
          checkinTo: query.dataCheckout?.toISOString(),
        });
        resultByStatus.push(...items);
      }
    } else {
      const items = await this.reservaService.listarReservas({
        chaleId: query.chaleId,
        codigo: query.search,
        checkinFrom: query.dataCheckin?.toISOString(),
        checkinTo: query.dataCheckout?.toISOString(),
      });
      resultByStatus.push(...items);
    }

    const unique = Array.from(new Map(resultByStatus.map((item) => [item.id, item])).values());
    const filtered = query.search
      ? unique.filter((item) =>
          `${item.code} ${item.guestName} ${item.guestEmail ?? ''}`
            .toLowerCase()
            .includes(query.search!.toLowerCase()),
        )
      : unique;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const start = (page - 1) * limit;
    return filtered.slice(start, start + limit);
  }

  @Get('minhas')
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Listar reservas do usuário logado' })
  @ApiResponse({ status: 200, type: ReservaListDTO, isArray: true })
  async listarMinhas(@CurrentUser() user: AuthUser): Promise<ReservaListDTO[]> {
    return this.reservaService.listarReservasDoUsuario(user.id);
  }

  @Get('codigo/:codigo')
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Obter reserva por código' })
  @ApiResponse({ status: 200, type: ReservaDetailDTO })
  async obterPorCodigo(
    @Param('codigo') codigo: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservaDetailDTO> {
    const reserva = await this.reservaService.obterReservaPorCodigo(codigo);
    this.ensureCanAccessReservation(user, reserva.userId ?? null);
    return reserva;
  }

  @Get('politica-ativa')
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Obter política ativa para aceite de termos' })
  @ApiResponse({ status: 200, type: PoliticaCancelamentoDTO })
  async obterPoliticaAtiva(): Promise<PoliticaCancelamentoDTO> {
    return this.reservaService.obterPoliticaAtiva();
  }

  @Get('politica-ativa/arquivo')
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Baixar arquivo PDF da política ativa' })
  @ApiResponse({ status: 200, description: 'Arquivo PDF de termos' })
  async baixarArquivoPoliticaAtiva(@Res() res: Response): Promise<void> {
    const file = await this.reservaService.baixarDocumentoTermosAtivo();
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    res.setHeader('Content-Length', String(file.content.length));
    res.send(file.content);
  }

  @Post('termos/upload')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Upload do arquivo PDF de termos da reserva' })
  @ApiResponse({ status: 201, type: PoliticaCancelamentoDTO })
  async uploadTermos(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ): Promise<PoliticaCancelamentoDTO> {
    return this.reservaService.uploadDocumentoTermos(file, user.id);
  }

  @Get(':id')
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Obter detalhes de uma reserva' })
  @ApiResponse({ status: 200, type: ReservaDetailDTO })
  async obter(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservaDetailDTO> {
    const reserva = await this.reservaService.obterReserva(id);
    this.ensureCanAccessReservation(user, reserva.userId ?? null);
    return reserva;
  }

  @Post()
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Criar nova reserva (Turista)' })
  @ApiResponse({ status: 201, type: ReservaDTO })
  async criar(
    @Body() data: CreateReservaDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservaDTO> {
    return this.reservaService.criarReserva(data, user.id);
  }

  @Post('manual')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Criar reserva manual (Operador)' })
  @ApiResponse({ status: 201, type: ReservaDTO })
  async criarManual(
    @Body() data: CreateManualReservaDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservaDTO> {
    return this.reservaService.criarReservaManual(data, user.id);
  }

  @Put(':id')
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Atualizar reserva' })
  @ApiResponse({ status: 200, type: ReservaDTO })
  async atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateReservaDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservaDTO> {
    const reserva = await this.reservaService.obterReserva(id);
    this.ensureCanAccessReservation(user, reserva.userId ?? null);

    return this.reservaService.atualizarReserva(id, {
      ...data,
      updatedById: user.id,
    });
  }

  @Post(':id/checkin')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Processar check-in (Operador)' })
  @ApiResponse({ status: 200, type: CheckinResponseDTO })
  async processarCheckin(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<CheckinResponseDTO> {
    return this.reservaService.processarCheckin(id, user.id);
  }

  @Post(':id/checkout')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Processar check-out (Operador)' })
  @ApiResponse({ status: 200, type: CheckoutResponseDTO })
  async processarCheckout(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<CheckoutResponseDTO> {
    return this.reservaService.processarCheckout(id, user.id);
  }

  @Post(':id/cancelar')
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Cancelar reserva' })
  @ApiResponse({ status: 200, type: CancellationResponseDTO })
  async cancelar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: CancelarReservaDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<CancellationResponseDTO> {
    const reserva = await this.reservaService.obterReserva(id);
    this.ensureCanAccessReservation(user, reserva.userId ?? null);
    return this.reservaService.cancelarReserva(id, data.motivo, user.id);
  }

  @Post(':id/no-show')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Registrar no-show (Operador)' })
  @ApiResponse({ status: 200, type: NoShowResponseDTO })
  async registrarNoShow(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<NoShowResponseDTO> {
    return this.reservaService.registrarNoShow(id, user.id);
  }

  @Get(':id/voucher')
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Obter voucher' })
  @ApiResponse({ status: 200, type: VoucherDTO })
  async obterVoucher(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<VoucherDTO> {
    const reserva = await this.reservaService.obterReserva(id);
    this.ensureCanAccessReservation(user, reserva.userId ?? null);
    return this.reservaService.gerarVoucher(id);
  }

  @Post(':id/voucher/enviar')
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Enviar voucher por e-mail' })
  @ApiResponse({ status: 204, description: 'Voucher enviado' })
  async enviarVoucher(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: EnviarVoucherDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const reserva = await this.reservaService.obterReserva(id);
    this.ensureCanAccessReservation(user, reserva.userId ?? null);
    await this.reservaService.enviarVoucher(id, body.canal ?? 'email');
  }

  @Post(':id/hospedes')
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Adicionar hóspede' })
  @ApiResponse({ status: 201, type: HospedeDTO })
  async adicionarHospede(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() hospede: AdicionarHospedeDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<HospedeDTO> {
    const reserva = await this.reservaService.obterReserva(id);
    this.ensureCanAccessReservation(user, reserva.userId ?? null);
    return this.reservaService.adicionarHospede(id, hospede);
  }

  @Delete(':id/hospedes/:hospedeId')
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover hóspede' })
  @ApiResponse({ status: 204, description: 'Hóspede removido' })
  async removerHospede(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('hospedeId', ParseUUIDPipe) hospedeId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const reserva = await this.reservaService.obterReserva(id);
    this.ensureCanAccessReservation(user, reserva.userId ?? null);
    await this.reservaService.removerHospede(hospedeId);
  }

  @Get(':id/calculo')
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Calcular valor da reserva' })
  @ApiResponse({ status: 200, type: PriceCalculationDTO })
  async calcular(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CalculoReservaQueryDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<PriceCalculationDTO> {
    const reserva = await this.reservaService.obterReserva(id);
    this.ensureCanAccessReservation(user, reserva.userId ?? null);

    return this.reservaService.calcularValorReserva(
      reserva.chaletId,
      reserva.checkInDate,
      reserva.checkOutDate,
      query.numAdultos ?? reserva.adults,
      query.numCriancas ?? reserva.children,
    );
  }

  @Get(':id/disponibilidade')
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Verificar disponibilidade da reserva' })
  @ApiResponse({ status: 200, type: AvailabilityDTO })
  async disponibilidade(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<AvailabilityDTO> {
    const reserva = await this.reservaService.obterReserva(id);
    this.ensureCanAccessReservation(user, reserva.userId ?? null);
    return this.reservaService.verificarDisponibilidade(
      reserva.chaletId,
      reserva.checkInDate,
      reserva.checkOutDate,
    );
  }

  private ensureCanAccessReservation(user: AuthUser, reservationUserId: string | null): void {
    if (user.role !== UserRole.CUSTOMER) {
      return;
    }
    if (!reservationUserId || reservationUserId !== user.id) {
      throw new BadRequestException('Usuário não possui acesso a esta reserva.');
    }
  }
}
