import { BadRequestException, Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Response } from 'express';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { LogsAdminService } from '../../services/admin/logs-admin.service';

type ExportFormat = 'json' | 'csv';

@Controller(['admin/logs', 'api/admin/logs'])
@ApiTags('Admin - Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class LogsAdminController {
  constructor(private readonly logsAdminService: LogsAdminService) {}

  @Get('collections')
  @ApiOperation({ summary: 'Listar coleções de logs disponíveis no MongoDB' })
  async listCollections() {
    const collections = await this.logsAdminService.listCollections();
    return { collections };
  }

  @Get('export/:collection/:format')
  @ApiOperation({ summary: 'Exportar coleção de logs em JSON ou CSV' })
  @ApiParam({ name: 'format', enum: ['json', 'csv'] })
  async exportCollection(
    @Param('collection') collection: string,
    @Param('format') format: ExportFormat,
    @Res() res: Response,
  ): Promise<void> {
    if (!['json', 'csv'].includes(format as string)) {
      throw new BadRequestException(`Formato '${format}' não suportado. Use 'json' ou 'csv'.`);
    }

    const exported = await this.logsAdminService.exportCollection({ collection, format });
    const date = new Date().toISOString().split('T')[0];
    const filename = `${collection}-${date}.${format}`;

    res.setHeader('Content-Type', exported.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(exported.content);
  }
}

