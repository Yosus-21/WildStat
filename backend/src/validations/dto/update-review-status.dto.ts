import { ApiProperty } from '@nestjs/swagger';
import { ReviewStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateReviewStatusDto {
  @ApiProperty({ enum: ReviewStatus, example: ReviewStatus.DOUBTFUL })
  @IsEnum(ReviewStatus)
  reviewStatus: ReviewStatus;
}
