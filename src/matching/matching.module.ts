// src/matching/matching.module.ts (UPDATE)
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchingService } from './matching.service';
import { MatchingController } from './matching.controller';
import { ConversationRequest } from './entities/conversation-request.entity';
import { ConversationSession } from './entities/conversation-session.entity';
import { UserLanguageProgress } from '../user/entities/user-language-progress.entity'; // 🔥 Adjust path
import { User } from '../user/entities/user.entity'; // 🔥 Adjust path
import { UserRating } from './entities/user-rating.entity'; // 🔥 Create if missing
import { MatchingPreference } from './entities/matching-preference.entity'; // 🔥 Create if missing


@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConversationRequest,    
      ConversationSession,
      MatchingPreference,     
      UserRating,
      UserLanguageProgress,
      User,
    ]),
  ],
  providers: [MatchingService],
  controllers: [MatchingController],
  exports: [MatchingService],
})
export class MatchingModule {}