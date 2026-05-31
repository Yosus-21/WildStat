import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MediaFileType, Prisma, ProcessingStatus } from '@prisma/client';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { JobsService } from '../jobs/jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { UploadMediaDto } from './dto/upload-media.dto';
import {
  classifyMediaFile,
  createSafeFileName,
} from './helpers/media-file-rules';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly uploadRoot = path.resolve(process.cwd(), 'uploads');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobsService: JobsService,
  ) {}

  async upload(
    dto: UploadMediaDto,
    uploadedById: string,
    file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    try {
      const camera = await this.validateProjectAndCamera(
        dto.projectId,
        dto.cameraId,
      );
      const classification = classifyMediaFile(
        file.originalname,
        file.mimetype,
        file.size,
      );

      const fileName = createSafeFileName(classification.extension);
      const relativePath = path.join(
        'uploads',
        'projects',
        dto.projectId,
        'cameras',
        dto.cameraId,
        classification.folder,
        fileName,
      );
      const absolutePath = this.resolveInsideUploads(relativePath);

      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.rename(file.path, absolutePath);

      const mediaFile = await this.prisma.mediaFile.create({
        data: {
          projectId: dto.projectId,
          cameraId: camera.id,
          uploadedById,
          fileName,
          originalName: file.originalname,
          fileType: classification.fileType,
          mimeType: file.mimetype,
          filePath: relativePath,
          recordingDate: dto.recordingDate,
          processingStatus: ProcessingStatus.UPLOADED,
        },
        include: this.defaultInclude(),
      });

      const job = await this.jobsService.enqueueMediaProcessing({
        mediaFileId: mediaFile.id,
        projectId: mediaFile.projectId,
        cameraId: mediaFile.cameraId ?? dto.cameraId,
        filePath: mediaFile.filePath,
        fileType: mediaFile.fileType,
      });

      return {
        mediaFile,
        jobId: String(job.id),
      };
    } catch (error) {
      await this.removeTemporaryFile(file.path);
      throw error;
    }
  }

  findAll(filters: {
    projectId?: string;
    cameraId?: string;
    processingStatus?: ProcessingStatus;
    fileType?: MediaFileType;
  }) {
    return this.prisma.mediaFile.findMany({
      where: this.buildWhere(filters),
      orderBy: { uploadDate: 'desc' },
      include: this.defaultInclude(),
    });
  }

  async findOne(id: string) {
    const mediaFile = await this.prisma.mediaFile.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });

    if (!mediaFile) {
      throw new NotFoundException('Media file not found');
    }

    return mediaFile;
  }

  async findStatus(id: string) {
    const mediaFile = await this.prisma.mediaFile.findUnique({
      where: { id },
      select: {
        id: true,
        fileType: true,
        processingStatus: true,
        errorMessage: true,
        _count: {
          select: { detections: true },
        },
      },
    });

    if (!mediaFile) {
      throw new NotFoundException('Media file not found');
    }

    return {
      id: mediaFile.id,
      fileType: mediaFile.fileType,
      processingStatus: mediaFile.processingStatus,
      errorMessage: mediaFile.errorMessage,
      detectionsCount: mediaFile._count.detections,
    };
  }

  findByProject(projectId: string) {
    return this.prisma.mediaFile.findMany({
      where: { projectId },
      orderBy: { uploadDate: 'desc' },
      include: this.defaultInclude(),
    });
  }

  findByCamera(cameraId: string) {
    return this.prisma.mediaFile.findMany({
      where: { cameraId },
      orderBy: { uploadDate: 'desc' },
      include: this.defaultInclude(),
    });
  }

  async remove(id: string) {
    const mediaFile = await this.prisma.mediaFile.findUnique({
      where: { id },
      select: { id: true, filePath: true },
    });

    if (!mediaFile) {
      throw new NotFoundException('Media file not found');
    }

    await this.prisma.mediaFile.delete({ where: { id } });

    try {
      await fs.unlink(this.resolveInsideUploads(mediaFile.filePath));
    } catch (error) {
      this.logger.warn(
        `Media file record ${id} deleted, but physical file could not be removed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return { id, deleted: true };
  }

  private async validateProjectAndCamera(projectId: string, cameraId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const camera = await this.prisma.camera.findUnique({
      where: { id: cameraId },
      select: { id: true, projectId: true },
    });

    if (!camera) {
      throw new NotFoundException('Camera not found');
    }

    if (camera.projectId !== projectId) {
      throw new BadRequestException('Camera does not belong to project');
    }

    return camera;
  }

  private resolveInsideUploads(filePath: string) {
    const absolutePath = path.resolve(process.cwd(), filePath);

    if (
      absolutePath !== this.uploadRoot &&
      !absolutePath.startsWith(`${this.uploadRoot}${path.sep}`)
    ) {
      throw new BadRequestException('Invalid upload path');
    }

    return absolutePath;
  }

  private buildWhere(filters: {
    projectId?: string;
    cameraId?: string;
    processingStatus?: ProcessingStatus;
    fileType?: MediaFileType;
  }): Prisma.MediaFileWhereInput {
    return {
      projectId: filters.projectId,
      cameraId: filters.cameraId,
      processingStatus: filters.processingStatus,
      fileType: filters.fileType,
    };
  }

  private async removeTemporaryFile(filePath?: string) {
    if (!filePath) {
      return;
    }

    try {
      await fs.unlink(filePath);
    } catch {
      return;
    }
  }

  private defaultInclude() {
    return {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      camera: {
        select: {
          id: true,
          code: true,
          stationCode: true,
        },
      },
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    };
  }
}
