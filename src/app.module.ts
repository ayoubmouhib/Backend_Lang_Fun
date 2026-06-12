import { Module, OnModuleInit } from '@nestjs/common';
import { seedQuizContent } from './seeds/quiz-content.seed';
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
import { UserLanguageProgress } from './user/entities/user-language-progress.entity';
import { UserLanguage } from './user/entities/user-language.entity';
import { QuizModule } from './quiz/quiz.module';
import { GamesModule } from './games/games.module';
import { QuizResult } from './quiz/entities/quiz-result.entity';
import { QuizInstance } from './quiz/entities/quiz-instance.entity';
import { QuizTemplate } from './quiz/entities/quiz-template.entity';
import { QuizUserAnswer } from './quiz/entities/quiz-user-answer.entity';
import { QuizQuestionsBank } from './quiz/entities/quiz-questions-bank.entity';
import { GameWord } from './games/entities/game-word.entity';
import { GameSession } from './games/entities/game-session.entity';
import { MatchingModule } from './matching/matching.module';

// 🔥 ADD THESE MATCHING ENTITIES
import { ConversationRequest } from './matching/entities/conversation-request.entity';
import { ConversationSession } from './matching/entities/conversation-session.entity';
import { MatchingPreference } from './matching/entities/matching-preference.entity';
import { UserRating } from './matching/entities/user-rating.entity';
import { BlockedUser } from './matching/entities/blocked-user.entity';
import { ConversationModule } from './conversation/conversation.module';
import { Conversation } from './conversation/entities/conversation.entity';
import { ConversationCall } from './conversation/entities/conversation-call.entity';
import { Message } from './conversation/entities/message.entity';
import { GatewayModule } from './gateway/gateway.module';
import { FollowsModule } from './follows/follows.module';
import { UserFollow } from './follows/entities/user-follow.entity';
import { VocabularyModule } from './vocabulary/vocabulary.module';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '',
      database: 'FlutterProject',
      // 🔥 ADD MATCHING ENTITIES HERE
      entities: [
        User,
        Language,
        RefreshToken,
        ResetToken,
        EmailVerification,
        RandomNumber,
        Interest,
        UserLanguage,
        UserLanguageProgress,
        QuizResult,
        QuizInstance,
        QuizTemplate,
        QuizUserAnswer,
        QuizQuestionsBank,
        GameWord,
        GameSession,
        ConversationRequest,
        ConversationSession, 
        MatchingPreference, 
        UserRating, 
        BlockedUser,
        Message,
        ConversationCall,
        Conversation,
        UserFollow,
      ],
      synchronize: true, // is good for development but NEVER use it in production as it can drop/recreate tables and lose data!
      logging: true, // Optional: to see SQL queries
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      migrationsRun: true, // Automatically run migrations on startup
    }),
    UserModule,
    LanguagesModule,
    AuthModule,
    QuizModule,
    GamesModule,
    MatchingModule,
    ConversationModule,
    FollowsModule,
    VocabularyModule,
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
    GatewayModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    await seedQuizContent(this.dataSource);
  }
}