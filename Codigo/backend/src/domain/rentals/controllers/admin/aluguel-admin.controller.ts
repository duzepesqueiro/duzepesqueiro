import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ItemCondition, RentalStatus, UserRole } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { CurrentUser } from '../../../../application/auth/decorators/current-user.decorator';
import { Roles } from '../../../../application/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../application/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../application/auth/guards/roles.guard';
import { LogsService } from '../../../../application/logs/services';
import { IsAfterDate } from '../../dto/common/validators';
import { CreateAluguelDto, FilterAluguelAdminDto, UpdateAluguelDto } from '../../dto/admin';
import { RentalResponseDto } from '../../dto/user';
import { AluguelAdminService } from '../../services/admin';

class UpdateRentalStatusDto {
  @IsEnum(RentalStatus)
  status: RentalStatus;
}

class InspectionDto {
  @IsEnum(ItemCondition)
  condition: ItemCondition;
}

class AvailabilityReportQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsAfterDate('startDate')
  endDate: string;
}

class ConditionReportQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

@Controller('admin/rentals')
@ApiTags('Aluguel - Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
@UseInterceptors(ClassSerializerInterceptor)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class AluguelAdminController {
  constructor(
    private readonly aluguelAdminService: AluguelAdminService,
    private readonly logsService: LogsService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @UseInterceptors(FilesInterceptor('images', 5))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Criar novo item de aluguel' })
  @ApiBody({ type: CreateAluguelDto })
  @ApiResponse({ status: 201, description: 'Item criado com sucesso', type: RentalResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão (requer ADMIN)' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAluguelDto,
    @UploadedFiles() images: any[] = [],
  ) {
    this.validateImages(images);
    void this.logsService.info('rental', 'AdminCreateRentalRequest', { userId, images: images.length });
    return this.aluguelAdminService.createRental(dto, images);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os aluguéis com filtros e paginação' })
  @ApiResponse({ status: 200, description: 'Lista de aluguéis retornada com sucesso' })
  list(@CurrentUser('id') userId: string, @Query() filters: FilterAluguelAdminDto) {
    void this.logsService.info('rental', 'AdminListRentalsRequest', { userId, filters });
    return this.aluguelAdminService.getAllRentals(filters);
  }

  @Get('report/availability')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Relatório de disponibilidade' })
  @ApiResponse({ status: 200, description: 'Relatório gerado com sucesso' })
  availabilityReport(
    @CurrentUser('id') userId: string,
    @Query() query: AvailabilityReportQueryDto,
  ) {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    void this.logsService.info('rental', 'AdminAvailabilityReportRequest', {
      userId,
      startDate,
      endDate,
    });
    return this.aluguelAdminService.generateAvailabilityReport(startDate, endDate);
  }

  @Get('report/condition')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Relatório de condição dos equipamentos' })
  @ApiResponse({ status: 200, description: 'Relatório de condição gerado com sucesso' })
  conditionReport(
    @CurrentUser('id') userId: string,
    @Query() _query: ConditionReportQueryDto,
  ) {
    void this.logsService.info('rental', 'AdminConditionReportRequest', { userId });
    return this.aluguelAdminService.generateConditionReport();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de um aluguel' })
  @ApiResponse({ status: 200, description: 'Detalhes retornados com sucesso', type: RentalResponseDto })
  getById(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    void this.logsService.info('rental', 'AdminGetRentalByIdRequest', { userId, rentalId: id }, id);
    return this.aluguelAdminService.getRentalById(id);
  }

  @Get(':id/bookings')
  @ApiOperation({ summary: 'Listar reservas do aluguel' })
  @ApiResponse({ status: 200, description: 'Reservas retornadas com sucesso' })
  getBookings(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    void this.logsService.info('rental', 'AdminGetRentalBookingsRequest', { userId, rentalId: id }, id);
    return this.aluguelAdminService.getBookingsByRentalId(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @UseInterceptors(FilesInterceptor('images', 5))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Atualizar aluguel' })
  @ApiResponse({ status: 200, description: 'Aluguel atualizado com sucesso', type: RentalResponseDto })
  update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAluguelDto,
    @UploadedFiles() images: any[] = [],
  ) {
    this.validateImages(images);
    void this.logsService.info('rental', 'AdminUpdateRentalRequest', { userId, rentalId: id }, id);
    return this.aluguelAdminService.updateRental(id, dto, images);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Soft delete de aluguel' })
  @ApiResponse({ status: 204, description: 'Aluguel removido com sucesso' })
  async delete(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    void this.logsService.warn('rental', 'AdminDeleteRentalRequest', { userId, rentalId: id }, id);
    await this.aluguelAdminService.deleteRental(id);
  }

  @Post(':id/restore')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Restaurar aluguel deletado' })
  @ApiResponse({ status: 200, description: 'Aluguel restaurado com sucesso', type: RentalResponseDto })
  restore(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    void this.logsService.info('rental', 'AdminRestoreRentalRequest', { userId, rentalId: id }, id);
    return this.aluguelAdminService.restoreRental(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Atualizar status do aluguel' })
  @ApiResponse({ status: 200, description: 'Status atualizado com sucesso', type: RentalResponseDto })
  updateStatus(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateRentalStatusDto,
  ) {
    void this.logsService.info('rental', 'AdminUpdateRentalStatusRequest', { userId, rentalId: id, status: body.status }, id);
    return this.aluguelAdminService.updateRentalStatus(id, body.status);
  }

  @Post(':id/images')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @UseInterceptors(FilesInterceptor('images', 5))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload de imagens' })
  @ApiResponse({ status: 200, description: 'Imagens enviadas com sucesso', type: RentalResponseDto })
  uploadImages(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: any[] = [],
  ) {
    this.validateImages(files);
    void this.logsService.info('rental', 'AdminUploadRentalImagesRequest', { userId, rentalId: id, totalFiles: files.length }, id);
    return this.aluguelAdminService.uploadRentalImages(id, files);
  }

  @Post(':id/inspection')
  @ApiOperation({ summary: 'Registrar inspeção de equipamento' })
  @ApiResponse({ status: 200, description: 'Inspeção registrada com sucesso', type: RentalResponseDto })
  inspection(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: InspectionDto,
  ) {
    void this.logsService.info('rental', 'AdminInspectionRequest', {
      userId,
      rentalId: id,
      condition: body.condition,
    }, id);
    return this.aluguelAdminService.checkEquipmentCondition(id, body.condition);
  }

  private validateImages(files: any[]) {
    if (files.length > 5) {
      throw new BadRequestException('Máximo de 5 imagens por upload');
    }
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        throw new BadRequestException('Tamanho máximo de 5MB por imagem');
      }
      const isAllowed = /image\/(jpg|jpeg|png|webp)$/i.test(file.mimetype);
      if (!isAllowed) {
        throw new BadRequestException('Formato inválido. Use: jpg, jpeg, png, webp');
      }
    }
  }
}

export { AluguelAdminController as RentalAdminController };
