import { Controller, Get, NotFoundException, Param, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('project/:projectId/pdf')
  @Roles(UserRole.INVESTIGATOR, UserRole.VIEWER)
  @ApiOperation({
    summary: 'Descargar reporte PDF de proyecto con métricas ecológicas validadas',
  })
  @ApiParam({ name: 'projectId', description: 'ID del proyecto' })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'speciesId', required: false })
  @ApiQuery({ name: 'cameraId', required: false })
  @ApiProduces('application/pdf')
  async downloadProjectPdf(
    @Param('projectId') projectId: string,
    @Query() query: ReportQueryDto,
    @Res() res: Response,
  ) {
    const result = await this.reportsService.generateProjectPdf(projectId, query);

    if (!result) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.send(result.buffer);
  }
}
