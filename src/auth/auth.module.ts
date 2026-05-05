import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { ResetToken } from './entities/reset-token.entity';
import { EmailVerification } from './entities/email-verification.entity';
import { MailService } from 'src/services/mail.service';
import { GoogleAuthService } from './strategies/google.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken, ResetToken, EmailVerification]),
  ],
  controllers: [AuthController],
  providers: [AuthService, MailService, GoogleAuthService],
})
export class AuthModule {}
