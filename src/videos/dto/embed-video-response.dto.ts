import { ApiProperty } from '@nestjs/swagger';
import { VideoDisplayOptionsDto } from './video-display-options.dto';
import { VideoEmbedOptionsDto } from './video-embed-options.dto';
import { Type } from 'class-transformer';

export class EmbedVideoMetaDto {
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

  @ApiProperty({ description: 'Video metadata', type: () => EmbedVideoMetaDto })
  meta: EmbedVideoMetaDto;

  @ApiProperty({ description: 'Video duration in seconds', required: false, nullable: true })
  duration: number | null;

  @ApiProperty({ description: 'Playback URLs for different streaming formats' })
  playback: {
    hls: string | null;
    dash: string | null;
  };
}

export class EmbedVideoResponseDto {
  @ApiProperty({ description: 'Whether the operation was successful' })
  success: boolean;

  @ApiProperty({ description: 'Video details', type: () => EmbedVideoDto })
  result: EmbedVideoDto;
} 