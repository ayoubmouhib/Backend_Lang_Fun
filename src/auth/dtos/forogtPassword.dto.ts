import { IsEmail, MaxLength } from "class-validator";

export class ForgoutPasswordDto {
    @IsEmail()
    @MaxLength(150)
    email: string;
}