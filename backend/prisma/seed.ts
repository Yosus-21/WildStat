import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  IndependentStatus,
  MediaFileType,
  PrivacyStatus,
  PrismaClient,
  ProcessingStatus,
  ProjectStatus,
  ReviewStatus,
  Sex,
  UserRole,
} from '@prisma/client';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash('FaunaLens123!', 12);

  const investigator = await prisma.user.upsert({
    where: { email: 'investigador@faunalens.local' },
    update: { name: 'Investigador WildStat', role: UserRole.INVESTIGATOR },
    create: {
      name: 'Investigador WildStat',
      email: 'investigador@faunalens.local',
      passwordHash,
      role: UserRole.INVESTIGATOR,
    },
  });

  await prisma.user.upsert({
    where: { email: 'viewer@faunalens.local' },
    update: { name: 'Visualizador WildStat', role: UserRole.VIEWER },
    create: {
      name: 'Visualizador WildStat',
      email: 'viewer@faunalens.local',
      passwordHash,
      role: UserRole.VIEWER,
    },
  });

  const species = [
    {
      commonName: 'Jaguar',
      scientificName: 'Panthera onca',
      family: 'Felidae',
      orderName: 'Carnivora',
      trophicGuild: 'Carnivoro',
      isJaguarPrey: false,
      isTargetSpecies: true,
    },
    {
      commonName: 'Puma',
      scientificName: 'Puma concolor',
      family: 'Felidae',
      orderName: 'Carnivora',
      trophicGuild: 'Carnivoro',
    },
    {
      commonName: 'Ocelote',
      scientificName: 'Leopardus pardalis',
      family: 'Felidae',
      orderName: 'Carnivora',
      trophicGuild: 'Carnivoro',
    },
    { commonName: 'Taitetú', isJaguarPrey: true },
    { commonName: 'Guaso', isJaguarPrey: true },
    { commonName: 'Tatú', isJaguarPrey: true },
    { commonName: 'Jochi', isJaguarPrey: true },
  ];

  const speciesByName = new Map<string, { id: string }>();
  for (const item of species) {
    const row = await prisma.species.upsert({
      where: { commonName: item.commonName },
      update: item,
      create: item,
    });
    speciesByName.set(row.commonName, row);
  }

  const project = await upsertDemoProject(investigator.id);
  const cameras = await upsertDemoCameras(project.id);
  await createDemoDetections({
    projectId: project.id,
    investigatorId: investigator.id,
    cameras,
    speciesByName,
  });
}

async function upsertDemoProject(createdById: string) {
  const existing = await prisma.project.findFirst({
    where: { name: 'Monitoreo Jaguar Palmarito 2026' },
  });

  const data = {
    organization: 'WWF Bolivia',
      responsible: 'Equipo WildStat',
    objective:
      'Monitoreo de jaguar mediante cámaras trampa y validación humana asistida por IA.',
    studyArea: 'TIOC Monte Verde',
    targetSpecies: 'Jaguar',
    samplingAreaKm2: '250',
    status: ProjectStatus.REVIEW,
    privacyStatus: PrivacyStatus.INTERNAL,
  };

  if (existing) {
    return prisma.project.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.project.create({
    data: {
      name: 'Monitoreo Jaguar Palmarito 2026',
      createdById,
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T23:59:59.000Z'),
      ...data,
    },
  });
}

async function upsertDemoCameras(projectId: string) {
  const cameraData = [
    {
      code: 'CAM-01',
      stationCode: 'EST-NORTE-01',
      zone: 'Zona Norte',
      latitude: '-16.2501',
      longitude: '-62.1101',
      habitatType: 'Bosque seco chiquitano',
    },
    {
      code: 'CAM-02',
      stationCode: 'EST-RIO-01',
      zone: 'Zona Río',
      latitude: '-16.2705',
      longitude: '-62.1452',
      habitatType: 'Ribera',
    },
    {
      code: 'CAM-03',
      stationCode: 'EST-CAMINO-01',
      zone: 'Zona Camino',
      latitude: '-16.2912',
      longitude: '-62.1803',
      habitatType: 'Sendero de fauna',
    },
  ];

  const cameras: Record<string, { id: string }> = {};
  for (const camera of cameraData) {
    const row = await prisma.camera.upsert({
      where: { projectId_code: { projectId, code: camera.code } },
      update: {
        stationCode: camera.stationCode,
        zone: camera.zone,
        latitude: camera.latitude,
        longitude: camera.longitude,
        habitatType: camera.habitatType,
        status: 'ACTIVE',
      },
      create: {
        projectId,
        ...camera,
        status: 'ACTIVE',
      },
    });
    cameras[camera.code] = row;
  }
  return cameras;
}

async function createDemoDetections({
  projectId,
  investigatorId,
  cameras,
  speciesByName,
}: {
  projectId: string;
  investigatorId: string;
  cameras: Record<string, { id: string }>;
  speciesByName: Map<string, { id: string }>;
}) {
  const existingDemo = await prisma.detection.count({
    where: { projectId, notes: { contains: 'DEMO-SEED' } },
  });

  if (existingDemo > 0) {
    return;
  }

  const rows = [
    {
      key: 'jaguar-jan-independent-male',
      camera: 'CAM-01',
      species: 'Jaguar',
      date: '2026-01-12T23:18:00.000Z',
      sex: Sex.MALE,
      independent: IndependentStatus.YES,
      status: ReviewStatus.VALIDATED,
      hasAnimal: true,
    },
    {
      key: 'jaguar-jan-related-male',
      camera: 'CAM-01',
      species: 'Jaguar',
      date: '2026-01-12T23:24:00.000Z',
      sex: Sex.MALE,
      independent: IndependentStatus.NO,
      status: ReviewStatus.VALIDATED,
      hasAnimal: true,
      relatedTo: 'jaguar-jan-independent-male',
    },
    {
      key: 'taitetu-jan',
      camera: 'CAM-02',
      species: 'Taitetú',
      date: '2026-01-20T10:40:00.000Z',
      sex: Sex.UNDETERMINED,
      independent: IndependentStatus.YES,
      status: ReviewStatus.VALIDATED,
      hasAnimal: true,
    },
    {
      key: 'jaguar-feb-independent-female',
      camera: 'CAM-02',
      species: 'Jaguar',
      date: '2026-02-07T02:15:00.000Z',
      sex: Sex.FEMALE,
      independent: IndependentStatus.YES,
      status: ReviewStatus.CORRECTED,
      hasAnimal: true,
    },
    {
      key: 'puma-feb',
      camera: 'CAM-03',
      species: 'Puma',
      date: '2026-02-19T04:55:00.000Z',
      sex: Sex.UNDETERMINED,
      independent: IndependentStatus.YES,
      status: ReviewStatus.VALIDATED,
      hasAnimal: true,
    },
    {
      key: 'jaguar-mar-independent-undetermined',
      camera: 'CAM-03',
      species: 'Jaguar',
      date: '2026-03-04T21:05:00.000Z',
      sex: Sex.UNDETERMINED,
      independent: IndependentStatus.YES,
      status: ReviewStatus.VALIDATED,
      hasAnimal: true,
    },
    {
      key: 'jaguar-mar-corrected-male',
      camera: 'CAM-01',
      species: 'Jaguar',
      date: '2026-03-18T19:32:00.000Z',
      sex: Sex.MALE,
      independent: IndependentStatus.UNDETERMINED,
      status: ReviewStatus.CORRECTED,
      hasAnimal: true,
    },
    {
      key: 'jaguar-apr-female',
      camera: 'CAM-02',
      species: 'Jaguar',
      date: '2026-04-10T01:44:00.000Z',
      sex: Sex.FEMALE,
      independent: IndependentStatus.NO,
      status: ReviewStatus.VALIDATED,
      hasAnimal: true,
    },
    {
      key: 'false-positive',
      camera: 'CAM-03',
      species: null,
      date: '2026-04-14T12:00:00.000Z',
      sex: Sex.UNDETERMINED,
      independent: IndependentStatus.UNDETERMINED,
      status: ReviewStatus.DISCARDED,
      hasAnimal: false,
    },
    {
      key: 'doubtful-jaguar',
      camera: 'CAM-01',
      species: 'Jaguar',
      date: '2026-04-22T05:35:00.000Z',
      sex: Sex.UNDETERMINED,
      independent: IndependentStatus.UNDETERMINED,
      status: ReviewStatus.DOUBTFUL,
      hasAnimal: true,
    },
  ];

  const created = new Map<string, { id: string }>();
  for (const row of rows) {
    const detectedAt = new Date(row.date);
    const mediaFile = await prisma.mediaFile.create({
      data: {
        projectId,
        cameraId: cameras[row.camera].id,
        uploadedById: investigatorId,
        fileName: `${row.key}.jpg`,
        originalName: `${row.key}.jpg`,
        fileType: MediaFileType.IMAGE,
        mimeType: 'image/jpeg',
        filePath: `uploads/demo/${row.key}.jpg`,
        recordingDate: detectedAt,
        processingStatus:
          row.status === ReviewStatus.DISCARDED
            ? ProcessingStatus.PROCESSED
            : ProcessingStatus.PENDING_REVIEW,
      },
    });

    const species = row.species ? speciesByName.get(row.species) : null;
    const detection = await prisma.detection.create({
      data: {
        projectId,
        cameraId: cameras[row.camera].id,
        mediaFileId: mediaFile.id,
        validatedSpeciesId: species?.id,
        aiSpecies: row.species ?? 'Sin animal',
        aiConfidence: row.species ? '0.9100' : '0.3200',
        detectedAt,
        month: detectedAt.getUTCMonth() + 1,
        hour: detectedAt.getUTCHours(),
        reviewStatus: row.status,
        hasAnimal: row.hasAnimal,
        reviewerId: investigatorId,
        sex: row.sex,
        isIndependent: row.independent,
        independentStatus: row.independent,
        relatedDetectionId: row.relatedTo
          ? created.get(row.relatedTo)?.id
          : undefined,
        validatedAt:
          row.status === ReviewStatus.VALIDATED ||
          row.status === ReviewStatus.CORRECTED
            ? new Date('2026-05-30T15:00:00.000Z')
            : undefined,
        notes: `DEMO-SEED: ${row.key}`,
      },
    });
    created.set(row.key, detection);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
