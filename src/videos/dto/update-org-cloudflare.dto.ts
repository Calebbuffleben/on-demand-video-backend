import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

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
    description: 'Whether the organization has Cloudflare credentials configured',
    example: true,
  })
  hasCredentials: boolean;

  @ApiProperty({
    description: 'Cloudflare Account ID (masked for security)',
    example: '1a2b****9i0j',
    required: false,
  })
  @IsOptional()
  cloudflareAccountId?: string;
} 