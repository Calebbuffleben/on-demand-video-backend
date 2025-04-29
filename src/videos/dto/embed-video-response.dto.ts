import { ApiProperty } from '@nestjs/swagger';

export class EmbedVideoDto {
  @ApiProperty({ description: 'Unique identifier of the video' })
  uid: string;

  @ApiProperty({ description: 'Thumbnail URL', required: false })
  thumbnail?: string;

  @ApiProperty({ description: 'Preview URL', required: false })
  preview?: string;

  @ApiProperty({ description: 'Whether the video is ready to stream' })
  readyToStream: boolean;

  @ApiProperty({ description: 'Video status information' })
  status: {
    state: string;
  };

  @ApiProperty({ description: 'Video metadata', required: false })
  meta?: { 
    name: string;
    [key: string]: any;
  };

  @ApiProperty({ description: 'Video duration in seconds', required: false })
  duration?: number;

  @ApiProperty({ description: 'Playback URLs for different streaming formats' })
  playback: {
    hls: string;
    dash: string;
  };
}

export class EmbedVideoResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'HTTP status code' })
  status: number;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Response data' })
  data: {
    result: EmbedVideoDto[];
  };
} 