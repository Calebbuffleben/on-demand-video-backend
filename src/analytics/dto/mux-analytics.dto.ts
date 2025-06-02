import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString } from 'class-validator';

export class GetMuxAnalyticsDto {
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

export class ViewerTimelineDto {
  @ApiProperty({ description: 'Timestamp of the view event' })
  timestamp: string;

  @ApiProperty({ description: 'Duration of the view in seconds' })
  duration: number;

  @ApiProperty({ description: 'Percentage of video watched' })
  percentage: number;
}

export class RetentionDataPointDto {
  @ApiProperty({ description: 'Timestamp in seconds from video start' })
  timestamp: number;

  @ApiProperty({ description: 'Number of viewers at this timestamp' })
  viewers: number;

  @ApiProperty({ description: 'Percentage of viewers retained' })
  percentage: number;
}

export class MuxAnalyticsResponseDto {
  @ApiProperty({ description: 'Total number of views' })
  totalViews: number;

  @ApiProperty({ description: 'Total watch time in seconds' })
  totalWatchTime: number;

  @ApiProperty({ description: 'Average watch time in seconds' })
  averageWatchTime: number;

  @ApiProperty({ description: 'Retention data points' })
  retention: RetentionDataPointDto[];

  @ApiProperty({ description: 'Individual viewer timelines' })
  viewerTimelines: ViewerTimelineDto[];
} 