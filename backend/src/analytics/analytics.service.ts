import { BadRequestException, Injectable } from '@nestjs/common';
import { IndependentStatus, Prisma, ReviewStatus, Sex } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

const VALIDATED_STATUSES: ReviewStatus[] = [
  ReviewStatus.VALIDATED,
  ReviewStatus.CORRECTED,
];

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────
  // Base where clause reused across all methods
  // ──────────────────────────────────────────
  private baseWhere(
    query: AnalyticsQueryDto,
  ): Prisma.DetectionWhereInput {
    const statuses = query.reviewStatus
      ? [query.reviewStatus]
      : VALIDATED_STATUSES;

    return {
      reviewStatus: { in: statuses },
      hasAnimal: true,
      projectId: query.projectId ?? undefined,
      cameraId: query.cameraId ?? undefined,
      validatedSpeciesId: query.speciesId ?? undefined,
      detectedAt:
        query.fromDate || query.toDate
          ? { gte: query.fromDate, lte: query.toDate }
          : undefined,
    };
  }

  // ──────────────────────────────────────────
  // 1. Summary
  // ──────────────────────────────────────────
  async getSummary(query: AnalyticsQueryDto) {
    const [
      totalMediaFiles,
      totalDetections,
      pendingDetections,
      validatedDetections,
      discardedDetections,
      projectsCount,
      camerasCount,
    ] = await Promise.all([
      this.prisma.mediaFile.count({
        where: { projectId: query.projectId ?? undefined },
      }),
      this.prisma.detection.count({
        where: { projectId: query.projectId ?? undefined },
      }),
      this.prisma.detection.count({
        where: {
          reviewStatus: ReviewStatus.PENDING,
          projectId: query.projectId ?? undefined,
        },
      }),
      this.prisma.detection.count({
        where: {
          reviewStatus: { in: VALIDATED_STATUSES },
          projectId: query.projectId ?? undefined,
        },
      }),
      this.prisma.detection.count({
        where: {
          reviewStatus: ReviewStatus.DISCARDED,
          projectId: query.projectId ?? undefined,
        },
      }),
      this.prisma.project.count(),
      this.prisma.camera.count({
        where: { projectId: query.projectId ?? undefined },
      }),
    ]);

    const jaguarSpecies = await this.findJaguarSpecies();

    let jaguarEvents = 0;
    let jaguarIndependentEvents = 0;
    let speciesCount = 0;

    if (jaguarSpecies) {
      [jaguarEvents, jaguarIndependentEvents] = await Promise.all([
        this.prisma.detection.count({
          where: {
            reviewStatus: { in: VALIDATED_STATUSES },
            hasAnimal: true,
            validatedSpeciesId: jaguarSpecies.id,
            projectId: query.projectId ?? undefined,
          },
        }),
        this.prisma.detection.count({
          where: {
            reviewStatus: { in: VALIDATED_STATUSES },
            hasAnimal: true,
            validatedSpeciesId: jaguarSpecies.id,
            isIndependent: IndependentStatus.YES,
            projectId: query.projectId ?? undefined,
          },
        }),
      ]);
    }

    const speciesAgg = await this.prisma.detection.groupBy({
      by: ['validatedSpeciesId'],
      where: {
        reviewStatus: { in: VALIDATED_STATUSES },
        hasAnimal: true,
        validatedSpeciesId: { not: null },
        projectId: query.projectId ?? undefined,
      },
    });
    speciesCount = speciesAgg.length;

    return {
      totalMediaFiles,
      totalDetections,
      pendingDetections,
      validatedDetections,
      discardedDetections,
      jaguarEvents,
      jaguarIndependentEvents,
      speciesCount,
      camerasCount,
      projectsCount,
    };
  }

  // ──────────────────────────────────────────
  // 2. Species frequency
  // ──────────────────────────────────────────
  async getSpeciesFrequency(query: AnalyticsQueryDto) {
    const grouped = await this.prisma.detection.groupBy({
      by: ['validatedSpeciesId'],
      where: {
        ...this.baseWhere(query),
        validatedSpeciesId: { not: null },
      },
      _count: { id: true },
    });

    const independentCounts = await this.prisma.detection.groupBy({
      by: ['validatedSpeciesId'],
      where: {
        ...this.baseWhere(query),
        validatedSpeciesId: { not: null },
        isIndependent: IndependentStatus.YES,
      },
      _count: { id: true },
    });

    const indMap = new Map<string, number>(
      independentCounts.map((r) => [r.validatedSpeciesId!, r._count.id]),
    );

    const speciesIds = grouped
      .map((r) => r.validatedSpeciesId!)
      .filter(Boolean);

    const speciesList = await this.prisma.species.findMany({
      where: { id: { in: speciesIds } },
    });
    const speciesMap = new Map(speciesList.map((s) => [s.id, s]));

    return grouped
      .map((r) => {
        const sp = speciesMap.get(r.validatedSpeciesId!);
        return {
          speciesId: r.validatedSpeciesId,
          commonName: sp?.commonName ?? 'Desconocida',
          scientificName: sp?.scientificName ?? null,
          count: r._count.id,
          independentCount: indMap.get(r.validatedSpeciesId!) ?? 0,
        };
      })
      .sort((a, b) => b.count - a.count);
  }

  // ──────────────────────────────────────────
  // 3. Jaguar abundance
  // ──────────────────────────────────────────
  async getJaguarAbundance(query: AnalyticsQueryDto) {
    const jaguarSpecies = await this.findJaguarSpecies();

    if (!jaguarSpecies) {
      return {
        species: 'Jaguar',
        events: 0,
        independentEvents: 0,
        undeterminedIndependence: 0,
        note: 'No se encontró Jaguar (Panthera onca) en la biblioteca de especies. Crea la especie primero.',
      };
    }

    const baseFilter: Prisma.DetectionWhereInput = {
      reviewStatus: { in: VALIDATED_STATUSES },
      hasAnimal: true,
      validatedSpeciesId: jaguarSpecies.id,
      projectId: query.projectId ?? undefined,
      cameraId: query.cameraId ?? undefined,
      detectedAt:
        query.fromDate || query.toDate
          ? { gte: query.fromDate, lte: query.toDate }
          : undefined,
    };

    const [events, independentEvents, undeterminedIndependence] =
      await Promise.all([
        this.prisma.detection.count({ where: baseFilter }),
        this.prisma.detection.count({
          where: { ...baseFilter, isIndependent: IndependentStatus.YES },
        }),
        this.prisma.detection.count({
          where: {
            ...baseFilter,
            isIndependent: IndependentStatus.UNDETERMINED,
          },
        }),
      ]);

    return {
      species: jaguarSpecies.commonName,
      scientificName: jaguarSpecies.scientificName,
      events,
      independentEvents,
      undeterminedIndependence,
      note: 'Los individuos/eventos independientes son marcados manualmente por el investigador.',
    };
  }

  // ──────────────────────────────────────────
  // 4. By zone
  // ──────────────────────────────────────────
  async getByZone(query: AnalyticsQueryDto) {
    const detections = await this.prisma.detection.findMany({
      where: this.baseWhere(query),
      select: {
        isIndependent: true,
        camera: { select: { zone: true } },
      },
    });

    const zones = new Map<string, { events: number; independentEvents: number }>();

    for (const d of detections) {
      const zone = d.camera?.zone || 'Sin zona';
      const existing = zones.get(zone) ?? { events: 0, independentEvents: 0 };
      existing.events += 1;
      if (d.isIndependent === IndependentStatus.YES) {
        existing.independentEvents += 1;
      }
      zones.set(zone, existing);
    }

    return Array.from(zones.entries())
      .map(([zone, counts]) => ({ zone, ...counts }))
      .sort((a, b) => b.events - a.events);
  }

  // ──────────────────────────────────────────
  // 5. By month
  // ──────────────────────────────────────────
  async getByMonth(query: AnalyticsQueryDto) {
    const detections = await this.prisma.detection.findMany({
      where: this.baseWhere(query),
      select: {
        month: true,
        isIndependent: true,
        detectedAt: true,
        mediaFile: { select: { recordingDate: true } },
      },
    });

    const months = new Map<
      number,
      { events: number; independentEvents: number }
    >();

    for (const d of detections) {
      let m = d.month;
      if (!m) {
        const date =
          d.detectedAt ?? d.mediaFile?.recordingDate;
        if (date) m = new Date(date).getUTCMonth() + 1;
      }
      if (!m || m < 1 || m > 12) continue;

      const existing = months.get(m) ?? { events: 0, independentEvents: 0 };
      existing.events += 1;
      if (d.isIndependent === IndependentStatus.YES) {
        existing.independentEvents += 1;
      }
      months.set(m, existing);
    }

    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const data = months.get(m) ?? { events: 0, independentEvents: 0 };
      return {
        month: m,
        monthName: MONTH_NAMES[i],
        ...data,
      };
    });
  }

  // ──────────────────────────────────────────
  // 6. Sex ratio
  // ──────────────────────────────────────────
  async getSexRatio(query: AnalyticsQueryDto) {
    const grouped = await this.prisma.detection.groupBy({
      by: ['sex'],
      where: this.baseWhere(query),
      _count: { id: true },
    });

    const countMap = new Map<Sex, number>(
      grouped.map((r) => [r.sex, r._count.id]),
    );

    const SEX_LABELS: Record<Sex, string> = {
      MALE: 'Macho',
      FEMALE: 'Hembra',
      UNDETERMINED: 'No determinado',
    };

    return Object.values(Sex).map((sex) => ({
      sex,
      label: SEX_LABELS[sex],
      count: countMap.get(sex) ?? 0,
    }));
  }

  // ──────────────────────────────────────────
  // 7. Activity by hour
  // ──────────────────────────────────────────
  async getActivityByHour(query: AnalyticsQueryDto) {
    const detections = await this.prisma.detection.findMany({
      where: this.baseWhere(query),
      select: {
        hour: true,
        detectedAt: true,
        timestampSeconds: true,
        mediaFile: { select: { recordingDate: true } },
      },
    });

    const hours = new Map<number, number>();

    for (const d of detections) {
      let h = d.hour;
      if (h == null) {
        const date = d.detectedAt ?? d.mediaFile?.recordingDate;
        if (date) {
          h = new Date(date).getUTCHours();
        } else if (d.timestampSeconds != null) {
          h = Math.floor(
            (Number(d.timestampSeconds) % 86400) / 3600,
          );
        }
      }
      if (h == null || h < 0 || h > 23) continue;
      hours.set(h, (hours.get(h) ?? 0) + 1);
    }

    return Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      events: hours.get(h) ?? 0,
    }));
  }

  // ──────────────────────────────────────────
  // 8. Simple density
  // ──────────────────────────────────────────
  async getSimpleDensity(query: AnalyticsQueryDto) {
    let project: { id: string; name: string; samplingAreaKm2: unknown } | null =
      null;

    if (query.projectId) {
      project = await this.prisma.project.findUnique({
        where: { id: query.projectId },
        select: { id: true, name: true, samplingAreaKm2: true },
      });
    } else {
      const projects = await this.prisma.project.findMany({
        select: { id: true, name: true, samplingAreaKm2: true },
        take: 1,
      });
      project = projects[0] ?? null;
    }

    if (!project) {
      throw new BadRequestException(
        'No se encontró un proyecto. Especifica projectId.',
      );
    }

    const area =
      project.samplingAreaKm2 != null
        ? Number(project.samplingAreaKm2)
        : null;

    const jaguarSpecies = await this.findJaguarSpecies();

    const independentJaguarEvents = jaguarSpecies
      ? await this.prisma.detection.count({
          where: {
            reviewStatus: { in: VALIDATED_STATUSES },
            hasAnimal: true,
            validatedSpeciesId: jaguarSpecies.id,
            isIndependent: IndependentStatus.YES,
            projectId: project.id,
          },
        })
      : 0;

    let densityPer100Km2: number | null = null;
    let densityNote: string | null = null;

    if (!area || area === 0) {
      densityNote =
        'samplingAreaKm2 no está definida en el proyecto. Ingresa el área de muestreo para calcular densidad.';
    } else {
      densityPer100Km2 =
        Math.round((independentJaguarEvents / area) * 100 * 100) / 100;
    }

    return {
      projectId: project.id,
      projectName: project.name,
      samplingAreaKm2: area,
      independentJaguarEvents,
      densityPer100Km2,
      formula: 'independentJaguarEvents / samplingAreaKm2 * 100',
      note: densityNote ??
        'Estimación simplificada para MVP. No reemplaza modelos científicos como SECR o distancia de muestreo.',
    };
  }

  // ──────────────────────────────────────────
  // 9. Shared habitat
  // ──────────────────────────────────────────
  async getSharedHabitat(query: AnalyticsQueryDto) {
    const jaguarSpecies = await this.findJaguarSpecies();

    if (!jaguarSpecies) {
      return {
        data: [],
        note: 'No se encontró Jaguar en la biblioteca de especies.',
      };
    }

    const jaguarDetections = await this.prisma.detection.findMany({
      where: {
        reviewStatus: { in: VALIDATED_STATUSES },
        hasAnimal: true,
        validatedSpeciesId: jaguarSpecies.id,
        projectId: query.projectId ?? undefined,
        cameraId: query.cameraId ?? undefined,
      },
      select: { cameraId: true },
      distinct: ['cameraId'],
    });

    const jaguarCameraIds = jaguarDetections
      .map((d) => d.cameraId)
      .filter(Boolean) as string[];

    if (jaguarCameraIds.length === 0) {
      return {
        data: [],
        note: 'No hay jaguares validados con cámara asignada en este proyecto.',
      };
    }

    const otherDetections = await this.prisma.detection.groupBy({
      by: ['validatedSpeciesId'],
      where: {
        reviewStatus: { in: VALIDATED_STATUSES },
        hasAnimal: true,
        validatedSpeciesId: { not: jaguarSpecies.id },
        NOT: { validatedSpeciesId: null },
        cameraId: { in: jaguarCameraIds },
        projectId: query.projectId ?? undefined,
      },
      _count: { id: true },
    });

    const speciesIds = otherDetections
      .map((r) => r.validatedSpeciesId!)
      .filter(Boolean);

    if (speciesIds.length === 0) {
      return {
        data: [],
        note: 'No hay otras especies validadas en las mismas cámaras que el jaguar.',
      };
    }

    const speciesList = await this.prisma.species.findMany({
      where: { id: { in: speciesIds } },
    });
    const speciesMap = new Map(speciesList.map((s) => [s.id, s]));

    const data = otherDetections
      .map((r) => {
        const sp = speciesMap.get(r.validatedSpeciesId!);
        return {
          speciesId: r.validatedSpeciesId,
          commonName: sp?.commonName ?? 'Desconocida',
          scientificName: sp?.scientificName ?? null,
          records: r._count.id,
          sharesCameraWithJaguar: true,
        };
      })
      .sort((a, b) => b.records - a.records);

    return { data, note: null };
  }

  // ──────────────────────────────────────────
  // 10. Trend
  // ──────────────────────────────────────────
  async getTrend(query: AnalyticsQueryDto) {
    const jaguarSpecies = await this.findJaguarSpecies();

    if (!jaguarSpecies) {
      return {
        periods: [],
        trend: 'INSUFFICIENT_DATA',
        message: 'No se encontró Jaguar en la biblioteca de especies.',
        note: 'Conclusión orientativa basada en eventos independientes validados, no es una inferencia poblacional definitiva.',
      };
    }

    const detections = await this.prisma.detection.findMany({
      where: {
        reviewStatus: { in: VALIDATED_STATUSES },
        hasAnimal: true,
        validatedSpeciesId: jaguarSpecies.id,
        isIndependent: IndependentStatus.YES,
        projectId: query.projectId ?? undefined,
        cameraId: query.cameraId ?? undefined,
        detectedAt:
          query.fromDate || query.toDate
            ? { gte: query.fromDate, lte: query.toDate }
            : undefined,
      },
      select: { detectedAt: true, month: true, mediaFile: { select: { recordingDate: true } } },
      orderBy: [{ detectedAt: 'asc' }, { createdAt: 'asc' }],
    });

    const periodMap = new Map<string, number>();

    for (const d of detections) {
      const date =
        d.detectedAt ?? d.mediaFile?.recordingDate;
      if (!date) continue;
      const dt = new Date(date);
      const period = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
      periodMap.set(period, (periodMap.get(period) ?? 0) + 1);
    }

    const periods = Array.from(periodMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, independentJaguarEvents]) => ({
        period,
        independentJaguarEvents,
      }));

    if (periods.length < 2) {
      return {
        periods,
        trend: 'INSUFFICIENT_DATA',
        message:
          'Datos insuficientes para calcular tendencia. Se necesitan al menos 2 periodos mensuales.',
        note: 'Conclusión orientativa basada en eventos independientes validados, no es una inferencia poblacional definitiva.',
      };
    }

    const last = periods[periods.length - 1].independentJaguarEvents;
    const prev = periods[periods.length - 2].independentJaguarEvents;
    const diff = last - prev;
    const pct = prev > 0 ? Math.abs(diff / prev) : 1;

    let trend: string;
    let message: string;

    if (pct < 0.1) {
      trend = 'STABLE';
      message = 'La presencia parece mantenerse estable respecto al periodo anterior.';
    } else if (diff > 0) {
      trend = 'INCREASING';
      message = 'La presencia parece aumentar respecto al periodo anterior.';
    } else {
      trend = 'DECREASING';
      message = 'La presencia parece disminuir respecto al periodo anterior.';
    }

    return {
      periods,
      trend,
      message,
      note: 'Conclusión orientativa basada en eventos independientes validados, no es una inferencia poblacional definitiva.',
    };
  }

  // ──────────────────────────────────────────
  // Helper: find jaguar species
  // ──────────────────────────────────────────
  private findJaguarSpecies() {
    return this.prisma.species.findFirst({
      where: {
        OR: [
          { commonName: { contains: 'Jaguar', mode: 'insensitive' } },
          { scientificName: { contains: 'Panthera onca', mode: 'insensitive' } },
        ],
      },
    });
  }
}
