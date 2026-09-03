import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { BoardRole } from '@prisma/client';

export class ShareBoardDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsEnum(BoardRole)
  role?: BoardRole;
}
