import { IsString, IsNumber, IsOptional, Min, IsEnum } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @IsOptional()
  @IsEnum(['USD', 'EUR', 'GBP', 'JPY'])
  currency?: string = 'USD';
} 