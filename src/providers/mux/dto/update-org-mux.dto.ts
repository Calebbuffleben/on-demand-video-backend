import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO for updating MUX credentials for an organization
 */
export class UpdateOrgMuxDto {
  @ApiProperty({
    description: 'MUX Token ID',
    example: 'your-mux-token-id',
  })
  @IsString()
  @IsNotEmpty()
  muxTokenId: string;

  @ApiProperty({
    description: 'MUX Token Secret',
    example: 'your-mux-token-secret',
  })
  @IsString()
  @IsNotEmpty()
  muxTokenSecret: string;
}

/**
 * DTO for MUX settings response
 */
export class MuxSettingsResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'MUX Token ID (masked)',
    example: 'ab***cd',
  })
  muxTokenId: string;

  @ApiProperty({
    description: 'MUX Token Secret (masked)',
    example: 'xy***z',
  })
  muxTokenSecret: string;
} 