import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IndependentStatus, ReviewStatus, Sex } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class ValidateDetectionDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  hasAnimal: boolean;

  @ApiPropertyOptional({ example: 'species-id-jaguar' })
  @ValidateIf((dto: ValidateDetectionDto) => !dto.validatedSpeciesName)
  @IsOptional()
  @IsString()
  validatedSpeciesId?: string;

  @ApiPropertyOptional({ example: 'Jaguar' })
  @ValidateIf((dto: ValidateDetectionDto) => !dto.validatedSpeciesId)
  @IsOptional()
  @IsString()
  validatedSpeciesName?: string;

  @ApiProperty({ enum: Sex, example: Sex.MALE })
  @IsEnum(Sex)
  sex: Sex;

  @ApiProperty({ enum: IndependentStatus, example: IndependentStatus.YES })
  @IsEnum(IndependentStatus)
  isIndependent: IndependentStatus;

  @ApiPropertyOptional({ example: 'related-detection-id' })
  @IsOptional()
  @IsString()
  relatedDetectionId?: string;

  @ApiProperty({ enum: ReviewStatus, example: ReviewStatus.VALIDATED })
  @IsEnum(ReviewStatus)
  reviewStatus: ReviewStatus;

  @ApiPropertyOptional({
    example: 'Jaguar macho visible, evento independiente.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
