import { Module } from '@nestjs/common';
import { MuxService } from './mux.service';
import { MuxController } from './mux.controller';
import { MuxWebhookController } from './mux-webhook.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MuxController, MuxWebhookController],
  providers: [MuxService, MuxWebhookController],
  exports: [MuxService, MuxWebhookController],
})
export class MuxModule {} 