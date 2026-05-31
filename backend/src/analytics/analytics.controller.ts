import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { IndependentStatus, ReviewStatus, Sex } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Resumen general: totales de detecciones, jaguares, cámaras, proyectos',
  })
  @ApiQuery({ name: 'projectId', required: false })
  getSummary(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getSummary(query);
  }

  @Get('species-frequency')
  @ApiOperation({ summary: 'Frecuencia de detecciones por especie validada' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'cameraId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'reviewStatus', required: false, enum: ReviewStatus })
  getSpeciesFrequency(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getSpeciesFrequency(query);
  }

  @Get('jaguar-abundance')
  @ApiOperation({
    summary: 'Abundancia de jaguar: eventos totales e independientes',
  })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'cameraId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  getJaguarAbundance(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getJaguarAbundance(query);
  }

  @Get('by-zone')
  @ApiOperation({ summary: 'Eventos de detección agrupados por zona' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'speciesId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  getByZone(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getByZone(query);
  }

  @Get('by-month')
  @ApiOperation({ summary: 'Eventos de detección por mes del año (1–12)' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'speciesId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  getByMonth(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getByMonth(query);
  }

  @Get('sex-ratio')
  @ApiOperation({ summary: 'Proporción de sexos en detecciones validadas' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'speciesId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'sex', required: false, enum: Sex })
  getSexRatio(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getSexRatio(query);
  }

  @Get('activity-by-hour')
  @ApiOperation({ summary: 'Actividad de detecciones por hora del día (0–23)' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'speciesId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  getActivityByHour(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getActivityByHour(query);
  }

  @Get('simple-density')
  @ApiOperation({
    summary:
      'Densidad poblacional simple de jaguar: eventos independientes / km² * 100',
  })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  getSimpleDensity(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getSimpleDensity(query);
  }

  @Get('shared-habitat')
  @ApiOperation({
    summary: 'Especies que comparten cámaras con jaguar (hábitat compartido)',
  })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'cameraId', required: false })
  getSharedHabitat(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getSharedHabitat(query);
  }

  @Get('trend')
  @ApiOperation({
    summary:
      'Tendencia orientativa de eventos independientes de jaguar por mes',
  })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  getTrend(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getTrend(query);
  }
}
