import { Module } from '@nestjs/common';
import { MuxService } from './mux.service';
import { MuxController } from './mux.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MuxController],
  providers: [MuxService],
  exports: [MuxService],
})
export class MuxModule {} 