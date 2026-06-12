import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVocabularyEntryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  word: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  translation: string;

  @IsOptional()
  @IsString()
  example?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  language_id?: number;
}
