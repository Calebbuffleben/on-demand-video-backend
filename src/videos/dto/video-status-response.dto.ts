import { ApiProperty } from '@nestjs/swagger';
import { VideoDto } from './video-response.dto';

export class VideoStatusResponseDto {
  @ApiProperty({ description: 'Whether the operation was successful' })
  success: boolean;

  @ApiProperty({ description: 'Whether the video is ready to stream' })
  readyToStream: boolean;

  @ApiProperty({ description: 'Current status of the video' })
  status: string;

  @ApiProperty({ description: 'Video details', type: VideoDto })
  video: VideoDto;
} 