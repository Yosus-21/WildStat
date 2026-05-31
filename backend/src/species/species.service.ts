import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpeciesDto } from './dto/create-species.dto';

@Injectable()
export class SpeciesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.species.findMany({
      orderBy: { commonName: 'asc' },
    });
  }

  create(dto: CreateSpeciesDto) {
    return this.prisma.species.create({ data: dto });
  }
}
