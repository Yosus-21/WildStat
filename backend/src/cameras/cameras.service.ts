import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCameraDto } from './dto/create-camera.dto';
import { UpdateCameraDto } from './dto/update-camera.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CamerasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCameraDto) {
    await this.ensureProjectExists(dto.projectId);

    return this.prisma.camera.create({
      data: dto,
      include: this.defaultInclude(),
    });
  }

  findAll(projectId?: string) {
    return this.prisma.camera.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: this.defaultInclude(),
    });
  }

  async findOne(id: string) {
    const camera = await this.prisma.camera.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });

    if (!camera) {
      throw new NotFoundException('Camera not found');
    }

    return camera;
  }

  async update(id: string, dto: UpdateCameraDto) {
    await this.ensureExists(id);

    if (dto.projectId) {
      await this.ensureProjectExists(dto.projectId);
    }

    return this.prisma.camera.update({
      where: { id },
      data: dto,
      include: this.defaultInclude(),
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.camera.delete({ where: { id } });

    return { id, deleted: true };
  }

  private async ensureExists(id: string) {
    const camera = await this.prisma.camera.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!camera) {
      throw new NotFoundException('Camera not found');
    }
  }

  private async ensureProjectExists(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }
  }

  private defaultInclude() {
    return {
      project: {
        select: {
          id: true,
          name: true,
          status: true,
          privacyStatus: true,
        },
      },
      _count: {
        select: {
          mediaFiles: true,
        },
      },
    };
  }
}
