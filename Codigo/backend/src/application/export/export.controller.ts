import { BadRequestException, Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ExportService } from './export.service';

type Dataset = 'events' | 'users' | 'inventory' | 'rentals' | 'sales' | 'overview';
type Format = 'csv' | 'excel';

@Controller('api/admin/export')
@ApiTags('Admin - Export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get(':dataset/:format')
  @ApiOperation({ summary: 'Exportar dados administrativos em CSV ou Excel' })
  @ApiParam({ name: 'dataset', enum: ['events', 'users', 'inventory', 'rentals', 'sales', 'overview'] })
  @ApiParam({ name: 'format', enum: ['csv', 'excel'] })
  async export(
    @Param('dataset') dataset: Dataset,
    @Param('format') format: Format,
    @Res() res: Response,
  ): Promise<void> {
    if (!['csv', 'excel'].includes(format as string)) {
      throw new BadRequestException(`Formato '${format}' não suportado. Use 'csv' ou 'excel'.`);
    }
    const rows = await this.fetchData(dataset);
    const date = new Date().toISOString().split('T')[0];

    if (format === 'excel') {
      const html = this.exportService.toExcelHtml(rows);
      res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=UTF-8');
      res.setHeader('Content-Disposition', `attachment; filename="export-${dataset}-${date}.xls"`);
      res.send(Buffer.from(html, 'utf-8'));
    } else {
      const csv = this.exportService.toCsv(rows);
      res.setHeader('Content-Type', 'text/csv; charset=UTF-8');
      res.setHeader('Content-Disposition', `attachment; filename="export-${dataset}-${date}.csv"`);
      res.send(Buffer.from(csv, 'utf-8'));
    }
  }

  private async fetchData(dataset: Dataset) {
    switch (dataset) {
      case 'events': return this.exportService.getEventsData();
      case 'users': return this.exportService.getUsersData();
      case 'inventory': return this.exportService.getInventoryData();
      case 'rentals': return this.exportService.getRentalsData();
      case 'sales': return this.exportService.getSalesData();
      case 'overview': return this.exportService.getOverviewData();
      default: return [];
    }
  }
}
