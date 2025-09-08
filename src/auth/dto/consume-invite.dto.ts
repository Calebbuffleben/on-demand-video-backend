import { IsOptional, IsString, MinLength } from 'class-validator';

export class ConsumeInviteDto {
  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;
}


