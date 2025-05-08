import { ApiProperty } from '@nestjs/swagger';

export class EmbedVideoDto {
  @ApiProperty({ description: 'Unique identifier of the video' })
  uid: string;

  @ApiProperty({ description: 'Thumbnail URL', required: false, nullable: true })
  thumbnail: string | null;

  @ApiProperty({ description: 'Preview URL', required: false, nullable: true })
  preview: string | null;

  @ApiProperty({ description: 'Whether the video is ready to stream' })
  readyToStream: boolean;

  @ApiProperty({ description: 'Video status information' })
  status: {
    state: string;
  };

  @ApiProperty({ description: 'Video metadata', required: false })
  meta: { 
    name: string;
    [key: string]: any;
  };

  @ApiProperty({ description: 'Video duration in seconds', required: false, nullable: true })
  duration: number | null;

  @ApiProperty({ description: 'Playback URLs for different streaming formats' })
  playback: {
    hls: string | null;
    dash: string | null;
  };
}

export class EmbedVideoResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Video information' })
  result: EmbedVideoDto;
} 