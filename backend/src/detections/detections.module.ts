import { Module } from '@nestjs/common';
import { ValidationsModule } from '../validations/validations.module';
import { DetectionsController } from './detections.controller';
import { DetectionsService } from './detections.service';

@Module({
  imports: [ValidationsModule],
  controllers: [DetectionsController],
  providers: [DetectionsService],
  exports: [DetectionsService],
})
export class DetectionsModule {}
