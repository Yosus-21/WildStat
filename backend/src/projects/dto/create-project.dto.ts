import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PrivacyStatus, ProjectStatus } from '@prisma/client';

export class CreateProjectDto {
  @ApiProperty({ example: 'Monitoreo Jaguar - Chaco 2026' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'WWF Bolivia' })
  @IsOptional()
  @IsString()
  organization?: string;

  @ApiPropertyOptional({ example: 'Dra. Ana Rivera' })
  @IsOptional()
  @IsString()
  responsible?: string;

  @ApiPropertyOptional({
    example: 'Monitorear presencia de jaguar mediante camaras trampa.',
  })
  @IsOptional()
  @IsString()
  objective?: string;

  @ApiPropertyOptional({ example: 'Paisaje del Gran Chaco' })
  @IsOptional()
  @IsString()
  studyArea?: string;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({ example: '2026-12-31T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({ example: 'Jaguar' })
  @IsOptional()
  @IsString()
  targetSpecies?: string;

  @ApiPropertyOptional({ example: 125.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  samplingAreaKm2?: number;

  @ApiPropertyOptional({ enum: ProjectStatus, example: ProjectStatus.DRAFT })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ enum: PrivacyStatus, example: PrivacyStatus.PRIVATE })
  @IsOptional()
  @IsEnum(PrivacyStatus)
  privacyStatus?: PrivacyStatus;
}
