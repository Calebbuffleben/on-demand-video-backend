import { ApiProperty } from '@nestjs/swagger';

export class GetUploadUrlResponseDto {
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
      success: { type: 'boolean' },
      uploadURL: { type: 'string' },
      uid: { type: 'string' },
    },
  })
  data: {
    success: boolean;
    uploadURL: string;
    uid: string;
  };
} 