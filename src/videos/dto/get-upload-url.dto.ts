import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetUploadUrlDto {
  @ApiProperty({
    description: 'Maximum duration of the video in seconds',
    default: 3600,
    required: false,
    minimum: 1,
    maximum: 21600,
  })
  @IsNumber()
  @IsOptional()
  @Max(21600) // 6 hours max
  @Min(1)
  maxDurationSeconds: number = 3600;
} 