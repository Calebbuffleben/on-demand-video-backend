import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PlatformStats, RecentUpload, PopularVideo } from '../interfaces/analytics.interfaces';

export class QueryLimitDto {
  @ApiProperty({
    description: 'Number of items to return',
    required: false,
    default: 5,
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Max(100)
  limit?: number = 5;
}

export class PlatformStatsDto implements PlatformStats {
  @ApiProperty({
    description: 'Total number of videos',
    example: 125,
  })
  totalVideos: number;

  @ApiProperty({
    description: 'Total views across all videos',
    example: 5437,
  })
  totalViews: number;

  @ApiProperty({
    description: 'Formatted storage used',
    example: '2.4 GB',
  })
  totalStorage: string;

  @ApiProperty({
    description: 'Formatted bandwidth used',
    example: '5.7 GB',
  })
  totalBandwidth: string;
}

export class RecentUploadDto implements RecentUpload {
  @ApiProperty({
    description: 'Video ID (Cloudflare UID)',
    example: 'a1b2c3d4e5f6',
  })
  id: string;

  @ApiProperty({
    description: 'Video title',
    example: 'Introduction to NestJS',
  })
  title: string;

  @ApiProperty({
    description: 'Thumbnail URL from Cloudflare',
    example: 'https://cloudflarestream.com/a1b2c3d4e5f6/thumbnails/thumbnail.jpg',
  })
  thumbnailUrl: string;

  @ApiProperty({
    description: 'Formatted upload date',
    example: 'Jul 15, 2023',
  })
  uploadDate: string;

  @ApiProperty({
    description: 'Formatted video size',
    example: '256 MB',
  })
  size: string;

  @ApiProperty({
    description: 'Formatted duration (MM:SS)',
    example: '12:34',
  })
  duration: string;
}

export class PopularVideoDto implements PopularVideo {
  @ApiProperty({
    description: 'Video ID (Cloudflare UID)',
    example: 'a1b2c3d4e5f6',
  })
  id: string;

  @ApiProperty({
    description: 'Video title',
    example: 'Advanced TypeScript Tips',
  })
  title: string;

  @ApiProperty({
    description: 'Thumbnail URL from Cloudflare',
    example: 'https://cloudflarestream.com/a1b2c3d4e5f6/thumbnails/thumbnail.jpg',
  })
  thumbnailUrl: string;

  @ApiProperty({
    description: 'View count',
    example: 1245,
  })
  views: number;

  @ApiProperty({
    description: 'Formatted duration (MM:SS)',
    example: '05:27',
  })
  duration: string;
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