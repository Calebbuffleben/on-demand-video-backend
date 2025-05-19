import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class VideoEmbedOptionsDto {
  @ApiProperty({ description: 'Whether to show the video title on embed page', default: true })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  showVideoTitle?: boolean = true;

  @ApiProperty({ description: 'Whether to show upload date', default: true })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  showUploadDate?: boolean = true;

  @ApiProperty({ description: 'Whether to show video metadata', default: true })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  showMetadata?: boolean = true;

  @ApiProperty({ description: 'Whether to allow fullscreen mode', default: true })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  allowFullscreen?: boolean = true;

  @ApiProperty({ description: 'Whether the embed should be responsive', default: true })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  responsive?: boolean = true;

  @ApiProperty({ description: 'Whether to show branding', default: true })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  showBranding?: boolean = true;

  @ApiProperty({ description: 'Whether to show technical information', default: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  showTechnicalInfo?: boolean = false;
} 