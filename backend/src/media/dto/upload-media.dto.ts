import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString } from 'class-validator';

export class UploadMediaDto {
  @ApiProperty({ example: 'cmps_project_id' })
  @IsString()
  projectId: string;

  @ApiProperty({ example: 'cmps_camera_id' })
  @IsString()
  cameraId: string;

  @ApiPropertyOptional({ example: '2026-05-30T12:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  recordingDate?: Date;
}
