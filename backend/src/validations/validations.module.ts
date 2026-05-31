import { Module } from '@nestjs/common';
import { ValidationsService } from './validations.service';

@Module({
  providers: [ValidationsService],
  exports: [ValidationsService],
})
export class ValidationsModule {}
