import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AiClientModule } from '../ai-client/ai-client.module';
import { DetectionsModule } from '../detections/detections.module';
import { JobsService } from './jobs.service';
import { MediaProcessingProcessor } from './media-processing.processor';
import { MEDIA_PROCESSING_QUEUE } from './media-processing.types';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: Number(configService.get<string>('REDIS_PORT', '6379')),
        },
      }),
    }),
    BullModule.registerQueue({
      name: MEDIA_PROCESSING_QUEUE,
    }),
    AiClientModule,
    DetectionsModule,
  ],
  providers: [JobsService, MediaProcessingProcessor],
  exports: [JobsService],
})
export class JobsModule {}
