import { ApiProperty } from '@nestjs/swagger';
import { VideoDisplayOptionsDto } from './video-display-options.dto';
import { VideoEmbedOptionsDto } from './video-embed-options.dto';
import { Type } from 'class-transformer';

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

  @ApiProperty({ 
    description: 'Display options for the video player', 
    required: false,
    type: () => VideoDisplayOptionsDto 
  })
  @Type(() => VideoDisplayOptionsDto)
  displayOptions?: VideoDisplayOptionsDto;

  @ApiProperty({ 
    description: 'Embed options for the video', 
    required: false,
    type: () => VideoEmbedOptionsDto 
  })
  @Type(() => VideoEmbedOptionsDto)
  embedOptions?: VideoEmbedOptionsDto;
}

export class VideoInputDto {
  @ApiProperty({ description: 'Input width', required: false })
  width?: number;

  @ApiProperty({ description: 'Input height', required: false })
  height?: number;
}

export class VideoDto {
  @ApiProperty({ description: 'Video UID' })
  uid: string;

  @ApiProperty({ description: 'Video thumbnail URL' })
  thumbnail: string;

  @ApiProperty({ description: 'Whether the video is ready to stream' })
  readyToStream: boolean;

  @ApiProperty({ description: 'Video status' })
  status: {
    state: string;
  };

  @ApiProperty({ description: 'Video metadata' })
  meta: {
    name: string;
    displayOptions?: VideoDisplayOptionsDto;
    embedOptions?: VideoEmbedOptionsDto;
  };

  @ApiProperty({ description: 'Creation timestamp' })
  created: string;

  @ApiProperty({ description: 'Last modification timestamp' })
  modified: string;

  @ApiProperty({ description: 'Video duration in seconds' })
  duration: number;

  @ApiProperty({ description: 'Video size in bytes' })
  size: number;

  @ApiProperty({ description: 'Video preview URL' })
  preview: string;

  @ApiProperty({ description: 'Video playback URLs' })
  playback: {
    hls: string;
    dash: string;
  };
}

export class ResultInfoDto {
  @ApiProperty({ description: 'Total number of results' })
  total_count: number;

  @ApiProperty({ description: 'Number of results per page' })
  per_page: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of results in the current page' })
  count: number;
}

export class VideoListResponseDto {
  @ApiProperty({ description: 'Whether the operation was successful' })
  success: boolean;

  @ApiProperty({ description: 'HTTP status code' })
  status: number;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({
    description: 'Response data',
    type: 'object',
    properties: {
      result: { type: 'array', items: { $ref: '#/components/schemas/VideoDto' } },
      result_info: {
        type: 'object',
        properties: {
          count: { type: 'number' },
          page: { type: 'number' },
          per_page: { type: 'number' },
          total_count: { type: 'number' },
        },
      },
    },
  })
  data: {
    result: VideoDto[];
    result_info: {
      count: number;
      page: number;
      per_page: number;
      total_count: number;
    };
  };
}

export class SingleVideoResponseDto {
  @ApiProperty({ description: 'Whether the operation was successful' })
  success: boolean;

  @ApiProperty({ description: 'HTTP status code' })
  status: number;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Response data containing the video' })
  data: {
    result: VideoDto;
  };
} 