import { Injectable } from '@nestjs/common';
import { Prisma, ReviewStatus } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { parse: csvParse } = require('json2csv');
import { PrismaService } from '../prisma/prisma.service';
import { ValidatedDatasetFiltersDto } from './dto/validated-dataset-filters.dto';

@Injectable()
export class DatasetService {
  constructor(private readonly prisma: PrismaService) {}

  async findValidated(filters: ValidatedDatasetFiltersDto) {
    const detections = await this.prisma.detection.findMany({
      where: this.buildWhere(filters),
      orderBy: [{ detectedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        project: true,
        camera: true,
        mediaFile: true,
        validatedSpeciesRef: true,
        reviewer: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return detections.map((detection) => ({
      id: detection.id,
      project: {
        id: detection.project.id,
        name: detection.project.name,
      },
      camera: detection.camera
        ? {
            id: detection.camera.id,
            code: detection.camera.code,
            stationCode: detection.camera.stationCode,
            zone: detection.camera.zone,
            latitude: detection.camera.latitude,
            longitude: detection.camera.longitude,
          }
        : null,
      mediaFile: {
        id: detection.mediaFile.id,
        fileType: detection.mediaFile.fileType,
        filePath: detection.mediaFile.filePath,
        recordingDate: detection.mediaFile.recordingDate,
      },
      month: detection.month,
      hour: detection.hour,
      timestampVideo: detection.timestampVideo,
      timestampSeconds: detection.timestampSeconds,
      aiSpecies: detection.aiSpecies,
      aiConfidence: detection.aiConfidence,
      validatedSpecies: detection.validatedSpeciesRef
        ? {
            id: detection.validatedSpeciesRef.id,
            commonName: detection.validatedSpeciesRef.commonName,
            scientificName: detection.validatedSpeciesRef.scientificName,
          }
        : detection.validatedSpecies,
      sex: detection.sex,
      isIndependent: detection.isIndependent,
      relatedDetectionId: detection.relatedDetectionId,
      reviewStatus: detection.reviewStatus,
      hasAnimal: detection.hasAnimal,
      notes: detection.notes,
      reviewer: detection.reviewer,
      detectedAt: detection.detectedAt,
      validatedAt: detection.validatedAt,
    }));
  }

  async exportCsv(filters: ValidatedDatasetFiltersDto): Promise<string> {
    const rows = await this.findValidated(filters);

    const SEX_LABELS: Record<string, string> = {
      MALE: 'Macho',
      FEMALE: 'Hembra',
      UNDETERMINED: 'No determinado',
    };
    const IND_LABELS: Record<string, string> = {
      YES: 'Sí',
      NO: 'No',
      UNDETERMINED: 'No determinado',
    };
    const STATUS_LABELS: Record<string, string> = {
      VALIDATED: 'Validada',
      CORRECTED: 'Corregida',
      DISCARDED: 'Descartada',
      DOUBTFUL: 'Dudosa',
      PENDING: 'Pendiente',
    };

    const fmtDate = (v: unknown) => {
      if (!v) return '';
      const d = new Date(v as string);
      return isNaN(d.getTime()) ? String(v) : d.toISOString().replace('T', ' ').slice(0, 19);
    };

    const fields = [
      'Proyecto',
      'Camara',
      'Zona',
      'Latitud',
      'Longitud',
      'Archivo',
      'TipoArchivo',
      'FechaGrabacion',
      'Mes',
      'Hora',
      'MinutoVideo',
      'EspecieIA',
      'ConfianzaIA',
      'EspecieValidada',
      'NombreCientifico',
      'Sexo',
      'IndividuoIndependiente',
      'EventoRelacionado',
      'EstadoRevision',
      'Observaciones',
      'Revisor',
      'FechaValidacion',
    ];

    const records = rows.map((r) => {
      const sp =
        typeof r.validatedSpecies === 'object' && r.validatedSpecies
          ? r.validatedSpecies
          : null;

      return {
        Proyecto: r.project?.name ?? '',
        Camara: r.camera?.code ?? '',
        Zona: r.camera?.zone ?? '',
        Latitud: r.camera?.latitude ?? '',
        Longitud: r.camera?.longitude ?? '',
        Archivo: r.mediaFile?.filePath
          ? String(r.mediaFile.filePath).split('/').pop() ?? ''
          : '',
        TipoArchivo: r.mediaFile?.fileType ?? '',
        FechaGrabacion: fmtDate(r.mediaFile?.recordingDate),
        Mes: r.month ?? '',
        Hora: r.hour ?? '',
        MinutoVideo: r.timestampVideo ?? '',
        EspecieIA: r.aiSpecies ?? '',
        ConfianzaIA:
          r.aiConfidence != null
            ? (Number(r.aiConfidence) * 100).toFixed(1)
            : '',
        EspecieValidada: sp ? sp.commonName : (r.validatedSpecies as string) ?? '',
        NombreCientifico: sp ? (sp as { scientificName?: string | null }).scientificName ?? '' : '',
        Sexo: SEX_LABELS[String(r.sex)] ?? String(r.sex ?? ''),
        IndividuoIndependiente:
          IND_LABELS[String(r.isIndependent)] ?? String(r.isIndependent ?? ''),
        EventoRelacionado: r.relatedDetectionId ?? '',
        EstadoRevision:
          STATUS_LABELS[String(r.reviewStatus)] ?? String(r.reviewStatus ?? ''),
        Observaciones: r.notes ?? '',
        Revisor: r.reviewer?.name ?? '',
        FechaValidacion: fmtDate(r.validatedAt),
      };
    });

    return csvParse(records, { fields }) as string;
  }

  private buildWhere(
    filters: ValidatedDatasetFiltersDto,
  ): Prisma.DetectionWhereInput {
    const reviewStatus = filters.reviewStatus
      ? filters.reviewStatus
      : { in: [ReviewStatus.VALIDATED, ReviewStatus.CORRECTED] };

    return {
      projectId: filters.projectId,
      cameraId: filters.cameraId,
      validatedSpeciesId: filters.speciesId,
      sex: filters.sex,
      isIndependent: filters.isIndependent,
      reviewStatus,
      detectedAt: {
        gte: filters.fromDate,
        lte: filters.toDate,
      },
    };
  }
}
