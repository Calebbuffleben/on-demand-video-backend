import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PlatformStats, RecentUpload, PopularVideo, DeviceBreakdown, BrowserBreakdown, LocationBreakdown, OSBreakdown, ConnectionBreakdown, ViewerAnalytics } from '../interfaces/analytics.interfaces';

export class GetVideosLimitDto {
  @ApiProperty({
    description: 'Maximum number of videos to return',
    example: 5,
    required: false,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Max(50)
  limit?: number = 5;
}

export class PlatformStatsDto implements PlatformStats {
  @ApiProperty({
    description: 'Total number of videos',
    example: 156,
  })
  totalVideos: number;

  @ApiProperty({
    description: 'Total views across all videos',
    example: 1247,
  })
  totalViews: number;

  @ApiProperty({
    description: 'Total storage used in human readable format',
    example: '2.4 GB',
  })
  totalStorage: string;

  @ApiProperty({
    description: 'Total bandwidth used in human readable format',
    example: '15.7 GB',
  })
  totalBandwidth: string;
}

export class RecentUploadDto implements RecentUpload {
  @ApiProperty({
    description: 'Video ID',
    example: 'abc123',
  })
  id: string;

  @ApiProperty({
    description: 'Video title',
    example: 'My Awesome Video',
  })
  title: string;

  @ApiProperty({
    description: 'Thumbnail URL',
    example: 'https://image.mux.com/abc123/thumbnail.jpg',
  })
  thumbnailUrl: string;

  @ApiProperty({
    description: 'Upload date',
    example: '2023-12-01',
  })
  uploadDate: string;

  @ApiProperty({
    description: 'File size in human readable format',
    example: '24.5 MB',
  })
  size: string;

  @ApiProperty({
    description: 'Video duration in MM:SS format',
    example: '05:32',
  })
  duration: string;
}

export class PopularVideoDto implements PopularVideo {
  @ApiProperty({
    description: 'Video ID',
    example: 'abc123',
  })
  id: string;

  @ApiProperty({
    description: 'Video title',
    example: 'Popular Video Title',
  })
  title: string;

  @ApiProperty({
    description: 'Thumbnail URL',
    example: 'https://image.mux.com/abc123/thumbnail.jpg',
  })
  thumbnailUrl: string;

  @ApiProperty({
    description: 'Number of views',
    example: 1523,
  })
  views: number;

  @ApiProperty({
    description: 'Video duration in MM:SS format',
    example: '10:45',
  })
  duration: string;
}

export class DeviceBreakdownDto implements DeviceBreakdown {
  @ApiProperty({
    description: 'Device name',
    example: 'iPhone 12',
  })
  device: string;

  @ApiProperty({
    description: 'Device category',
    example: 'phone',
  })
  category: string;

  @ApiProperty({
    description: 'Device manufacturer',
    example: 'Apple',
  })
  manufacturer: string;

  @ApiProperty({
    description: 'Number of views from this device',
    example: 245,
  })
  views: number;

  @ApiProperty({
    description: 'Percentage of total views',
    example: 23.5,
  })
  percentage: number;
}

export class BrowserBreakdownDto implements BrowserBreakdown {
  @ApiProperty({
    description: 'Browser name',
    example: 'Chrome',
  })
  browser: string;

  @ApiProperty({
    description: 'Browser version',
    example: '91.0.4472.124',
  })
  version: string;

  @ApiProperty({
    description: 'Number of views from this browser',
    example: 356,
  })
  views: number;

  @ApiProperty({
    description: 'Percentage of total views',
    example: 34.2,
  })
  percentage: number;
}

export class LocationBreakdownDto implements LocationBreakdown {
  @ApiProperty({
    description: 'Country name',
    example: 'United States',
  })
  country: string;

  @ApiProperty({
    description: 'Country code',
    example: 'US',
  })
  countryCode: string;

  @ApiProperty({
    description: 'State or region',
    example: 'California',
    required: false,
  })
  region?: string;

  @ApiProperty({
    description: 'City name',
    example: 'San Francisco',
    required: false,
  })
  city?: string;

  @ApiProperty({
    description: 'Number of views from this location',
    example: 127,
  })
  views: number;

  @ApiProperty({
    description: 'Percentage of total views',
    example: 12.2,
  })
  percentage: number;
}

export class OSBreakdownDto implements OSBreakdown {
  @ApiProperty({
    description: 'Operating system name',
    example: 'iOS',
  })
  os: string;

  @ApiProperty({
    description: 'OS version',
    example: '14.6',
  })
  version: string;

  @ApiProperty({
    description: 'Number of views from this OS',
    example: 198,
  })
  views: number;

  @ApiProperty({
    description: 'Percentage of total views',
    example: 19.0,
  })
  percentage: number;
}

export class ConnectionBreakdownDto implements ConnectionBreakdown {
  @ApiProperty({
    description: 'Connection type',
    example: 'wifi',
  })
  connectionType: string;

  @ApiProperty({
    description: 'Number of views from this connection type',
    example: 423,
  })
  views: number;

  @ApiProperty({
    description: 'Percentage of total views',
    example: 40.6,
  })
  percentage: number;
}

export class ViewerAnalyticsDto implements ViewerAnalytics {
  @ApiProperty({
    description: 'Device breakdown analytics',
    type: [DeviceBreakdownDto],
  })
  devices: DeviceBreakdownDto[];

  @ApiProperty({
    description: 'Browser breakdown analytics',
    type: [BrowserBreakdownDto],
  })
  browsers: BrowserBreakdownDto[];

  @ApiProperty({
    description: 'Location breakdown analytics',
    type: [LocationBreakdownDto],
  })
  locations: LocationBreakdownDto[];

  @ApiProperty({
    description: 'Operating system breakdown analytics',
    type: [OSBreakdownDto],
  })
  operatingSystems: OSBreakdownDto[];

  @ApiProperty({
    description: 'Connection type breakdown analytics',
    type: [ConnectionBreakdownDto],
  })
  connections: ConnectionBreakdownDto[];

  @ApiProperty({
    description: 'Total number of views',
    example: 1042,
  })
  totalViews: number;
}

export class DashboardResponseDto {
  @ApiProperty({ type: PlatformStatsDto })
  platformStats: PlatformStatsDto;

  @ApiProperty({ type: [RecentUploadDto] })
  recentUploads: RecentUploadDto[];

  @ApiProperty({ type: [PopularVideoDto] })
  popularVideos: PopularVideoDto[];
}

export class PlatformStatsResponseDto {
  @ApiProperty({ type: PlatformStatsDto })
  data: PlatformStatsDto;
}

export class RecentUploadsResponseDto {
  @ApiProperty({ type: [RecentUploadDto] })
  data: RecentUploadDto[];
}

export class PopularVideosResponseDto {
  @ApiProperty({ type: [PopularVideoDto] })
  data: PopularVideoDto[];
} 