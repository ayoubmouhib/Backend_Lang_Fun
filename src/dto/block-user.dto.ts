// src/matching/dto/block-user.dto.ts

import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class BlockUserDto {
  @IsInt()
  @Min(1)
  blocked_user_id: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Reason must be max 500 characters' })
  reason?: string;
}

export class UnblockUserDto {
  @IsInt()
  @Min(1)
  blocked_user_id: number;
}