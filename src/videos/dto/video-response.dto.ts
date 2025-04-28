import { ApiProperty } from '@nestjs/swagger';

export class PlaybackDto {
  @ApiProperty({ description: 'HLS manifest URL' })
  hls: string;

  @ApiProperty({ description: 'DASH manifest URL' })
  dash: string;
}

export class VideoStatusDto {
  @ApiProperty({ description: 'Current state of the video' })
  state: string;

  @ApiProperty({ description: 'Percentage of processing complete', required: false })
  pctComplete?: string;

  @ApiProperty({ description: 'Error reason code if any', required: false })
  errorReasonCode?: string;

  @ApiProperty({ description: 'Error reason text if any', required: false })
  errorReasonText?: string;
}

export class VideoMetaDto {
  @ApiProperty({ description: 'Original filename', required: false })
  filename?: string;

  @ApiProperty({ description: 'File type', required: false })
  filetype?: string;

  @ApiProperty({ description: 'Custom name', required: false })
  name?: string;

  @ApiProperty({ description: 'Relative path', required: false })
  relativePath?: string;

  @ApiProperty({ description: 'Content type', required: false })
  type?: string;
}

export class VideoInputDto {
  @ApiProperty({ description: 'Input width', required: false })
  width?: number;

  @ApiProperty({ description: 'Input height', required: false })
  height?: number;
}

export class VideoDto {
  @ApiProperty({ description: 'Unique identifier for the video' })
  uid: string;

  @ApiProperty({ description: 'Thumbnail URL', required: false })
  thumbnail?: string;

  @ApiProperty({ description: 'Preview URL', required: false })
  preview?: string;

  @ApiProperty({ description: 'Whether the video is ready to stream' })
  readyToStream: boolean;

  @ApiProperty({ description: 'When the video became ready to stream', required: false })
  readyToStreamAt?: string;

  @ApiProperty({ description: 'Video status details' })
  status: VideoStatusDto;

  @ApiProperty({ description: 'Video metadata', required: false })
  meta?: VideoMetaDto;

  @ApiProperty({ description: 'Video duration in seconds', required: false })
  duration?: number;

  @ApiProperty({ description: 'When the video was created' })
  created: string;

  @ApiProperty({ description: 'When the video was last modified', required: false })
  modified?: string;

  @ApiProperty({ description: 'Video size in bytes', required: false })
  size?: number;

  @ApiProperty({ description: 'Input video dimensions', required: false })
  input?: VideoInputDto;

  @ApiProperty({ description: 'Playback URLs' })
  playback: PlaybackDto;
}

export class VideoListResponseDto {
  @ApiProperty({ description: 'Whether the operation was successful' })
  success: boolean;

  @ApiProperty({ description: 'HTTP status code' })
  status: number;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Response data', type: Object })
  data: {
    result: VideoDto[];
  };
}

export class SingleVideoResponseDto {
  @ApiProperty({ description: 'Whether the operation was successful' })
  success: boolean;

  @ApiProperty({ description: 'HTTP status code' })
  status: number;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Response data', type: Object })
  data: {
    result: VideoDto;
  };
} 