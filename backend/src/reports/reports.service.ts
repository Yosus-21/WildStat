import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { AnalyticsService } from '../analytics/analytics.service';
import { AnalyticsQueryDto } from '../analytics/dto/analytics-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ReportQueryDto } from './dto/report-query.dto';

type TableColumn<T> = {
  header: string;
  width: number;
  value: (row: T) => string | number | null | undefined;
};

type ReportData = {
  summary: Awaited<ReturnType<AnalyticsService['getSummary']>>;
  speciesFrequency: Awaited<ReturnType<AnalyticsService['getSpeciesFrequency']>>;
  jaguarAbundance: Awaited<ReturnType<AnalyticsService['getJaguarAbundance']>>;
  byZone: Awaited<ReturnType<AnalyticsService['getByZone']>>;
  byMonth: Awaited<ReturnType<AnalyticsService['getByMonth']>>;
  sexRatio: Awaited<ReturnType<AnalyticsService['getSexRatio']>>;
  activityByHour: Awaited<ReturnType<AnalyticsService['getActivityByHour']>>;
  density: Awaited<ReturnType<AnalyticsService['getSimpleDensity']>>;
  sharedHabitat: Awaited<ReturnType<AnalyticsService['getSharedHabitat']>>;
  trend: Awaited<ReturnType<AnalyticsService['getTrend']>>;
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async generateProjectPdf(projectId: string, query: ReportQueryDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        cameras: {
          orderBy: { code: 'asc' },
          select: { id: true, code: true, zone: true },
        },
      },
    });

    if (!project) {
      return null;
    }

    const analyticsQuery: AnalyticsQueryDto = {
      projectId,
      speciesId: query.speciesId,
      cameraId: query.cameraId,
      fromDate: query.fromDate,
      toDate: query.toDate,
    };

    const data = await this.collectAnalytics(analyticsQuery);
    const buffer = await this.buildPdf(project, query, data);
    const filename = `reporte-wildstat-${this.safeFilename(project.name)}.pdf`;

    await this.prisma.report.create({
      data: {
        projectId,
        title: `Reporte WildStat - ${project.name}`,
        format: 'PDF',
        filePath: null,
        metadata: {
          generatedAt: new Date().toISOString(),
          mode: 'on-demand',
          filters: this.serializeFilters(query),
          filename,
        },
      },
    });

    return { buffer, filename };
  }

  private collectAnalytics(query: AnalyticsQueryDto): Promise<ReportData> {
    return Promise.all([
      this.analyticsService.getSummary(query),
      this.analyticsService.getSpeciesFrequency(query),
      this.analyticsService.getJaguarAbundance(query),
      this.analyticsService.getByZone(query),
      this.analyticsService.getByMonth(query),
      this.analyticsService.getSexRatio(query),
      this.analyticsService.getActivityByHour(query),
      this.analyticsService.getSimpleDensity(query),
      this.analyticsService.getSharedHabitat(query),
      this.analyticsService.getTrend(query),
    ]).then(
      ([
        summary,
        speciesFrequency,
        jaguarAbundance,
        byZone,
        byMonth,
        sexRatio,
        activityByHour,
        density,
        sharedHabitat,
        trend,
      ]) => ({
        summary,
        speciesFrequency,
        jaguarAbundance,
        byZone,
        byMonth,
        sexRatio,
        activityByHour,
        density,
        sharedHabitat,
        trend,
      }),
    );
  }

  private async buildPdf(
    project: {
      name: string;
      organization: string | null;
      responsible: string | null;
      objective: string | null;
      studyArea: string | null;
      startDate: Date | null;
      endDate: Date | null;
      samplingAreaKm2: unknown;
      cameras: { code: string; zone: string | null }[];
    },
    query: ReportQueryDto,
    data: ReportData,
  ): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 48,
      bufferPages: true,
      info: {
        Title: `Reporte WildStat - ${project.name}`,
        Author: 'WildStat MVP',
        Subject: 'Reporte automatico de monitoreo de fauna',
      },
    });
    const chunks: Buffer[] = [];
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    this.cover(doc, project, query);
    this.sectionTitle(doc, '1. Resumen ejecutivo');
    this.paragraph(
      doc,
      `Este reporte resume los eventos validados y corregidos del proyecto ${project.name}. Los registros descartados no se incluyen en los calculos biologicos.`,
    );
    this.keyValueGrid(doc, [
      ['Archivos multimedia', data.summary.totalMediaFiles],
      ['Detecciones totales', data.summary.totalDetections],
      ['Validadas/corregidas', data.summary.validatedDetections],
      ['Pendientes', data.summary.pendingDetections],
      ['Descartadas', data.summary.discardedDetections],
      ['Especies validadas', data.summary.speciesCount],
      ['Camaras', data.summary.camerasCount],
      ['Eventos jaguar', data.jaguarAbundance.events],
      ['Jaguar independientes', data.jaguarAbundance.independentEvents],
    ]);

    this.sectionTitle(doc, '2. Jaguar');
    this.keyValueGrid(doc, [
      ['Especie', this.speciesLabel(data.jaguarAbundance)],
      ['Eventos validados', data.jaguarAbundance.events],
      ['Eventos independientes', data.jaguarAbundance.independentEvents],
      ['Independencia sin determinar', data.jaguarAbundance.undeterminedIndependence],
    ]);
    this.note(doc, data.jaguarAbundance.note);

    this.sectionTitle(doc, '3. Frecuencia por especie');
    this.table(doc, data.speciesFrequency, [
      { header: 'Especie', width: 150, value: (r) => r.commonName },
      { header: 'Nombre cientifico', width: 160, value: (r) => r.scientificName ?? '-' },
      { header: 'Eventos', width: 80, value: (r) => r.count },
      { header: 'Independ.', width: 80, value: (r) => r.independentCount },
    ]);

    this.sectionTitle(doc, '4. Eventos por zona');
    this.table(doc, data.byZone, [
      { header: 'Zona', width: 220, value: (r) => r.zone },
      { header: 'Eventos', width: 120, value: (r) => r.events },
      { header: 'Independientes', width: 130, value: (r) => r.independentEvents },
    ]);

    this.sectionTitle(doc, '5. Eventos por mes');
    this.table(doc, data.byMonth, [
      { header: 'Mes', width: 220, value: (r) => r.monthName },
      { header: 'Eventos', width: 120, value: (r) => r.events },
      { header: 'Independientes', width: 130, value: (r) => r.independentEvents },
    ]);

    this.sectionTitle(doc, '6. Sexo');
    this.table(doc, data.sexRatio, [
      { header: 'Sexo', width: 250, value: (r) => r.label },
      { header: 'Eventos', width: 120, value: (r) => r.count },
    ]);

    this.sectionTitle(doc, '7. Actividad por hora');
    const activeHours = data.activityByHour.filter((row) => row.events > 0);
    this.paragraph(doc, 'El calculo considera las 24 horas; la tabla muestra solo horas con eventos.');
    this.table(doc, activeHours, [
      { header: 'Hora', width: 220, value: (r) => `${String(r.hour).padStart(2, '0')}:00` },
      { header: 'Eventos', width: 120, value: (r) => r.events },
    ]);

    this.sectionTitle(doc, '8. Densidad poblacional simple');
    this.keyValueGrid(doc, [
      ['Area de muestreo', data.density.samplingAreaKm2 ?? 'No definida'],
      ['Eventos independientes jaguar', data.density.independentJaguarEvents],
      ['Densidad / 100 km2', data.density.densityPer100Km2 ?? 'No calculable'],
      ['Formula', data.density.formula],
    ]);
    this.note(doc, 'Estimacion simplificada para MVP. No reemplaza modelos cientificos como SECR.');

    this.sectionTitle(doc, '9. Tendencia');
    this.table(doc, data.trend.periods, [
      { header: 'Periodo', width: 240, value: (r) => r.period },
      { header: 'Eventos independientes', width: 190, value: (r) => r.independentJaguarEvents },
    ]);
    this.note(doc, `${data.trend.message} ${data.trend.note}`);

    this.sectionTitle(doc, '10. Habitat compartido');
    const habitatRows = data.sharedHabitat.data ?? [];
    this.table(doc, habitatRows, [
      { header: 'Especie', width: 170, value: (r) => r.commonName },
      { header: 'Nombre cientifico', width: 170, value: (r) => r.scientificName ?? '-' },
      { header: 'Registros', width: 90, value: (r) => r.records },
    ]);
    if (data.sharedHabitat.note) {
      this.note(doc, data.sharedHabitat.note);
    }

    this.sectionTitle(doc, '11. Conclusiones automaticas');
    for (const conclusion of this.conclusions(data)) {
      this.bullet(doc, conclusion);
    }
    this.note(
      doc,
      'Las conclusiones son orientativas y dependen de la calidad del muestreo, la revision humana y el esfuerzo de camaras.',
    );

    this.addFooters(doc);
    doc.end();
    return done;
  }

  private cover(
    doc: PDFKit.PDFDocument,
    project: {
      name: string;
      organization: string | null;
      responsible: string | null;
      objective: string | null;
      studyArea: string | null;
      startDate: Date | null;
      endDate: Date | null;
      samplingAreaKm2: unknown;
      cameras: { code: string; zone: string | null }[];
    },
    query: ReportQueryDto,
  ) {
    doc.font('Helvetica-Bold').fontSize(24).fillColor('#12372a').text('WildStat MVP', { align: 'center' });
    doc.moveDown(0.7);
    doc.fontSize(18).fillColor('#1f2937').text('Reporte automatico de monitoreo de fauna', { align: 'center' });
    doc.moveDown(2);
    this.keyValueGrid(doc, [
      ['Proyecto', project.name],
      ['Organizacion', project.organization ?? '-'],
      ['Responsable', project.responsible ?? '-'],
      ['Area de estudio', project.studyArea ?? '-'],
      ['Objetivo', project.objective ?? '-'],
      ['Periodo del proyecto', this.dateRange(project.startDate, project.endDate)],
      ['Area de muestreo km2', project.samplingAreaKm2 ? Number(project.samplingAreaKm2) : 'No definida'],
      ['Camaras registradas', project.cameras.length],
      ['Filtros del reporte', this.filterLabel(query)],
      ['Fecha de generacion', this.formatDateTime(new Date())],
    ]);
    doc.addPage();
  }

  private sectionTitle(doc: PDFKit.PDFDocument, title: string) {
    this.ensureSpace(doc, 70);
    doc.moveDown(0.8);
    doc.font('Helvetica-Bold').fontSize(15).fillColor('#12372a').text(title);
    doc.moveTo(doc.x, doc.y + 4).lineTo(545, doc.y + 4).strokeColor('#d7e0da').stroke();
    doc.moveDown(0.8);
  }

  private paragraph(doc: PDFKit.PDFDocument, text: string) {
    doc.font('Helvetica').fontSize(10.5).fillColor('#27303a').text(text, {
      lineGap: 3,
      align: 'left',
    });
    doc.moveDown(0.6);
  }

  private note(doc: PDFKit.PDFDocument, text?: string | null) {
    if (!text) return;
    this.ensureSpace(doc, 40);
    doc.font('Helvetica-Oblique').fontSize(9.5).fillColor('#56616c').text(`Nota: ${text}`, {
      lineGap: 2,
    });
    doc.moveDown(0.5);
  }

  private bullet(doc: PDFKit.PDFDocument, text: string) {
    this.ensureSpace(doc, 28);
    const y = doc.y;
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#12372a').text('•', 54, y);
    doc.font('Helvetica').fontSize(10.5).fillColor('#27303a').text(text, 70, y, {
      width: 470,
      lineGap: 2,
    });
    doc.moveDown(0.35);
  }

  private keyValueGrid(doc: PDFKit.PDFDocument, rows: [string, string | number | null | undefined][]) {
    for (const [label, value] of rows) {
      this.ensureSpace(doc, 26);
      const y = doc.y;
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#56616c').text(label, 48, y, { width: 170 });
      doc.font('Helvetica').fontSize(10.5).fillColor('#111827').text(String(value ?? '-'), 225, y, { width: 320 });
      doc.moveDown(0.5);
    }
    doc.moveDown(0.3);
  }

  private table<T>(doc: PDFKit.PDFDocument, rows: T[], columns: TableColumn<T>[]) {
    if (!rows.length) {
      this.note(doc, 'No hay datos disponibles para esta seccion.');
      return;
    }

    const left = 48;
    const rowHeight = 26;
    const headerHeight = 24;
    const drawHeader = () => {
      this.ensureSpace(doc, headerHeight + rowHeight);
      const y = doc.y;
      doc.rect(left, y, columns.reduce((sum, c) => sum + c.width, 0), headerHeight).fill('#e8f0ea');
      let x = left;
      for (const column of columns) {
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#12372a').text(column.header, x + 5, y + 7, {
          width: column.width - 10,
          height: headerHeight - 8,
        });
        x += column.width;
      }
      doc.y = y + headerHeight;
    };

    drawHeader();
    rows.forEach((row, index) => {
      if (doc.y > doc.page.height - 90) {
        doc.addPage();
        drawHeader();
      }
      const y = doc.y;
      const bg = index % 2 === 0 ? '#ffffff' : '#f8faf9';
      doc.rect(left, y, columns.reduce((sum, c) => sum + c.width, 0), rowHeight).fill(bg);
      let x = left;
      for (const column of columns) {
        doc.font('Helvetica').fontSize(8.8).fillColor('#27303a').text(String(column.value(row) ?? '-'), x + 5, y + 7, {
          width: column.width - 10,
          height: rowHeight - 8,
          ellipsis: true,
        });
        x += column.width;
      }
      doc.y = y + rowHeight;
    });
    doc.moveDown(0.8);
  }

  private addFooters(doc: PDFKit.PDFDocument) {
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      doc.font('Helvetica').fontSize(8).fillColor('#7b8794').text(
        `WildStat MVP - Reporte generado automaticamente - Pagina ${i + 1} de ${range.count}`,
        48,
        800,
        { align: 'center', width: 500 },
      );
    }
  }

  private ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
    if (doc.y + needed > doc.page.height - 80) {
      doc.addPage();
    }
  }

  private conclusions(data: ReportData) {
    const conclusions = [
      `Se registraron ${data.jaguarAbundance.events ?? 0} eventos validados de jaguar.`,
      `De estos, ${data.jaguarAbundance.independentEvents ?? 0} fueron marcados como individuos/eventos independientes.`,
    ];
    const topZone = data.byZone[0];
    if (topZone) {
      conclusions.push(`La zona con mayor numero de eventos fue ${topZone.zone}, con ${topZone.events} eventos.`);
    }
    const topMonth = [...data.byMonth].sort((a, b) => b.events - a.events)[0];
    if (topMonth && topMonth.events > 0) {
      conclusions.push(`El mes con mayor numero de eventos fue ${topMonth.monthName}, con ${topMonth.events} eventos.`);
    }
    conclusions.push('La tendencia es orientativa y requiere mas datos para una conclusion cientifica robusta.');
    return conclusions.slice(0, 5);
  }

  private speciesLabel(value: { species?: string; scientificName?: string | null }) {
    return value.scientificName ? `${value.species} (${value.scientificName})` : value.species ?? 'Jaguar';
  }

  private dateRange(start?: Date | null, end?: Date | null) {
    if (!start && !end) return '-';
    return `${start ? this.formatDate(start) : 'Sin inicio'} - ${end ? this.formatDate(end) : 'Sin cierre'}`;
  }

  private filterLabel(query: ReportQueryDto) {
    const parts = [
      query.fromDate ? `desde ${this.formatDate(query.fromDate)}` : null,
      query.toDate ? `hasta ${this.formatDate(query.toDate)}` : null,
      query.speciesId ? `speciesId=${query.speciesId}` : null,
      query.cameraId ? `cameraId=${query.cameraId}` : null,
    ].filter(Boolean);
    return parts.length ? parts.join(', ') : 'Sin filtros adicionales';
  }

  private serializeFilters(query: ReportQueryDto) {
    return {
      speciesId: query.speciesId ?? null,
      cameraId: query.cameraId ?? null,
      fromDate: query.fromDate?.toISOString() ?? null,
      toDate: query.toDate?.toISOString() ?? null,
    };
  }

  private formatDate(value: Date) {
    return new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeZone: 'America/La_Paz' }).format(value);
  }

  private formatDateTime(value: Date) {
    return new Intl.DateTimeFormat('es-BO', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/La_Paz',
    }).format(value);
  }

  private safeFilename(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, 80) || 'proyecto';
  }
}
