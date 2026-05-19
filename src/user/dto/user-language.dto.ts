import { IsInt, IsEnum, IsNotEmpty } from 'class-validator';
import { ProficiencyLevel } from '../entities/user-language.entity';



export class UserLanguageDto {
  @IsInt()
  @IsNotEmpty()
  language_id: number;

  @IsEnum(ProficiencyLevel, { 
    message: 'Level must be beginner, intermediate, or advanced' 
  })
  @IsNotEmpty()
  level: ProficiencyLevel;
}