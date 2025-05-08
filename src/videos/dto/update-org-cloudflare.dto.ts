import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

/**
 * DTO for updating Cloudflare credentials for an organization
 */
export class UpdateOrgCloudflareDto {
  @ApiProperty({
    description: 'Cloudflare Account ID',
    example: '1a2b3c4d5e6f7g8h9i0j',
  })
  @IsString()
  @IsNotEmpty()
  cloudflareAccountId: string;

  @ApiProperty({
    description: 'Cloudflare API Token with Stream permissions',
    example: 'api-token-from-cloudflare',
  })
  @IsString()
  @IsNotEmpty()
  cloudflareApiToken: string;
}

export class CloudflareSettingsResponseDto {
  @ApiProperty({
    description: 'Whether the operation was successful',
    example: true,
  })
  @IsBoolean()
  success: boolean;

  @ApiProperty({
    description: 'Cloudflare Account ID (masked for security)',
    example: '1a2b****9i0j',
    required: false,
  })
  @IsString()
  @IsOptional()
  cloudflareAccountId?: string;

  @ApiProperty({
    description: 'Cloudflare API Token (masked for security)',
    example: 'api-****-token',
    required: false,
  })
  @IsString()
  @IsOptional()
  cloudflareApiToken?: string;
} 