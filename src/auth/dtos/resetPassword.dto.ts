import { IsString, Matches, MinLength } from "class-validator";

export class ResetPasswordDto {
    @IsString()
    resetToken: string;

    @IsString()
    @MinLength(8, { message: 'Password Must Be Containe at Least one Number' })
    @Matches(/^(?=.*[0-9])/, { message: 'Password Must Contain at least One Number' })
    newPassword: string;


}