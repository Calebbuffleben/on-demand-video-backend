import { PartialType } from '@nestjs/swagger';
import { CreateVideoDto } from './create-video.dto';
import { IsString, IsOptional, ValidateNested } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { VideoDisplayOptionsDto } from './video-display-options.dto';
import { VideoEmbedOptionsDto } from './video-embed-options.dto';

export class UpdateVideoDto extends PartialType(CreateVideoDto) {
  @ApiPropertyOptional({ 
    description: 'Display options for the video player',
    type: () => VideoDisplayOptionsDto
  })
  @ValidateNested()
  @Type(() => VideoDisplayOptionsDto)
  @IsOptional()
  displayOptions?: VideoDisplayOptionsDto;

  @ApiPropertyOptional({ 
    description: 'Embed options for the video',
    type: () => VideoEmbedOptionsDto
  })
  @ValidateNested()
  @Type(() => VideoEmbedOptionsDto)
  @IsOptional()
  embedOptions?: VideoEmbedOptionsDto;

  @ApiPropertyOptional({ description: 'CTA text to display as a message' })
  @IsString()
  @IsOptional()
  ctaText?: string;

  @ApiPropertyOptional({ description: 'CTA button text' })
  @IsString()
  @IsOptional()
  ctaButtonText?: string;

  @ApiPropertyOptional({ description: 'CTA link URL' })
  @IsString()
  @IsOptional()
  ctaLink?: string;

  @ApiPropertyOptional({ description: 'CTA start time in seconds' })
  @IsOptional()
  ctaStartTime?: number;

  @ApiPropertyOptional({ description: 'CTA end time in seconds' })
  @IsOptional()
  ctaEndTime?: number;
} 