import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UserModule } from './user/user.module';
import { LanguagesModule } from './languages/languages.module';
import { User } from './user/entities/user.entity';
import { Language } from './languages/entities/language.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import config from './config/config';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { ResetToken } from './auth/entities/reset-token.entity';
import { EmailVerification } from './auth/entities/email-verification.entity';
import { RandomNumber } from './auth/entities/random-number-verification.entity';
import { Interest } from './auth/entities/interest.entity';
import { InterestsModule } from './interests/interests.module';

@Module({
  imports: [AuthModule, TypeOrmModule.forRoot({
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: '',
    database: 'FlutterProject',
    entities: [User, Language, RefreshToken, ResetToken, EmailVerification, RandomNumber, Interest],
    synchronize: true, // is good for development but NEVER use it in production as it can drop/recreate tables and lose data!
    logging: true, // Optional: to see SQL queries
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    migrationsRun: true, // Automatically run migrations on startup
  }), UserModule, LanguagesModule, AuthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [config],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config) => ({
        secret: config.get('jwt.secret'),
      }),
      global: true,
      inject: [ConfigService],
    }),
     InterestsModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  constructor(private dataSource: DataSource) { }
}
