import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class VideoDisplayOptionsDto {
  @ApiProperty({ description: 'Whether to show the video progress bar', default: true })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  showProgressBar?: boolean = true;

  @ApiProperty({ description: 'Whether to show the video title', default: true })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  showTitle?: boolean = true;

  @ApiProperty({ description: 'Whether to show playback controls', default: true })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  showPlaybackControls?: boolean = true;

  @ApiProperty({ description: 'Whether to autoplay the video', default: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  autoPlay?: boolean = false;

  @ApiProperty({ description: 'Whether to mute the video', default: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  muted?: boolean = false;

  @ApiProperty({ description: 'Whether to loop the video', default: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  loop?: boolean = false;
} 