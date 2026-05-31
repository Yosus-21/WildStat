import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { MediaFileType, ProcessingStatus, UserRole } from '@prisma/client';
import { diskStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UploadMediaDto } from './dto/upload-media.dto';
import { MAX_UPLOAD_SIZE_BYTES } from './helpers/media-file-rules';
import { MediaService } from './media.service';

type AuthenticatedRequest = {
  user: {
    id: string;
    role: UserRole;
  };
};

@ApiTags('media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @Roles(UserRole.INVESTIGATOR)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_UPLOAD_SIZE_BYTES,
      },
      storage: diskStorage({
        destination: (_request, _file, callback) => {
          const temporaryDirectory = path.resolve(
            process.cwd(),
            'uploads',
            'tmp',
          );
          fs.mkdirSync(temporaryDirectory, { recursive: true });
          callback(null, temporaryDirectory);
        },
        filename: (_request, file, callback) => {
          const extension = path.extname(file.originalname).toLowerCase();
          callback(null, `${Date.now()}-${randomUUID()}${extension}`);
        },
      }),
    }),
  )
  @ApiOperation({
    summary: 'Subir una imagen o video para procesamiento posterior',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['projectId', 'cameraId', 'file'],
      properties: {
        projectId: { type: 'string' },
        cameraId: { type: 'string' },
        recordingDate: {
          type: 'string',
          format: 'date-time',
        },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  upload(
    @Body() dto: UploadMediaDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.mediaService.upload(dto, request.user.id, file);
  }

  @Get()
  @ApiOperation({ summary: 'Listar archivos multimedia' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'cameraId', required: false })
  @ApiQuery({ name: 'processingStatus', required: false, enum: ProcessingStatus })
  @ApiQuery({ name: 'fileType', required: false, enum: MediaFileType })
  findAll(
    @Query('projectId') projectId?: string,
    @Query('cameraId') cameraId?: string,
    @Query('processingStatus') processingStatus?: ProcessingStatus,
    @Query('fileType') fileType?: MediaFileType,
  ) {
    return this.mediaService.findAll({
      projectId,
      cameraId,
      processingStatus,
      fileType,
    });
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Listar archivos multimedia por proyecto' })
  @ApiParam({ name: 'projectId' })
  findByProject(@Param('projectId') projectId: string) {
    return this.mediaService.findByProject(projectId);
  }

  @Get('camera/:cameraId')
  @ApiOperation({ summary: 'Listar archivos multimedia por camara' })
  @ApiParam({ name: 'cameraId' })
  findByCamera(@Param('cameraId') cameraId: string) {
    return this.mediaService.findByCamera(cameraId);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Obtener estado de procesamiento de un archivo' })
  @ApiParam({ name: 'id' })
  findStatus(@Param('id') id: string) {
    return this.mediaService.findStatus(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un archivo multimedia' })
  @ApiParam({ name: 'id' })
  findOne(@Param('id') id: string) {
    return this.mediaService.findOne(id);
  }

  @Delete(':id')
  @Roles(UserRole.INVESTIGATOR)
  @ApiOperation({ summary: 'Eliminar registro y archivo fisico si existe' })
  @ApiParam({ name: 'id' })
  remove(@Param('id') id: string) {
    return this.mediaService.remove(id);
  }
}
