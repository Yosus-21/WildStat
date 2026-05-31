import {
  Controller,
  Delete,
  Body,
  Get,
  Param,
  Patch,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiTags,
} from '@nestjs/swagger';
import { ReviewStatus, UserRole } from '@prisma/client';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateReviewStatusDto } from '../validations/dto/update-review-status.dto';
import { ValidateDetectionDto } from '../validations/dto/validate-detection.dto';
import { ValidationsService } from '../validations/validations.service';
import { DetectionsService } from './detections.service';
import { DetectionFiltersDto } from './dto/detection-filters.dto';

type AuthenticatedRequest = {
  user: {
    id: string;
    role: UserRole;
  };
};

@ApiTags('detections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('detections')
export class DetectionsController {
  constructor(
    private readonly detectionsService: DetectionsService,
    private readonly validationsService: ValidationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar detecciones con filtros basicos' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'cameraId', required: false })
  @ApiQuery({ name: 'mediaFileId', required: false })
  @ApiQuery({ name: 'reviewStatus', required: false, enum: ReviewStatus })
  @ApiQuery({ name: 'aiSpecies', required: false })
  @ApiQuery({ name: 'minConfidence', required: false, type: Number })
  @ApiQuery({ name: 'maxConfidence', required: false, type: Number })
  findAll(@Query() filters: DetectionFiltersDto) {
    return this.detectionsService.findAll(filters);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Listar detecciones pendientes de revision' })
  findPending() {
    return this.detectionsService.findPending();
  }

  @Get('validated')
  @ApiOperation({ summary: 'Listar detecciones validadas' })
  findValidated() {
    return this.detectionsService.findValidated();
  }

  @Get('discarded')
  @ApiOperation({ summary: 'Listar detecciones descartadas' })
  findDiscarded() {
    return this.detectionsService.findDiscarded();
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Listar detecciones por proyecto' })
  @ApiParam({ name: 'projectId' })
  findByProject(@Param('projectId') projectId: string) {
    return this.detectionsService.findByProject(projectId);
  }

  @Get('media/:mediaFileId')
  @ApiOperation({ summary: 'Listar detecciones por archivo multimedia' })
  @ApiParam({ name: 'mediaFileId' })
  findByMedia(@Param('mediaFileId') mediaFileId: string) {
    return this.detectionsService.findByMedia(mediaFileId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una deteccion' })
  @ApiParam({ name: 'id' })
  findOne(@Param('id') id: string) {
    return this.detectionsService.findOne(id);
  }

  @Get(':id/validation-context')
  @ApiOperation({ summary: 'Obtener contexto para pantalla de validacion' })
  @ApiParam({ name: 'id' })
  getValidationContext(@Param('id') id: string) {
    return this.validationsService.getValidationContext(id);
  }

  @Patch(':id/validate')
  @Roles(UserRole.INVESTIGATOR)
  @ApiOperation({ summary: 'Validar cientificamente una deteccion' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: ValidateDetectionDto })
  validate(
    @Param('id') id: string,
    @Body() dto: ValidateDetectionDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.validationsService.validateDetection(id, request.user.id, dto);
  }

  @Patch(':id/review-status')
  @Roles(UserRole.INVESTIGATOR)
  @ApiOperation({ summary: 'Cambiar solamente el estado de revision' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateReviewStatusDto })
  updateReviewStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReviewStatusDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.validationsService.updateReviewStatus(
      id,
      request.user.id,
      dto.reviewStatus,
    );
  }

  @Get(':id/frame')
  @ApiOperation({ summary: 'Servir frame clave asociado a una deteccion' })
  @ApiParam({ name: 'id' })
  async getFrame(@Param('id') id: string, @Res() response: Response) {
    const filePath = await this.detectionsService.getFramePath(id);
    return response.sendFile(filePath);
  }

  @Get(':id/clip')
  @ApiOperation({ summary: 'Servir clip asociado a una deteccion' })
  @ApiParam({ name: 'id' })
  async getClip(@Param('id') id: string, @Res() response: Response) {
    const filePath = await this.detectionsService.getClipPath(id);
    return response.sendFile(filePath);
  }

  @Delete(':id')
  @Roles(UserRole.INVESTIGATOR)
  @ApiOperation({ summary: 'Eliminar una deteccion' })
  @ApiParam({ name: 'id' })
  remove(@Param('id') id: string) {
    return this.detectionsService.remove(id);
  }
}
