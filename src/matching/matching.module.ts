import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchingService } from './matching.service';
import { MatchingController } from './matching.controller';
import { ConversationRequest } from './entities/conversation-request.entity';
import { ConversationSession } from './entities/conversation-session.entity';
import { UserLanguageProgress } from '../user/entities/user-language-progress.entity';
import { User } from '../user/entities/user.entity';
import { UserRating } from './entities/user-rating.entity';
import { MatchingPreference } from './entities/matching-preference.entity';
import { BlockedUser } from './entities/blocked-user.entity';
import { BlockedUserService } from './services/blocked-user.service';
import { BlockedUserController } from './blocked-user.controller';
import { Conversation } from '../conversation/entities/conversation.entity';
import { GatewayModule } from '../gateway/gateway.module';

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
      Conversation,
    ]),
    GatewayModule,
  ],
  providers: [MatchingService, BlockedUserService],
  controllers: [MatchingController, BlockedUserController],
  exports: [BlockedUserService, MatchingService],
})
export class MatchingModule {}