import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReviewStatus } from '@prisma/client';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { AiAnalysisResponse } from '../ai-client/ai-analysis.types';
import { PrismaService } from '../prisma/prisma.service';
import { DetectionFiltersDto } from './dto/detection-filters.dto';

type CreateForMediaInput = {
  mediaFileId: string;
  projectId: string;
  cameraId: string | null;
  analysis: AiAnalysisResponse;
};

@Injectable()
export class DetectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async recreateForMedia(input: CreateForMediaInput) {
    const mediaFile = await this.prisma.mediaFile.findUnique({
      where: { id: input.mediaFileId },
      select: { recordingDate: true },
    });

    const events = input.analysis.events.map((event) => {
      if (event.aiConfidence < 0 || event.aiConfidence > 1) {
        throw new BadRequestException('AI confidence must be between 0 and 1');
      }

      const detectedAt = this.resolveDetectedAt(
        mediaFile?.recordingDate ?? null,
        event.timestampSeconds ?? event.startTime,
        event.detectedAt,
      );

      return {
        mediaFileId: input.mediaFileId,
        projectId: input.projectId,
        cameraId: input.cameraId,
        timestampVideo: event.timestampVideo,
        timestampSeconds: event.timestampSeconds,
        startTime: event.startTime,
        endTime: event.endTime,
        framePath: event.framePath,
        keyFramePath: event.framePath,
        clipPath: event.clipPath,
        bbox: this.toJson(event.bbox),
        boundingBox: this.toJson(event.bbox),
        aiSpecies: event.aiSpecies,
        suggestedSpecies: event.aiSpecies,
        aiConfidence: event.aiConfidence,
        confidence: event.aiConfidence,
        reviewStatus: ReviewStatus.PENDING,
        detectedAt,
        month: event.month ?? this.resolveMonth(detectedAt),
        hour: event.hour ?? this.resolveHour(detectedAt, event.timestampSeconds),
        frameTimeSeconds: event.timestampSeconds ?? event.startTime,
      };
    });

    return this.prisma.$transaction(async (tx) => {
      await tx.detection.deleteMany({
        where: { mediaFileId: input.mediaFileId },
      });

      if (events.length === 0) {
        return [];
      }

      await tx.detection.createMany({ data: events });

      return tx.detection.findMany({
        where: { mediaFileId: input.mediaFileId },
        orderBy: { createdAt: 'asc' },
        include: this.defaultInclude(),
      });
    });
  }

  findAll(filters: DetectionFiltersDto) {
    return this.prisma.detection.findMany({
      where: this.buildWhere(filters),
      orderBy: { createdAt: 'desc' },
      include: this.defaultInclude(),
    });
  }

  async findOne(id: string) {
    const detection = await this.prisma.detection.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });

    if (!detection) {
      throw new NotFoundException('Detection not found');
    }

    return detection;
  }

  findByProject(projectId: string) {
    return this.findAll({ projectId });
  }

  findByMedia(mediaFileId: string) {
    return this.findAll({ mediaFileId });
  }

  findPending() {
    return this.findAll({ reviewStatus: ReviewStatus.PENDING });
  }

  findValidated() {
    return this.findAll({ reviewStatus: ReviewStatus.VALIDATED });
  }

  findDiscarded() {
    return this.findAll({ reviewStatus: ReviewStatus.DISCARDED });
  }

  async getFramePath(id: string) {
    const detection = await this.findOne(id);
    const framePath = detection.framePath ?? detection.keyFramePath;
    return this.resolveAllowedArtifactPath(framePath, 'frame');
  }

  async getClipPath(id: string) {
    const detection = await this.findOne(id);
    return this.resolveAllowedArtifactPath(detection.clipPath, 'clip');
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.detection.delete({ where: { id } });

    return { id, deleted: true };
  }

  private buildWhere(filters: DetectionFiltersDto): Prisma.DetectionWhereInput {
    return {
      projectId: filters.projectId,
      cameraId: filters.cameraId,
      mediaFileId: filters.mediaFileId,
      reviewStatus: filters.reviewStatus,
      aiSpecies: filters.aiSpecies,
      aiConfidence: {
        gte: filters.minConfidence,
        lte: filters.maxConfidence,
      },
    };
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
      mediaFile: {
        select: {
          id: true,
          fileType: true,
          filePath: true,
          processingStatus: true,
        },
      },
      species: {
        select: {
          id: true,
          commonName: true,
          scientificName: true,
        },
      },
      validatedSpeciesRef: {
        select: {
          id: true,
          commonName: true,
          scientificName: true,
        },
      },
      reviewer: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    };
  }

  private resolveDetectedAt(
    recordingDate: Date | null,
    timestampSeconds?: number,
    detectedAt?: Date,
  ): Date | undefined {
    if (detectedAt) {
      return detectedAt;
    }
    if (!recordingDate) {
      return undefined;
    }
    return new Date(recordingDate.getTime() + (timestampSeconds ?? 0) * 1000);
  }

  private resolveMonth(detectedAt?: Date) {
    return detectedAt ? detectedAt.getUTCMonth() + 1 : undefined;
  }

  private resolveHour(detectedAt?: Date, timestampSeconds?: number) {
    if (detectedAt) {
      return detectedAt.getUTCHours();
    }
    if (timestampSeconds === undefined) {
      return undefined;
    }
    return Math.floor((timestampSeconds % 86400) / 3600);
  }

  private toJson(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined) {
      return undefined;
    }
    return value as Prisma.InputJsonValue;
  }

  private async resolveAllowedArtifactPath(
    artifactPath: string | null | undefined,
    label: 'frame' | 'clip',
  ) {
    if (!artifactPath) {
      throw new NotFoundException(`Detection ${label} not found`);
    }

    const absolutePath = path.isAbsolute(artifactPath)
      ? path.resolve(artifactPath)
      : path.resolve(process.cwd(), artifactPath);

    const allowedRoots = [
      path.resolve(process.cwd(), 'uploads'),
      path.resolve(process.cwd(), '..', 'ai-service', 'outputs'),
    ];

    const isAllowed = allowedRoots.some(
      (root) =>
        absolutePath === root || absolutePath.startsWith(`${root}${path.sep}`),
    );

    if (!isAllowed) {
      throw new BadRequestException(`Invalid ${label} path`);
    }

    await fs.access(absolutePath);
    return absolutePath;
  }
}
