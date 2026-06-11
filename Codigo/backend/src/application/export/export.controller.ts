import { BadRequestException, Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ExportService } from './export.service';

type Dataset = 'events' | 'users' | 'inventory' | 'rentals' | 'sales' | 'overview' | 'hosting';
type Format = 'csv' | 'excel' | 'json';

@Controller('api/admin/export')
@ApiTags('Admin - Export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get(':dataset/:format/manifest')
  @ApiOperation({ summary: 'Listar arquivos disponíveis para exportação do módulo' })
  async manifest(@Param('dataset') dataset: Dataset, @Param('format') format: Format) {
    if (!['csv', 'excel', 'json'].includes(format as string)) {
      throw new BadRequestException(`Formato '${format}' não suportado. Use 'csv', 'excel' ou 'json'.`);
    }

    const date = new Date().toISOString().split('T')[0];
    const ext = format === 'excel' ? 'xls' : format;
    const resources = this.exportService.listResources(dataset);
    if (!resources.length) {
      throw new BadRequestException(`Dataset '${dataset}' não suportado.`);
    }

    return {
      files: resources.map((resource) => ({
        key: resource.key,
        filename: `${resource.key}-${date}.${ext}`,
        url: `/api/admin/export/${dataset}/${format}/file/${resource.key}`,
      })),
    };
  }

  @Get(':dataset/:format/file/:resource')
  @ApiOperation({ summary: 'Baixar arquivo exportado de uma tabela/recurso do módulo' })
  async exportResource(
    @Param('dataset') dataset: Dataset,
    @Param('format') format: Format,
    @Param('resource') resource: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!['csv', 'excel', 'json'].includes(format as string)) {
      throw new BadRequestException(`Formato '${format}' não suportado. Use 'csv', 'excel' ou 'json'.`);
    }

    const resources = this.exportService.listResources(dataset);
    if (!resources.length) {
      throw new BadRequestException(`Dataset '${dataset}' não suportado.`);
    }
    if (!resources.some((item) => item.key === resource)) {
      throw new BadRequestException(`Recurso '${resource}' não suportado para o dataset '${dataset}'.`);
    }

    const rows = await this.exportService.getResourceData(dataset, resource);
    const date = new Date().toISOString().split('T')[0];
    const ext = format === 'excel' ? 'xls' : format;
    const filename = `${resource}-${date}.${ext}`;

    if (format === 'excel') {
      res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=UTF-8');
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=UTF-8');
    } else {
      res.setHeader('Content-Type', 'text/csv; charset=UTF-8');
    }
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(this.exportService.serialize(rows, format));
  }

  @Get(':dataset/:format')
  @ApiOperation({ summary: 'Exportar dados administrativos em CSV ou Excel' })
  @ApiParam({ name: 'dataset', enum: ['events', 'users', 'inventory', 'rentals', 'sales', 'overview', 'hosting'] })
  @ApiParam({ name: 'format', enum: ['csv', 'excel'] })
  async export(
    @Param('dataset') dataset: Dataset,
    @Param('format') format: Extract<Format, 'csv' | 'excel'>,
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
      case 'hosting': return this.exportService.getHostingData();
      default: return [];
    }
  }
}
