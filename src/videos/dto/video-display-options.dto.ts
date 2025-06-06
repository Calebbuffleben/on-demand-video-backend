import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsNumber } from 'class-validator';
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

  @ApiProperty({ description: 'Whether to use the original progress bar style', default: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  useOriginalProgressBar?: boolean = false;

  @ApiProperty({ description: 'Color of the progress bar', default: '#3B82F6' })
  @IsString()
  @IsOptional()
  progressBarColor?: string;

  @ApiProperty({ description: 'Easing value for the progress bar animation', default: 0.25 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  progressEasing?: number;

  @ApiProperty({ description: 'Color of the play button', default: '#FFFFFF' })
  @IsString()
  @IsOptional()
  playButtonColor?: string;

  @ApiProperty({ description: 'Size of the play button in pixels', default: 60 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  playButtonSize?: number;

  @ApiProperty({ description: 'Background color of the play button', default: 'rgba(0,0,0,0.6)' })
  @IsString()
  @IsOptional()
  playButtonBgColor?: string;

  @ApiProperty({ description: 'Text to display on the sound control', default: 'Sound' })
  @IsString()
  @IsOptional()
  soundControlText?: string;

  @ApiProperty({ description: 'Color of the sound control', default: '#FFFFFF' })
  @IsString()
  @IsOptional()
  soundControlColor?: string;

  @ApiProperty({ description: 'Opacity of the sound control', default: 0.8 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  soundControlOpacity?: number;

  @ApiProperty({ description: 'Size of the sound control in pixels', default: 64 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  soundControlSize?: number;

  @ApiProperty({ description: 'Whether to show the sound control button', default: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  showSoundControl?: boolean = false;
} 