import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsInt, IsOptional, IsString, Max, Min, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class EventsTimeRangeDto {
  @ApiProperty({
    description: 'Start date (inclusive) for filtering analytics (ISO 8601 or YYYY-MM-DD)',
    required: false,
    example: '2024-01-01',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({
    description: 'End date (inclusive) for filtering analytics (ISO 8601 or YYYY-MM-DD)',
    required: false,
    example: '2024-12-31',
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty({
    description: 'Timezone for interpreting start/end dates (IANA name)',
    required: false,
    example: 'UTC',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({
    description: 'Granularity used by clients when plotting data (seconds)',
    required: false,
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3600)
  @Type(() => Number)
  granularity?: number;

  @ApiProperty({
    description: 'Return per-second retention (true) in addition to bucketed',
    required: false,
    example: false,
  })
  @IsOptional()
  @Type(() => String)
  @Matches(/^(true|false)$/i, { message: 'perSecond must be true or false' })
  perSecond?: string;

  @ApiProperty({
    description: 'Retention bucket size in seconds (1-60)',
    required: false,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  @Type(() => Number)
  bucketSize?: number;

  @ApiProperty({
    description: 'Top N drop-off points to return (1-20)',
    required: false,
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  topDropOffs?: number;
}

export type ParsedDateRange = { start?: Date; end?: Date };

