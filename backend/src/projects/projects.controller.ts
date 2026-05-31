import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

type AuthenticatedRequest = {
  user: {
    id: string;
    role: UserRole;
  };
};

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles(UserRole.INVESTIGATOR)
  @ApiOperation({ summary: 'Crear un proyecto de monitoreo' })
  create(
    @Body() dto: CreateProjectDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.projectsService.create(dto, request.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar proyectos' })
  findAll() {
    return this.projectsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un proyecto por id' })
  @ApiParam({ name: 'id' })
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.INVESTIGATOR)
  @ApiOperation({ summary: 'Actualizar un proyecto' })
  @ApiParam({ name: 'id' })
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.INVESTIGATOR)
  @ApiOperation({ summary: 'Eliminar un proyecto' })
  @ApiParam({ name: 'id' })
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }
}
