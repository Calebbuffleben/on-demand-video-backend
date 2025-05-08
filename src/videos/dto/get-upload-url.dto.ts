import { IsNumber, IsOptional, Max, Min, IsString, IsBoolean } from 'class-validator';
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

  @ApiProperty({
    description: 'Name of the video',
    required: false,
    example: 'My Video',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Description of the video',
    required: false,
    example: 'This is a description of my video',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Whether the video requires signed URLs for playback',
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  requireSignedURLs?: boolean;

  @ApiProperty({
    description: 'Organization ID that the video belongs to (will be set from authenticated user)',
    required: false,
  })
  @IsString()
  @IsOptional()
  organizationId?: string;
} 