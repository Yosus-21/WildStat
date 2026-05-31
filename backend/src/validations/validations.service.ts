import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IndependentStatus,
  Prisma,
  ReviewStatus,
  Sex,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ValidateDetectionDto } from './dto/validate-detection.dto';

const FINAL_REVIEW_STATUSES = new Set<ReviewStatus>([
  ReviewStatus.VALIDATED,
  ReviewStatus.CORRECTED,
  ReviewStatus.DISCARDED,
  ReviewStatus.DOUBTFUL,
]);
const SPECIES_REQUIRED_STATUSES = new Set<ReviewStatus>([
  ReviewStatus.VALIDATED,
  ReviewStatus.CORRECTED,
]);

@Injectable()
export class ValidationsService {
  constructor(private readonly prisma: PrismaService) {}

  async validateDetection(
    detectionId: string,
    reviewerId: string,
    dto: ValidateDetectionDto,
  ) {
    this.validateReviewPayload(dto);

    const detection = await this.prisma.detection.findUnique({
      where: { id: detectionId },
      include: {
        project: true,
        camera: true,
        mediaFile: true,
      },
    });

    if (!detection) {
      throw new NotFoundException('Detection not found');
    }

    const validatedSpecies = await this.resolveValidatedSpecies(dto);
    const relatedDetectionId = await this.resolveRelatedDetection(
      detectionId,
      detection.projectId,
      detection.cameraId,
      dto,
    );

    return this.prisma.detection.update({
      where: { id: detectionId },
      data: {
        hasAnimal: dto.hasAnimal,
        validatedSpeciesId: validatedSpecies?.id ?? null,
        validatedSpecies: validatedSpecies?.commonName ?? null,
        speciesId: validatedSpecies?.id ?? null,
        sex: dto.sex,
        isIndependent: dto.isIndependent,
        independentStatus: dto.isIndependent,
        relatedDetectionId,
        reviewStatus: dto.reviewStatus,
        reviewerId,
        notes: dto.notes,
        validatedAt: new Date(),
      },
      include: this.defaultInclude(),
    });
  }

  async updateReviewStatus(
    detectionId: string,
    reviewerId: string,
    reviewStatus: ReviewStatus,
  ) {
    if (reviewStatus === ReviewStatus.PENDING) {
      throw new BadRequestException('Use validate endpoint for final review data');
    }

    await this.ensureDetectionExists(detectionId);

    return this.prisma.detection.update({
      where: { id: detectionId },
      data: {
        reviewStatus,
        reviewerId,
        validatedAt: new Date(),
      },
      include: this.defaultInclude(),
    });
  }

  async getValidationContext(detectionId: string) {
    const detection = await this.prisma.detection.findUnique({
      where: { id: detectionId },
      include: this.defaultInclude(),
    });

    if (!detection) {
      throw new NotFoundException('Detection not found');
    }

    const [species, relatedCandidates] = await Promise.all([
      this.prisma.species.findMany({ orderBy: { commonName: 'asc' } }),
      this.prisma.detection.findMany({
        where: {
          id: { not: detection.id },
          projectId: detection.projectId,
          cameraId: detection.cameraId ?? undefined,
          reviewStatus: {
            in: [
              ReviewStatus.PENDING,
              ReviewStatus.VALIDATED,
              ReviewStatus.CORRECTED,
              ReviewStatus.DOUBTFUL,
            ],
          },
        },
        orderBy: [{ detectedAt: 'desc' }, { createdAt: 'desc' }],
        take: 20,
        include: this.defaultInclude(),
      }),
    ]);

    return {
      detection,
      frameUrl: detection.framePath
        ? `/api/v1/detections/${detection.id}/frame`
        : null,
      clipUrl: detection.clipPath
        ? `/api/v1/detections/${detection.id}/clip`
        : null,
      aiSuggestion: {
        species: detection.aiSpecies,
        confidence: detection.aiConfidence,
        bbox: detection.bbox ?? detection.boundingBox,
      },
      relatedCandidates,
      species,
      options: {
        sex: Object.values(Sex),
        isIndependent: Object.values(IndependentStatus),
        reviewStatus: Object.values(ReviewStatus).filter(
          (status) => status !== ReviewStatus.PENDING,
        ),
      },
    };
  }

  private validateReviewPayload(dto: ValidateDetectionDto) {
    if (!FINAL_REVIEW_STATUSES.has(dto.reviewStatus)) {
      throw new BadRequestException('Invalid final review status');
    }

    if (!dto.hasAnimal && dto.reviewStatus !== ReviewStatus.DISCARDED) {
      throw new BadRequestException(
        'If hasAnimal is false, reviewStatus must be DISCARDED',
      );
    }

    if (
      dto.hasAnimal &&
      SPECIES_REQUIRED_STATUSES.has(dto.reviewStatus) &&
      !dto.validatedSpeciesId &&
      !dto.validatedSpeciesName
    ) {
      throw new BadRequestException(
        'validatedSpeciesId or validatedSpeciesName is required',
      );
    }
  }

  private async resolveValidatedSpecies(dto: ValidateDetectionDto) {
    if (!dto.hasAnimal || dto.reviewStatus === ReviewStatus.DISCARDED) {
      return null;
    }

    if (dto.validatedSpeciesId) {
      const species = await this.prisma.species.findUnique({
        where: { id: dto.validatedSpeciesId },
      });
      if (!species) {
        throw new NotFoundException('Validated species not found');
      }
      return species;
    }

    if (dto.validatedSpeciesName) {
      const existing = await this.prisma.species.findUnique({
        where: { commonName: dto.validatedSpeciesName },
      });
      if (existing) {
        return existing;
      }

      return this.prisma.species.create({
        data: { commonName: dto.validatedSpeciesName },
      });
    }

    return null;
  }

  private async resolveRelatedDetection(
    detectionId: string,
    projectId: string,
    cameraId: string | null,
    dto: ValidateDetectionDto,
  ) {
    if (dto.isIndependent === IndependentStatus.YES) {
      return null;
    }

    if (!dto.relatedDetectionId) {
      return null;
    }

    if (dto.relatedDetectionId === detectionId) {
      throw new BadRequestException('relatedDetectionId cannot be the same detection');
    }

    const related = await this.prisma.detection.findUnique({
      where: { id: dto.relatedDetectionId },
      select: { id: true, projectId: true, cameraId: true },
    });

    if (!related) {
      throw new NotFoundException('Related detection not found');
    }

    if (related.projectId !== projectId) {
      throw new BadRequestException(
        'Related detection must belong to the same project',
      );
    }

    if (cameraId && related.cameraId && related.cameraId !== cameraId) {
      throw new BadRequestException(
        'Related detection must belong to the same camera when both have camera',
      );
    }

    return related.id;
  }

  private async ensureDetectionExists(detectionId: string) {
    const detection = await this.prisma.detection.findUnique({
      where: { id: detectionId },
      select: { id: true },
    });

    if (!detection) {
      throw new NotFoundException('Detection not found');
    }
  }

  private defaultInclude() {
    return {
      project: { select: { id: true, name: true } },
      camera: { select: { id: true, code: true, stationCode: true, zone: true } },
      mediaFile: {
        select: {
          id: true,
          fileType: true,
          filePath: true,
          recordingDate: true,
          processingStatus: true,
        },
      },
      species: { select: { id: true, commonName: true, scientificName: true } },
      validatedSpeciesRef: {
        select: { id: true, commonName: true, scientificName: true },
      },
      reviewer: { select: { id: true, name: true, email: true, role: true } },
      relatedDetection: {
        select: {
          id: true,
          timestampVideo: true,
          detectedAt: true,
          aiSpecies: true,
          validatedSpecies: true,
        },
      },
    } satisfies Prisma.DetectionInclude;
  }
}
