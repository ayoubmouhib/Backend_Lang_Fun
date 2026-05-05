import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class LoginDto {
    @IsEmail()
    @MaxLength(150)
    @IsOptional()
    email: string;

    @IsString()
    @MinLength(3)
    @MaxLength(100)
    @IsOptional()
    username: string;

    @IsString()
    @MinLength(8, { message: 'Password Must Be Containe at Least one Number' })
    password: string;
}