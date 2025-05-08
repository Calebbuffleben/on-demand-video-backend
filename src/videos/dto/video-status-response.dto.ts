import { ApiProperty } from '@nestjs/swagger';
import { VideoDto } from './video-response.dto';

export class VideoPlaybackDto {
  @ApiProperty({ description: 'HLS playback URL' })
  hls: string;

  @ApiProperty({ description: 'DASH playback URL' })
  dash: string;
}

export class VideoMetaDto {
  @ApiProperty({ description: 'Video name' })
  name: string;
}

export class VideoStatusResponseDto {
  @ApiProperty({ description: 'Whether the operation was successful' })
  success: boolean;

  @ApiProperty({ description: 'Whether the video is ready to stream' })
  readyToStream: boolean;

  @ApiProperty({ description: 'Current status of the video' })
  status: string;

  @ApiProperty({ description: 'Video thumbnail URL' })
  thumbnail: string;

  @ApiProperty({ description: 'Video preview URL' })
  preview: string;

  @ApiProperty({ description: 'Video playback URLs', type: VideoPlaybackDto })
  playback: VideoPlaybackDto;

  @ApiProperty({ description: 'Video metadata', type: VideoMetaDto })
  meta: VideoMetaDto;

  @ApiProperty({ description: 'Video unique identifier' })
  uid: string;

  @ApiProperty({ description: 'Video duration in seconds' })
  duration: number;
} 