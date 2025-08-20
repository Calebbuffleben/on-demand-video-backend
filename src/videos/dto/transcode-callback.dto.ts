import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class TranscodeCallbackDto {
  @ApiProperty()
  @IsString()
  videoId: string;

  @ApiProperty({ description: 'Organization ID owner of the video' })
  @IsString()
  organizationId: string;

  @ApiProperty({ description: 'Base asset key/path in R2 (e.g., org/{orgId}/video/{videoId})' })
  @IsString()
  assetKey: string;

  @ApiProperty({ description: 'Relative HLS master path (e.g., hls/master.m3u8)' })
  @IsString()
  hlsMasterPath: string;

  @ApiProperty({ required: false, description: 'Relative thumbnail path' })
  @IsOptional()
  @IsString()
  thumbnailPath?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @ApiProperty({ required: false, description: 'Queue job id for traceability' })
  @IsOptional()
  @IsString()
  jobId?: string;
}


