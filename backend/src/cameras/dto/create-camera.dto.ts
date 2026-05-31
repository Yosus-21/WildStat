import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCameraDto {
  @ApiProperty({ example: 'clx_project_id' })
  @IsString()
  projectId: string;

  @ApiProperty({ example: 'CAM-001' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ example: 'ST-001' })
  @IsOptional()
  @IsString()
  stationCode?: string;

  @ApiPropertyOptional({ example: 'Zona Norte' })
  @IsOptional()
  @IsString()
  zone?: string;

  @ApiPropertyOptional({ example: -17.7833 })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: -63.1821 })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({ example: 'Bosque seco chaqueño' })
  @IsOptional()
  @IsString()
  habitatType?: string;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  installDate?: Date;

  @ApiPropertyOptional({ example: '2026-12-31T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  removalDate?: Date;

  @ApiPropertyOptional({ example: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'Camara instalada cerca de sendero.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
