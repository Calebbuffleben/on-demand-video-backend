import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, IsArray, ValidateNested, IsNumber, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class MultipartInitDto {
  @ApiProperty()
  @IsString()
  organizationId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  contentType?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Estimated file size in bytes (required)', example: 2000000000 })
  @IsNumber()
  @IsNotEmpty()
  expectedSizeBytes: number;

  @ApiProperty({ description: 'Max expected duration (seconds) for minutes projection', required: false, default: 3600 })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxDurationSeconds?: number;
}

export class MultipartPartUrlDto {
  @ApiProperty()
  @IsString()
  key: string;

  @ApiProperty()
  @IsString()
  uploadId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  partNumber: number;
}

export class CompletedPartDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  partNumber: number;

  @ApiProperty()
  @IsString()
  eTag: string;
}

export class MultipartCompleteDto {
  @ApiProperty()
  @IsString()
  key: string;

  @ApiProperty()
  @IsString()
  uploadId: string;

  @ApiProperty({ type: [CompletedPartDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompletedPartDto)
  parts: CompletedPartDto[];

  @ApiProperty()
  @IsString()
  videoId: string;

  @ApiProperty()
  @IsString()
  organizationId: string;
}

export class MultipartAbortDto {
  @ApiProperty()
  @IsString()
  key: string;

  @ApiProperty()
  @IsString()
  uploadId: string;
}


