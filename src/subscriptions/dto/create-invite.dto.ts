// DTO para criar um convite
import { IsEmail } from 'class-validator';

export class CreateInviteDto {
  @IsEmail()
  email: string;
}