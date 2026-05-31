import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CamerasService } from './cameras.service';
import { CreateCameraDto } from './dto/create-camera.dto';
import { UpdateCameraDto } from './dto/update-camera.dto';

@ApiTags('cameras')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cameras')
export class CamerasController {
  constructor(private readonly camerasService: CamerasService) {}

  @Post()
  @Roles(UserRole.INVESTIGATOR)
  @ApiOperation({ summary: 'Crear una camara o estacion' })
  create(@Body() dto: CreateCameraDto) {
    return this.camerasService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar camaras' })
  @ApiQuery({ name: 'projectId', required: false })
  findAll(@Query('projectId') projectId?: string) {
    return this.camerasService.findAll(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una camara por id' })
  @ApiParam({ name: 'id' })
  findOne(@Param('id') id: string) {
    return this.camerasService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.INVESTIGATOR)
  @ApiOperation({ summary: 'Actualizar una camara' })
  @ApiParam({ name: 'id' })
  update(@Param('id') id: string, @Body() dto: UpdateCameraDto) {
    return this.camerasService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.INVESTIGATOR)
  @ApiOperation({ summary: 'Eliminar una camara' })
  @ApiParam({ name: 'id' })
  remove(@Param('id') id: string) {
    return this.camerasService.remove(id);
  }
}
