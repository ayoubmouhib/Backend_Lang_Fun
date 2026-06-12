import { IsString, IsInt, IsOptional, MaxLength, MinLength, Min } from 'class-validator';

export class CreateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  first_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  last_name?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  username?: string;

  @IsOptional()
  @IsInt()
  @Min(12)
  age?: number;

  @IsOptional()
  @IsInt()
  preferred_language_id?: number;
}
