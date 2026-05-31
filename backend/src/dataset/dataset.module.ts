import { Module } from '@nestjs/common';
import { DatasetController } from './dataset.controller';
import { DatasetService } from './dataset.service';

@Module({
  controllers: [DatasetController],
  providers: [DatasetService],
})
export class DatasetModule {}
