import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsDateString } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../../../application/auth/decorators/current-user.decorator';
import { Roles } from '../../../../application/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../application/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../application/auth/guards/roles.guard';
import { LogsService } from '../../../../application/logs/services';
import { CreateRentalBookingDto } from '../../dto/user';
import { RentalBookingService } from '../../services/user';

class ExtendBookingDto {
  @IsDateString()
  newEndDate: string;
}

@Controller(['rentals/bookings', 'api/rentals/bookings'])
@ApiTags('Aluguel - Reservas Usuário')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
@UseInterceptors(ClassSerializerInterceptor)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class AluguelPaymentController {
  constructor(
    private readonly rentalBookingService: RentalBookingService,
    private readonly logsService: LogsService,
  ) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Criar nova reserva de aluguel' })
  @ApiResponse({ status: 201, description: 'Reserva criada com sucesso' })
  async createBooking(
    @CurrentUser('id') userId: string,
    @Body() data: CreateRentalBookingDto,
  ) {
    const result = await this.rentalBookingService.createBooking(userId, data);
    await this.logsService.info(
      'rental',
      'UserBookingCreated',
      { userId, bookingId: result.id },
      result.id,
    );
    return {
      message: 'Reserva criada com sucesso',
      data: result,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Listar minhas reservas' })
  @ApiResponse({ status: 200, description: 'Reservas retornadas com sucesso' })
  async listBookings(@CurrentUser('id') userId: string) {
    const result = await this.rentalBookingService.getUserBookings(userId);
    await this.logsService.info('rental', 'UserBookingsListed', { userId, total: result.length });
    return {
      message: 'Reservas listadas com sucesso',
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes da reserva' })
  @ApiResponse({ status: 200, description: 'Detalhes retornados com sucesso' })
  async getBookingById(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const booking = await this.rentalBookingService.getBookingByIdForUser(userId, id);
    await this.logsService.info(
      'rental',
      'UserBookingDetailsRequested',
      { userId, bookingId: id },
      id,
    );
    return {
      message: 'Detalhes da reserva retornados com sucesso',
      data: booking,
    };
  }

  @Patch(':id/cancel')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @ApiOperation({ summary: 'Cancelar reserva' })
  @ApiResponse({ status: 200, description: 'Reserva cancelada com sucesso' })
  async cancelBooking(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const booking = await this.rentalBookingService.cancelBooking(userId, id);
    await this.logsService.warn(
      'rental',
      'UserBookingCancelled',
      { userId, bookingId: id },
      id,
    );
    return {
      message: 'Reserva cancelada com sucesso',
      data: booking,
    };
  }

  @Patch(':id/extend')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @ApiOperation({ summary: 'Estender período de aluguel' })
  @ApiResponse({ status: 200, description: 'Reserva estendida com sucesso' })
  async extendBooking(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ExtendBookingDto,
  ) {
    const booking = await this.rentalBookingService.extendBooking(
      userId,
      id,
      new Date(body.newEndDate),
    );
    await this.logsService.info(
      'rental',
      'UserBookingExtended',
      { userId, bookingId: id, newEndDate: body.newEndDate },
      id,
    );
    return {
      message: 'Reserva estendida com sucesso',
      data: booking,
    };
  }

  @Get(':id/payment')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Obter informações de pagamento' })
  @ApiResponse({ status: 200, description: 'Pagamento retornado com sucesso' })
  async getPaymentInfo(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const payment = await this.rentalBookingService.getBookingPaymentInfo(userId, id);
    await this.logsService.info(
      'rental',
      'UserBookingPaymentRequested',
      { userId, bookingId: id },
      id,
    );
    return {
      message: 'Pagamento retornado com sucesso',
      data: payment,
    };
  }

  @Post(':id/return')
  @Roles(UserRole.CUSTOMER, UserRole.EMPLOYEE)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Registrar devolução' })
  @ApiResponse({ status: 200, description: 'Devolução registrada com sucesso' })
  async registerReturn(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const booking = await this.rentalBookingService.registerReturn(userId, id);
    await this.logsService.info(
      'rental',
      'UserBookingReturned',
      { userId, bookingId: id },
      id,
    );
    return {
      message: 'Devolução registrada com sucesso',
      data: booking,
    };
  }
}

export { AluguelPaymentController as RentalBookingController };
