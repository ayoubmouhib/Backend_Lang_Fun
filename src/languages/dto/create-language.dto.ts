import { IsString, IsEnum, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateLanguageDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(10)
  iso_code: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  native_name?: string;

  @IsOptional()
  @IsEnum(['LTR', 'RTL'], { message: 'direction must be LTR or RTL' })
  direction?: 'LTR' | 'RTL';
}
