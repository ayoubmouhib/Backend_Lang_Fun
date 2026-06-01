// src/auth/auth.module.ts (UPDATED)
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt'; // 🔥 ADD THIS
import { ConfigModule, ConfigService } from '@nestjs/config'; // 🔥 ADD THIS
import type { SignOptions } from 'jsonwebtoken';
import { User } from 'src/user/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { ResetToken } from './entities/reset-token.entity';
import { EmailVerification } from './entities/email-verification.entity';
import { MailService } from 'src/services/mail.service';
import { GoogleAuthService } from './strategies/google.strategy';
import { RandomNumber } from './entities/random-number-verification.entity';
import { Interest } from './entities/interest.entity';
import { Language } from 'src/languages/entities/language.entity';
import { UserLanguageProgress } from 'src/user/entities/user-language-progress.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      RefreshToken,
      ResetToken,
      EmailVerification,
      RandomNumber,
      Interest,
      Language,
      UserLanguageProgress,
    ]),
    // 🔥 ADD JWT MODULE
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') ||
          'default_secret_key_change_me',
        signOptions: {
          expiresIn:
            configService.get<SignOptions['expiresIn']>('JWT_EXPIRATION') ||
            '24h',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, MailService, GoogleAuthService],
  exports: [JwtModule], // 🔥 EXPORT FOR OTHER MODULES
})
export class AuthModule {}
