import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { IndependentStatus, ReviewStatus, Sex } from '@prisma/client';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DatasetService } from './dataset.service';
import { ValidatedDatasetFiltersDto } from './dto/validated-dataset-filters.dto';

@ApiTags('dataset')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dataset')
export class DatasetController {
  constructor(private readonly datasetService: DatasetService) {}

  @Get('validated')
  @ApiOperation({ summary: 'Consultar dataset validado para analisis posterior' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'cameraId', required: false })
  @ApiQuery({ name: 'speciesId', required: false })
  @ApiQuery({ name: 'sex', required: false, enum: Sex })
  @ApiQuery({ name: 'isIndependent', required: false, enum: IndependentStatus })
  @ApiQuery({ name: 'reviewStatus', required: false, enum: ReviewStatus })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  findValidated(@Query() filters: ValidatedDatasetFiltersDto) {
    return this.datasetService.findValidated(filters);
  }

  @Get('validated/export/csv')
  @ApiOperation({
    summary: 'Exportar dataset validado a CSV con filtros opcionales',
  })
  @ApiProduces('text/csv')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'cameraId', required: false })
  @ApiQuery({ name: 'speciesId', required: false })
  @ApiQuery({ name: 'sex', required: false, enum: Sex })
  @ApiQuery({ name: 'isIndependent', required: false, enum: IndependentStatus })
  @ApiQuery({ name: 'reviewStatus', required: false, enum: ReviewStatus })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  async exportCsv(
    @Query() filters: ValidatedDatasetFiltersDto,
    @Res() res: Response,
  ) {
    const csv = await this.datasetService.exportCsv(filters);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="dataset-validado.csv"',
    );
    res.send('﻿' + csv);
  }
}
