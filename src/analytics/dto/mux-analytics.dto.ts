import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsISO8601, IsInt, Min, Max, ValidateIf, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class GetMuxAnalyticsDto {
  @ApiProperty({ 
    description: 'Start date for analytics data (ISO 8601 format)', 
    required: false,
    example: '2024-01-01T00:00:00Z'
  })
  @IsOptional()
  @IsISO8601()
  @Type(() => String)
  startDate?: string;

  @ApiProperty({ 
    description: 'End date for analytics data (ISO 8601 format)', 
    required: false,
    example: '2024-12-31T23:59:59Z'
  })
  @IsOptional()
  @IsISO8601()
  @Type(() => String)
  endDate?: string;

  @ApiProperty({
    description: 'Start time of day in 24-hour format (HH:mm)',
    required: false,
    example: '09:00'
  })
  @IsOptional()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTimeOfDay must be in HH:mm format (24-hour)'
  })
  startTimeOfDay?: string;

  @ApiProperty({
    description: 'End time of day in 24-hour format (HH:mm)',
    required: false,
    example: '17:00'
  })
  @IsOptional()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTimeOfDay must be in HH:mm format (24-hour)'
  })
  endTimeOfDay?: string;

  @ApiProperty({
    description: 'Time zone for the time range (IANA timezone)',
    required: false,
    example: 'America/New_York'
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({
    description: 'Granularity of the data in minutes',
    required: false,
    example: 5
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  @Type(() => Number)
  granularity?: number;
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
  @ApiProperty({ description: 'Time in seconds from video start' })
  time: number;

  @ApiProperty({ description: 'Percentage of viewers retained' })
  retention: number;
}

export class MuxAnalyticsResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data: {
    totalViews: number;
    averageWatchTime: number;
    engagementRate: number;
    uniqueViewers: number;
    viewsOverTime: Array<{
      date: string;
      views: number;
    }>;
    retentionData: Array<{
      time: number;
      retention: number;
    }>;
    viewerTimeline: Array<{
      timestamp: string;
      duration: number;
      percentage: number;
    }>;
  };
} 