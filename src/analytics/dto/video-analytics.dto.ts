import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetVideoAnalyticsDto {
  @ApiProperty({ description: 'The ID of the video to get analytics for' })
  @IsString()
  videoId: string;

  @ApiProperty({ description: 'Start date for analytics data', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'End date for analytics data', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class VideoAnalyticsResponseDto {
  @ApiProperty({ description: 'Total number of views' })
  views: number;

  @ApiProperty({ description: 'Total watch time in seconds' })
  watchTime: number;

  @ApiProperty({ description: 'Retention data points' })
  retention: {
    timestamp: number;
    viewers: number;
    percentage: number;
  }[];
} 