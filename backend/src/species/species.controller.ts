import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateSpeciesDto } from './dto/create-species.dto';
import { SpeciesService } from './species.service';

@ApiTags('species')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('species')
export class SpeciesController {
  constructor(private readonly speciesService: SpeciesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar especies disponibles para validacion' })
  findAll() {
    return this.speciesService.findAll();
  }

  @Post()
  @Roles(UserRole.INVESTIGATOR)
  @ApiOperation({ summary: 'Crear una especie para validacion cientifica' })
  @ApiBody({ type: CreateSpeciesDto })
  create(@Body() dto: CreateSpeciesDto) {
    return this.speciesService.create(dto);
  }
}
