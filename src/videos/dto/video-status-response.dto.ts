import { ApiProperty } from '@nestjs/swagger';
import { VideoDto } from './video-response.dto';
import { VideoDisplayOptionsDto } from './video-display-options.dto';
import { VideoEmbedOptionsDto } from './video-embed-options.dto';
import { Type } from 'class-transformer';

export class VideoPlaybackDto {
  @ApiProperty({ description: 'HLS playback URL' })
  hls: string;

  @ApiProperty({ description: 'DASH playback URL' })
  dash: string;
}

export class VideoMetaDto {
  @ApiProperty({ description: 'Video name' })
  name: string;

  @ApiProperty({ 
    description: 'Display options for the video player',
    type: () => VideoDisplayOptionsDto,
    required: false
  })
  @Type(() => VideoDisplayOptionsDto)
  displayOptions?: VideoDisplayOptionsDto;

  @ApiProperty({ 
    description: 'Embed options for the video',
    type: () => VideoEmbedOptionsDto,
    required: false
  })
  @Type(() => VideoEmbedOptionsDto)
  embedOptions?: VideoEmbedOptionsDto;
}

export class VideoStatusDto {
  @ApiProperty({ description: 'Current state of the video (processing, ready, error, etc)' })
  state: string;
}

export class VideoDetailsDto {
  @ApiProperty({ description: 'Video unique identifier' })
  uid: string;

  @ApiProperty({ description: 'Whether the video is ready to stream' })
  readyToStream: boolean;

  @ApiProperty({ description: 'Video status details', type: VideoStatusDto })
  status: VideoStatusDto;

  @ApiProperty({ description: 'Video thumbnail URL' })
  thumbnail: string;

  @ApiProperty({ description: 'Video preview URL' })
  preview: string;

  @ApiProperty({ description: 'Video playback URLs', type: VideoPlaybackDto })
  playback: VideoPlaybackDto;

  @ApiProperty({ description: 'Video metadata', type: VideoMetaDto })
  meta: VideoMetaDto;

  @ApiProperty({ description: 'Video duration in seconds' })
  duration: number;
}

export class VideoStatusResponseDto {
  @ApiProperty({ description: 'Whether the operation was successful' })
  success: boolean;

  @ApiProperty({ description: 'Video details', type: VideoDetailsDto })
  video: VideoDetailsDto;
} 