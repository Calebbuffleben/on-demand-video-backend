import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Visibility } from '@prisma/client';

export class CreateVideoDto {
  @ApiProperty({ description: 'The name of the video' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'The description of the video' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Tags for categorizing the video', type: [String] })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ 
    description: 'Video visibility setting',
    enum: Visibility,
    default: Visibility.PUBLIC
  })
  @IsEnum(Visibility)
  @IsOptional()
  visibility?: Visibility;

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