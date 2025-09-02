import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class TranscodeFailureDto {
  @ApiProperty()
  @IsString()
  videoId: string;

  @ApiProperty({ description: 'Organization ID owner of the video' })
  @IsString()
  organizationId: string;

  @ApiProperty({ description: 'Base asset key/path in R2 (e.g., org/{orgId}/video/{videoId})' })
  @IsString()
  assetKey: string;

  @ApiProperty({ description: 'Error description from worker' })
  @IsString()
  error: string;

  @ApiProperty({ description: 'ISO timestamp of when the failure occurred' })
  @IsString()
  timestamp: string;

  @ApiProperty({ required: false, description: 'Queue job id for traceability' })
  @IsOptional()
  @IsString()
  jobId?: string;
}
