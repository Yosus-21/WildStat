import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  MEDIA_PROCESSING_QUEUE,
  MediaProcessingJob,
} from './media-processing.types';

@Injectable()
export class JobsService {
  constructor(
    @InjectQueue(MEDIA_PROCESSING_QUEUE)
    private readonly mediaProcessingQueue: Queue<MediaProcessingJob>,
  ) {}

  async enqueueMediaProcessing(data: MediaProcessingJob) {
    return this.mediaProcessingQueue.add('process-media', data, {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }
}
