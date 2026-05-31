import { Module } from '@nestjs/common';
import { AiClientController } from './ai-client.controller';
import { AiClientService } from './ai-client.service';

@Module({
  controllers: [AiClientController],
  providers: [AiClientService],
  exports: [AiClientService],
})
export class AiClientModule {}
