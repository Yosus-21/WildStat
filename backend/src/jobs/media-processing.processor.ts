import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { MediaFileType, ProcessingStatus } from '@prisma/client';
import { Job } from 'bullmq';
import { AiClientService } from '../ai-client/ai-client.service';
import { DetectionsService } from '../detections/detections.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  MEDIA_PROCESSING_QUEUE,
  MediaProcessingJob,
} from './media-processing.types';

@Processor(MEDIA_PROCESSING_QUEUE)
export class MediaProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(MediaProcessingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiClient: AiClientService,
    private readonly detectionsService: DetectionsService,
  ) {
    super();
  }

  async process(job: Job<MediaProcessingJob>) {
    const { mediaFileId, filePath, fileType } = job.data;

    await this.prisma.mediaFile.update({
      where: { id: mediaFileId },
      data: {
        processingStatus: ProcessingStatus.PROCESSING,
        errorMessage: null,
      },
    });

    try {
      const analysis =
        fileType === MediaFileType.IMAGE
          ? await this.aiClient.analyzeImage(filePath)
          : await this.aiClient.analyzeVideo(filePath);

      const detections = await this.detectionsService.recreateForMedia({
        mediaFileId,
        projectId: job.data.projectId,
        cameraId: job.data.cameraId,
        analysis: {
          ...analysis,
          mediaFileId,
        },
      });

      await this.prisma.mediaFile.update({
        where: { id: mediaFileId },
        data: {
          processingStatus:
            detections.length > 0
              ? ProcessingStatus.PENDING_REVIEW
              : ProcessingStatus.PROCESSED,
          errorMessage: null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      await this.prisma.mediaFile.update({
        where: { id: mediaFileId },
        data: {
          processingStatus: ProcessingStatus.ERROR,
          errorMessage: message,
        },
      });

      this.logger.error(`Media processing failed for ${mediaFileId}`, message);
      throw error;
    }
  }
}
