import { Injectable } from '@nestjs/common';
import IORedis from 'ioredis';
import { Queue } from 'bullmq';

export type TranscodeJob = {
  videoId: string;
  organizationId: string;
  assetKey: string; // e.g., org/{orgId}/video/{videoId}
  sourcePath: string; // e.g., {assetKey}/uploads/input.mp4
};

@Injectable()
export class TranscodeQueue {
  private queue: Queue<TranscodeJob>;

  constructor() {
    const connection = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
    const queueName = process.env.TRANSCODE_QUEUE_NAME || 'video-transcode';
    this.queue = new Queue<TranscodeJob>(queueName, { connection });
  }

  async enqueue(job: TranscodeJob) {
    return await this.queue.add('TRANSCODE_VIDEO', job, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }

  async getQueueHealth() {
    const waiting = await this.queue.getWaiting();
    const active = await this.queue.getActive();
    const completed = await this.queue.getCompleted();
    const failed = await this.queue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }
}


