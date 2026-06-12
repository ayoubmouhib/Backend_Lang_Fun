import { IsInt, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { InitialLevel } from '../entities/user-language-progress.entity';

export class AddUserLanguageDto {
  @IsInt()
  @IsNotEmpty()
  language_id: number;

  @IsEnum(InitialLevel, {
    message: 'Level must be beginner, intermediate, or advanced',
  })
  @IsOptional()
  level?: InitialLevel;
}
