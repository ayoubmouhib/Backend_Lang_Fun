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
import { BlockedUser } from './entities/blocked-user.entity';
import { BlockedUserService } from './services/blocked-user.service';
import { BlockedUserController } from './blocked-user.controller';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConversationRequest,    
      ConversationSession,
      MatchingPreference,     
      UserRating,
       BlockedUser,
      UserLanguageProgress,
      User,
    ]),
  ],
  providers: [MatchingService, BlockedUserService],
  controllers: [MatchingController, BlockedUserController],
  exports: [BlockedUserService,MatchingService],
})
export class MatchingModule {}