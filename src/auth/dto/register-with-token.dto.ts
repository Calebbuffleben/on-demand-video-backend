import { IsString, IsEmail, IsOptional, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterWithTokenDto {
  @ApiProperty({
    description: 'Token de criação de conta recebido por email',
    example: 'abc123def456789...'
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'Email do usuário (deve coincidir com o token)',
    example: 'usuario@exemplo.com'
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'MinhaSenh@123',
    minLength: 8
  })
  @IsString()
  @MinLength(8, { message: 'A senha deve ter pelo menos 8 caracteres' })
  password: string;

  @ApiProperty({
    description: 'Nome do usuário',
    example: 'João',
    required: false
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    description: 'Sobrenome do usuário',
    example: 'Silva',
    required: false
  })
  @IsOptional()
  @IsString()
  lastName?: string;
}
