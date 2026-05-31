import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateSpeciesDto {
  @ApiProperty({ example: 'Jaguar' })
  @IsString()
  commonName: string;

  @ApiPropertyOptional({ example: 'Panthera onca' })
  @IsOptional()
  @IsString()
  scientificName?: string;

  @ApiPropertyOptional({ example: 'Felidae' })
  @IsOptional()
  @IsString()
  family?: string;

  @ApiPropertyOptional({ example: 'Carnivora' })
  @IsOptional()
  @IsString()
  orderName?: string;

  @ApiPropertyOptional({ example: 'Carnivoro' })
  @IsOptional()
  @IsString()
  trophicGuild?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isJaguarPrey?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isTargetSpecies?: boolean;
}
