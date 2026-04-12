import {
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Body,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiPropertyOptional,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../../../../application/auth/decorators/current-user.decorator';
import { Roles } from '../../../../application/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../application/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../application/auth/guards/roles.guard';
import {
  EquipmentQuality,
} from '../../enums';
import {
  PerformInspectionDto,
  RentalInventoryResponseDto,
} from '../../dto';
import { RentalInventoryService } from '../../services';

class RentalInventoryFilterDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ enum: EquipmentQuality })
  @IsOptional()
  @IsEnum(EquipmentQuality)
  quality?: EquipmentQuality;
}

@Controller('rental-inventory')
@ApiTags('Inventory - Rental Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class RentalInventoryController {
  constructor(private readonly rentalInventoryService: RentalInventoryService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List rental equipment inventory' })
  @ApiResponse({ status: 200, description: 'Paginated rental inventory list' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async list(@Query() filters: RentalInventoryFilterDto): Promise<{
    items: RentalInventoryResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.rentalInventoryService.list(filters);
  }

  @Get('quality/:quality')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List rental inventory by quality' })
  @ApiResponse({ status: 200, description: 'Paginated rental inventory list by quality' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async listByQuality(
    @Param('quality', new ParseEnumPipe(EquipmentQuality)) quality: EquipmentQuality,
    @Query() filters: RentalInventoryFilterDto,
  ): Promise<{
    items: RentalInventoryResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.rentalInventoryService.list({ ...filters, quality });
  }

  @Get('product/:productId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get rental inventory by product id' })
  @ApiResponse({ status: 200, type: RentalInventoryResponseDto })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Rental inventory not found' })
  async getByProduct(
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<RentalInventoryResponseDto> {
    return this.rentalInventoryService.getByProduct(productId);
  }

  @Post('inspection/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Perform quality inspection' })
  @ApiResponse({ status: 201, type: RentalInventoryResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async inspection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PerformInspectionDto,
    @CurrentUser() user: User,
  ): Promise<RentalInventoryResponseDto> {
    return this.rentalInventoryService.performInspection(id, dto, user);
  }

  @Get('report/quality')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Generate rental inventory quality report' })
  @ApiResponse({ status: 200, description: 'Quality report generated' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async qualityReport(@Query() filters: RentalInventoryFilterDto): Promise<{
    generatedAt: Date;
    summary: {
      totalItems: number;
      good: number;
      medium: number;
      bad: number;
    };
    items: RentalInventoryResponseDto[];
  }> {
    return this.rentalInventoryService.generateQualityReport(filters);
  }
}
