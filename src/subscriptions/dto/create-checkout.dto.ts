import { IsString, IsEnum, IsUrl } from 'class-validator';

export class CreateCheckoutDto {
  @IsString()
  @IsEnum(['BASIC', 'PRO', 'ENTERPRISE'])
  planType: string;

  @IsString()
  @IsUrl()
  successUrl: string;

  @IsString()
  @IsUrl()
  cancelUrl: string;
} 