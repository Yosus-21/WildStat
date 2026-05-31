import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiClientService } from './ai-client.service';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiClientController {
  constructor(private readonly aiClientService: AiClientService) {}

  @Get('health')
  @ApiOperation({ summary: 'Verificar disponibilidad del microservicio IA' })
  checkHealth() {
    return this.aiClientService.checkHealth();
  }
}
