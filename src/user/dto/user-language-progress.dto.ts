import { InitialLevel, CEFRLevel } from '../entities/user-language-progress.entity';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEmail, IsEnum, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength, ValidateNested } from "class-validator";
import { Type } from 'class-transformer';

export class UserLanguageProgressDto {
  @IsInt()
  language_id: number;

  @IsEnum(InitialLevel)
  initial_level: InitialLevel;
}

// src/user/dto/signup.dto.ts (update existing)


export class SignupDto {
  @IsString()
  @MaxLength(100)
  first_name: string;

  @IsString()
  @MaxLength(100)
  last_name: string;

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  username: string;

  @IsEmail()
  @MaxLength(150)
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsInt()
  @Min(12)
  age?: number;

  @IsOptional()
  @IsInt()
  preferred_language_id?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Select at least one interest' })
  @ArrayMaxSize(10, { message: 'Maximum 10 interests allowed' })
  @IsInt({ each: true })
  interest_ids?: number[];

  // 🔥 UPDATED: Changed from userLanguages to languageProgress
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Select at least one language' })
  @ArrayMaxSize(10, { message: 'Maximum 10 languages allowed' })
  @ValidateNested({ each: true })
  @Type(() => UserLanguageProgressDto)
  languages?: UserLanguageProgressDto[];
}