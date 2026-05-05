import { Body, Controller, Get, Post, Put, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dtos/signup.dto';
import { LoginDto } from './dtos/login.dto';
import { RefreshTokenDto } from './dtos/refresh.dto';
import { ChangePasswordDto } from './dtos/changePassword.dto';
import { AuthGaurd } from 'src/garuds/auth.gaurd';
import { ForgoutPasswordDto } from './dtos/forogtPassword.dto';
import { ResetPasswordDto } from './dtos/resetPassword.dto';
import { GoogleAuthService } from './strategies/google.strategy';
import { GoogleLoginDto } from './dtos/googleLogin.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private googleAuthService: GoogleAuthService) { }

  //POST Signup
  // TODO :JUst One Things Is To Verify The Email with Sending a message of Validation
  @Post('signup') // auth/signup
  async signUp(@Body() signupData: SignupDto) {
    return this.authService.signup(signupData);
  }

  //POST Login
  @Post('login') // auth/login
  async login(@Body() loginData: LoginDto) {
    return this.authService.login(loginData);
  }


  //POST Refresh Token
  @Post('refresh')
  async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.token);
  }

  // TODO : PUT Change Password
  @UseGuards(AuthGaurd)
  @Put('change-Password')
  async changePassword(@Body() changedPasswordDto: ChangePasswordDto, @Req() req) {
    return this.authService.changePassword(req.userId, changedPasswordDto.oldPassword, changedPasswordDto.newPassword);
  }

  // TODO : Forgot Password
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgoutPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }



  // TODO : Reset Password
  @Put('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto.newPassword, resetPasswordDto.resetToken);
  }

  // GET Verify Email
  @Get('verify-email') // auth/verify-email?token=...
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('google')
  async googleLogin(@Body() dto: GoogleLoginDto) {
    try {
      // Verify the Google ID token
      const googleUser = await this.googleAuthService.verifyIdToken(
        dto.idToken,
      );

      // Find or create user in your database
      if (!googleUser.email) {
        throw new UnauthorizedException('No email provided by Google');
      }

      let user = await this.authService.findUserByEmail(googleUser.email);

      if (!user) {
        user = await this.authService.createUser({
          email: googleUser.email,
          username: googleUser.email.split('@')[0],
          firstName: googleUser.firstName,
          lastName: googleUser.lastName,
          picture: googleUser.picture,
          googleId: googleUser.googleId,
        });
      }

      // Generate your own JWT tokens
      const tokens = await this.authService.generateUserTokens(user.id);

      return {
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
        ...tokens,
      };
    } catch (error) {
      throw new UnauthorizedException('Google authentication failed');
    }
  }

}
