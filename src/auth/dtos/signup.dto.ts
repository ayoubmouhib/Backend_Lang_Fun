import { ArrayMaxSize, ArrayMinSize, IsArray, IsEmail, IsInt, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested } from "class-validator";
import { UserLanguageDto } from "src/user/dto/user-language.dto";
import { Type } from 'class-transformer';

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
    @MinLength(8, { message: 'Password Must Be Containe at Least one Number' })
    //@Matches(/^(?=.* [0-9])/, {message: 'Password Must Contain at least One Number'})
    password: string;

    @IsOptional()
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
    @IsInt({ each: true, message: 'Each interest must be a valid ID' })
    interest_ids?: number[];

    @IsOptional()
    @IsArray()
    @ArrayMinSize(1, { message: 'Select at least one language' })
    @ArrayMaxSize(10, { message: 'Maximum 10 languages allowed' })
    @ValidateNested({ each: true })
    @Type(() => UserLanguageDto)
    languages?: UserLanguageDto[];

}