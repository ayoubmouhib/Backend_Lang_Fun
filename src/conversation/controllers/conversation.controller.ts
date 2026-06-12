import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Req,
  HttpCode,
} from '@nestjs/common';
import { ConversationService } from '../services/conversation.service';
import { AuthGuard } from '../../garuds/auth.gaurd';
import {
  SendMessageDto,
  EditMessageDto,
  ReactToMessageDto,
  PinMessageDto,
  DeleteMessageDto,
  InitiateCallDto,
  AcceptCallDto,
  EndCallDto,
  GetMessagesQueryDto,
  GetCallsQueryDto,
  CallQualityMetricsDto,
} from '../dto/index';

@Controller('conversations')
@UseGuards(AuthGuard)
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  // ═══════════════════════════════════════════════════════════
  // CONVERSATION ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  @Get()
  async getUserConversations(@Req() req: any) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.conversationService.getUserConversations(userId);
  }

  @Get(':conversationId')
  async getConversation(
    @Req() req: any,
    @Param('conversationId', ParseIntPipe) conversationId: number,
  ) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.conversationService.getConversation(conversationId, userId);
  }

  @Put(':conversationId/archive')
  async archiveConversation(
    @Req() req: any,
    @Param('conversationId', ParseIntPipe) conversationId: number,
  ) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.conversationService.archiveConversation(conversationId, userId);
  }

  @Delete(':conversationId')
  async deleteConversation(
    @Req() req: any,
    @Param('conversationId', ParseIntPipe) conversationId: number,
  ) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.conversationService.deleteConversation(conversationId, userId);
  }

  // ═══════════════════════════════════════════════════════════
  // MESSAGE ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  @Get(':conversationId/messages')
  async getMessages(
    @Req() req: any,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Query() query: GetMessagesQueryDto,
  ) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.conversationService.getMessages(conversationId, userId, query);
  }

  @Post(':conversationId/messages')
  @HttpCode(201)
  async sendMessage(
    @Req() req: any,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Body() dto: SendMessageDto,
  ) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.conversationService.sendMessage(conversationId, userId, dto);
  }

  @Put(':conversationId/messages/:messageId')
  async editMessage(
    @Req() req: any,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Body() dto: EditMessageDto,
  ) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.conversationService.editMessage(
      conversationId,
      messageId,
      userId,
      dto,
    );
  }

  @Delete(':conversationId/messages/:messageId')
  async deleteMessage(
    @Req() req: any,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Body() dto: DeleteMessageDto,
  ) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.conversationService.deleteMessage(
      conversationId,
      messageId,
      userId,
      dto,
    );
  }

  @Post(':conversationId/messages/:messageId/react')
  async reactToMessage(
    @Req() req: any,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Body() dto: ReactToMessageDto,
  ) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.conversationService.reactToMessage(
      conversationId,
      messageId,
      userId,
      dto,
    );
  }

  @Post(':conversationId/messages/:messageId/pin')
  async pinMessage(
    @Req() req: any,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Body() dto: PinMessageDto,
  ) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.conversationService.pinMessage(
      conversationId,
      messageId,
      userId,
      dto,
    );
  }

  @Get(':conversationId/messages/pinned')
  async getPinnedMessages(
    @Req() req: any,
    @Param('conversationId', ParseIntPipe) conversationId: number,
  ) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.conversationService.getPinnedMessages(conversationId, userId);
  }

  // ═══════════════════════════════════════════════════════════
  // CALL ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  @Post(':conversationId/calls/initiate')
  @HttpCode(201)
  async initiateCall(
    @Req() req: any,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Body() dto: InitiateCallDto,
  ) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.conversationService.initiateCall(conversationId, userId, dto);
  }

  @Post('calls/:callId/accept')
  @HttpCode(200)
  async acceptCall(
    @Req() req: any,
    @Param('callId', ParseIntPipe) callId: number,
    @Body() dto: AcceptCallDto,
  ) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.conversationService.acceptCall(callId, userId, dto);
  }

  @Post('calls/:callId/reject')
  @HttpCode(200)
  async rejectCall(
    @Req() req: any,
    @Param('callId', ParseIntPipe) callId: number,
  ) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.conversationService.rejectCall(callId, userId);
  }

  @Post('calls/:callId/end')
  @HttpCode(200)
  async endCall(
    @Req() req: any,
    @Param('callId', ParseIntPipe) callId: number,
    @Body() dto: EndCallDto,
  ) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.conversationService.endCall(callId, userId, dto);
  }

  @Get(':conversationId/calls')
  async getCallHistory(
    @Req() req: any,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Query() query: GetCallsQueryDto,
  ) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.conversationService.getCallHistory(conversationId, userId, query);
  }

  @Put('calls/:callId/quality')
  async updateCallQuality(
    @Req() req: any,
    @Param('callId', ParseIntPipe) callId: number,
    @Body() metrics: CallQualityMetricsDto,
  ) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.conversationService.updateCallQuality(callId, userId, metrics);
  }
}