import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FollowsService } from './follows.service';
import { FollowsController } from './follows.controller';
import { UserFollow } from './entities/user-follow.entity';
import { User } from '../user/entities/user.entity';
import { ConversationRequest } from '../matching/entities/conversation-request.entity';
import { ConversationSession } from '../matching/entities/conversation-session.entity';
import { Conversation } from '../conversation/entities/conversation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserFollow,
      User,
      ConversationRequest,
      ConversationSession,
      Conversation,
    ]),
  ],
  controllers: [FollowsController],
  providers: [FollowsService],
  exports: [FollowsService],
})
export class FollowsModule {}
