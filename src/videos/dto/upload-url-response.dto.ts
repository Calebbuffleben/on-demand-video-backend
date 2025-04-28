import { ApiProperty } from '@nestjs/swagger';

export class UploadUrlResponseDto {
  @ApiProperty({ description: 'One-time upload URL from Cloudflare Stream' })
  uploadURL: string;

  @ApiProperty({ description: 'Unique identifier for the video' })
  uid: string;
}

export class GetUploadUrlResponseDto {
  @ApiProperty({ description: 'Whether the operation was successful' })
  success: boolean;

  @ApiProperty({ description: 'HTTP status code' })
  status: number;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Response data', type: UploadUrlResponseDto })
  data: UploadUrlResponseDto;
} 