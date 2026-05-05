import { IsEmail, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from "class-validator";

export class SignupDto{

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
    @MinLength(8,  {message: 'Password Must Be Containe at Least one Number'})
    @Matches(/^(?=.* [0-9])/, {message: 'Password Must Contain at least One Number'})
    password: string;

    @IsInt()
    @Min(12)
    age ?: number;
    
    @IsOptional()
    @IsInt()
    preferred_language_id?: number;
      
}