import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../../../application/auth/decorators/current-user.decorator';
import { Roles } from '../../../../application/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../application/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../application/auth/guards/roles.guard';
import { LogsService } from '../../../../application/logs/services';
import { IsAfterDate } from '../../dto/common/validators';
import { FilterRentalDto, RentalResponseDto } from '../../dto/user';
import { AluguelUserService } from '../../services/user';

class RentalAvailabilityQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsAfterDate('startDate')
  endDate: string;
}

class RentalSearchQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;
}

@Controller(['rentals', 'api/rentals'])
@ApiTags('Aluguel - Usuário')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER, UserRole.EMPLOYEE)
@UseInterceptors(ClassSerializerInterceptor)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class AluguelUserController {
  constructor(
    private readonly aluguelUserService: AluguelUserService,
    private readonly logsService: LogsService,
  ) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Listar aluguéis disponíveis' })
  @ApiResponse({ status: 200, description: 'Aluguéis disponíveis retornados com sucesso' })
  listAvailable(@CurrentUser('id') userId: string, @Query() filters: FilterRentalDto): Promise<any> {
    void this.logsService.info('rental', 'UserRentalsListRequested', { userId, filters });
    return this.aluguelUserService.getAvailableRentals(filters);
  }

  @Get('search')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @ApiOperation({ summary: 'Buscar aluguéis por query' })
  @ApiResponse({ status: 200, description: 'Resultado da busca retornado com sucesso', type: [RentalResponseDto] })
  search(@CurrentUser('id') userId: string, @Query() query: RentalSearchQueryDto): Promise<any> {
    void this.logsService.info('rental', 'UserRentalsSearchRequested', { userId, query: query.q });
    return this.aluguelUserService.searchRentals(query.q ?? '');
  }

  @Get('categories')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Listar categorias disponíveis' })
  @ApiResponse({ status: 200, description: 'Categorias retornadas com sucesso' })
  categories(@CurrentUser('id') userId: string): Promise<any> {
    void this.logsService.info('rental', 'UserRentalsCategoriesRequested', { userId });
    return this.aluguelUserService.getRentalCategories();
  }

  @Get(':id')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Obter detalhes de um aluguel' })
  @ApiResponse({ status: 200, description: 'Detalhes retornados com sucesso', type: RentalResponseDto })
  findById(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string): Promise<any> {
    void this.logsService.info('rental', 'UserRentalDetailsRequested', { userId, rentalId: id }, id);
    return this.aluguelUserService.getRentalById(id);
  }

  @Get(':id/availability')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @ApiOperation({ summary: 'Verificar disponibilidade por datas' })
  @ApiResponse({ status: 200, description: 'Disponibilidade verificada com sucesso' })
  availability(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: RentalAvailabilityQueryDto,
  ): Promise<any> {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    void this.logsService.info(
      'rental',
      'UserRentalAvailabilityRequested',
      { userId, rentalId: id, startDate, endDate },
      id,
    );
    return this.aluguelUserService.checkRentalAvailability(id, startDate, endDate);
  }
}

export { AluguelUserController as RentalUserController };
