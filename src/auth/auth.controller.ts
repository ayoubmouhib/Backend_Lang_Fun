import { Body, Controller, Get, Post, Put, Query, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
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
    return this.authService.resetPassword(resetPasswordDto.newPassword, resetPasswordDto.codenumber);
  }

  // GET Verify Email
  /*
  @Get('verify-email') // auth/verify-email?token=...
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }
    */

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, @Res() res: Response) {
    if (!token) {
      return res.status(400).send(`
            <html>
                <body style="font-family: Arial; text-align: center; padding: 50px;">
                    <h1 style="color: #f44336;">❌ Error</h1>
                    <p>Token is required</p>
                </body>
            </html>
        `);
    }

    try {
      const result = await this.authService.verifyEmail(token);

      // Success - show nice HTML page with auto-close
      return res.send(`
    <html>
        <head>
            <title>Email Verified</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                /* Same styles as above */
            </style>
        </head>
        <body>
            <div class="container">
                <div class="success-icon">✓</div>
                <h1>Email Verified!</h1>
                <p>${result.message}</p>
                <p>Redirecting you back to the app...</p>
                <p class="countdown">
                    Redirecting in <span class="timer" id="countdown">3</span> seconds...
                </p>
            </div>
            
            <script>
                let seconds = 3;
                const countdownElement = document.getElementById('countdown');
                
                const timer = setInterval(() => {
                    seconds--;
                    countdownElement.textContent = seconds;
                    
                    if (seconds <= 0) {
                        clearInterval(timer);
                        
                        // Try to redirect to your app (you'll need to set up deep linking)
                        // window.location.href = 'myapp://verified';
                        
                        // Or just close the tab
                        window.close();
                        
                        // Fallback message
                        setTimeout(() => {
                            document.querySelector('.countdown').innerHTML = 
                                'Verified! You can close this tab and return to the app.';
                        }, 100);
                    }
                }, 1000);
            </script>
        </body>
    </html>
`);
    } catch (error) {
      return res.status(400).send(`
            <html>
                <head>
                    <title>Verification Failed</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            text-align: center;
                            padding: 50px 20px;
                            margin: 0;
                        }
                        .container {
                            max-width: 500px;
                            margin: 0 auto;
                            padding: 40px;
                            border-radius: 10px;
                            background-color: #ffebee;
                        }
                        .error-icon {
                            font-size: 64px;
                            color: #f44336;
                        }
                        h1 { color: #f44336; }
                        p { color: #666; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="error-icon">❌</div>
                        <h1>Verification Failed</h1>
                        <p>${error.message || 'Invalid or expired token'}</p>
                        <p style="font-size: 14px; margin-top: 20px;">
                            Please request a new verification email from the app.
                        </p>
                    </div>
                </body>
            </html>
        `);
    }
  }

  @Get('check-verification-status')
  async checkVerificationStatus(@Query('email') email: string) {
    return this.authService.checkVerificationStatus(email);
  }

  @Post('resend-verification')
  async resendVerification(@Body() body: { email: string }) {
    return this.authService.resendVerificationEmail(body.email);
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
