import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [JobsModule],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
