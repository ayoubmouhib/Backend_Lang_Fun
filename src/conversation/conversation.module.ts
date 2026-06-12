import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationService } from './services/conversation.service';
import { ConversationController } from './controllers/conversation.controller';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { ConversationCall } from './entities/conversation-call.entity';
import { User } from '../user/entities/user.entity';
import { BlockedUserService } from '../matching/services/blocked-user.service';
import { BlockedUser } from '../matching/entities/blocked-user.entity';
import { LiveKitModule } from '../livekit/livekit.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      Message,
      ConversationCall,
      User,
      BlockedUser,
    ]),
    LiveKitModule,
    GatewayModule,
  ],
  providers: [ConversationService, BlockedUserService],
  controllers: [ConversationController],
  exports: [ConversationService],
})
export class ConversationModule {}