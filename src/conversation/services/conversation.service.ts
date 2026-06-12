import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { ConversationCall, CallStatus } from '../entities/conversation-call.entity';
import { User } from '../../user/entities/user.entity';
import { BlockedUserService } from '../../matching/services/blocked-user.service';
import { LiveKitService } from '../../livekit/livekit.service';
import { AppGateway } from '../../gateway/app.gateway';
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

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Resolve which of user_1 / user_2 is the "other" participant. */
function otherParticipantId(conv: Conversation, userId: number): number {
  return conv.user_1_id === userId ? conv.user_2_id : conv.user_1_id;
}

/** Verify the caller is a participant; throw ForbiddenException otherwise. */
function assertParticipant(conv: Conversation, userId: number): void {
  if (conv.user_1_id !== userId && conv.user_2_id !== userId) {
    throw new ForbiddenException('You are not part of this conversation');
  }
}

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,

    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,

    @InjectRepository(ConversationCall)
    private readonly callRepo: Repository<ConversationCall>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly blockedUserService: BlockedUserService,
    private readonly livekitService: LiveKitService,
    private readonly appGateway: AppGateway,
  ) {}

  // ═══════════════════════════════════════════════════════════
  // CONVERSATION
  // ═══════════════════════════════════════════════════════════

  /**
   * Return all non-deleted conversations for a user, sorted by last activity.
   * Includes partner profile + unread count relevant to the caller.
   */
  async getUserConversations(userId: number): Promise<any[]> {
    const conversations = await this.conversationRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.user_1', 'u1')
      .leftJoinAndSelect('c.user_2', 'u2')
      .leftJoinAndSelect('c.language', 'lang')
      .where('(c.user_1_id = :uid OR c.user_2_id = :uid)', { uid: userId })
      .andWhere('c.status != :deleted', { deleted: 'deleted' })
      .orderBy('COALESCE(c.last_activity_at, c.created_at)', 'DESC')
      .getMany();

    return conversations.map((conv) => this.formatConversationSummary(conv, userId));
  }

  /**
   * Return full conversation details for one conversation.
   * Caller must be a participant.
   */
  async getConversation(conversationId: number, userId: number): Promise<any> {
    const conv = await this.findConversationOrFail(conversationId, [
      'user_1',
      'user_2',
      'language',
    ]);

    assertParticipant(conv, userId);

    return this.formatConversationSummary(conv, userId);
  }

  /**
   * Soft-archive a conversation for the requesting user.
   * We update the status to 'archived' — a real-world app would
   * track per-user archive flags, but this matches the current entity schema.
   */
  async archiveConversation(conversationId: number, userId: number): Promise<any> {
    const conv = await this.findConversationOrFail(conversationId);

    assertParticipant(conv, userId);

    if (conv.status === 'deleted') {
      throw new BadRequestException('Conversation has been deleted');
    }

    conv.status = 'archived';
    await this.conversationRepo.save(conv);

    return { id: conversationId, status: 'archived', message: 'Conversation archived' };
  }

  /**
   * Hard-delete a conversation (sets status to 'deleted').
   * Only participants may do this.
   */
  async deleteConversation(conversationId: number, userId: number): Promise<any> {
    const conv = await this.findConversationOrFail(conversationId);

    assertParticipant(conv, userId);

    conv.status = 'deleted';
    await this.conversationRepo.save(conv);

    return { id: conversationId, message: 'Conversation deleted' };
  }

  // ═══════════════════════════════════════════════════════════
  // MESSAGES
  // ═══════════════════════════════════════════════════════════

  /**
   * Paginated message history for a conversation.
   * Deleted messages are replaced with a tombstone placeholder.
   */
  async getMessages(
    conversationId: number,
    userId: number,
    query: GetMessagesQueryDto,
  ): Promise<any> {
    const conv = await this.findConversationOrFail(conversationId);
    assertParticipant(conv, userId);

    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const order: 'ASC' | 'DESC' = query.sort_asc ? 'ASC' : 'DESC';

    const [messages, total] = await this.messageRepo.findAndCount({
      where: { conversation_id: conversationId },
      relations: ['sender', 'reply_to', 'reply_to.sender'],
      order: { created_at: order },
      skip: offset,
      take: limit,
    });

    return {
      total,
      limit,
      offset,
      messages: messages.map((m) => this.formatMessage(m)),
    };
  }

  /**
   * Send a message. Validates participant access and that the conversation
   * is not archived/deleted. Updates conversation last-activity metadata.
   */
  async sendMessage(
    conversationId: number,
    userId: number,
    dto: SendMessageDto,
  ): Promise<any> {
    const conv = await this.findConversationOrFail(conversationId);
    assertParticipant(conv, userId);

    if (conv.status === 'deleted') {
      throw new BadRequestException('Cannot send a message to a deleted conversation');
    }

    // Block check: prevent messaging if either side has blocked the other
    const otherId = otherParticipantId(conv, userId);
    const isBlocked = await this.blockedUserService.isUserBlocked(userId, otherId);
    if (isBlocked) {
      throw new ForbiddenException('You cannot send messages in this conversation');
    }

    // Validate the quoted message, if any, belongs to this conversation
    let replyToMessageId: number | null = null;
    if (dto.reply_to_message_id != null) {
      const quoted = await this.messageRepo.findOne({
        where: { id: dto.reply_to_message_id, conversation_id: conversationId },
      });
      if (!quoted || quoted.is_deleted) {
        throw new BadRequestException('The message you are replying to was not found');
      }
      replyToMessageId = quoted.id;
    }

    const message = this.messageRepo.create({
      conversation_id: conversationId,
      sender_id: userId,
      content: dto.content,
      type: dto.type,
      media_info: dto.media_info,
      status: 'sent',
      reply_to_message_id: replyToMessageId,
    });

    const saved = await this.messageRepo.save(message);
    if (replyToMessageId != null) {
      saved.reply_to = await this.messageRepo.findOne({
        where: { id: replyToMessageId },
        relations: ['sender'],
      });
    }

    // Update conversation statistics
    const unreadField =
      conv.user_1_id === userId ? 'unread_count_user_2' : 'unread_count_user_1';

    await this.conversationRepo
      .createQueryBuilder()
      .update(Conversation)
      .set({
        message_count: () => 'message_count + 1',
        last_message_content: dto.content.slice(0, 255),
        last_message_user_id: userId,
        last_message_at: new Date(),
        last_activity_at: new Date(),
        [unreadField]: () => `${unreadField} + 1`,
      })
      .where('id = :id', { id: conversationId })
      .execute();

    return this.formatMessage(saved);
  }

  /**
   * Edit a message's content.
   * Only the original sender may edit; editing is allowed within 15 minutes.
   */
  async editMessage(
    conversationId: number,
    messageId: number,
    userId: number,
    dto: EditMessageDto,
  ): Promise<any> {
    const message = await this.findMessageOrFail(messageId, conversationId);

    if (message.sender_id !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    if (message.is_deleted) {
      throw new BadRequestException('Cannot edit a deleted message');
    }

    const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
    if (Date.now() - message.created_at.getTime() > EDIT_WINDOW_MS) {
      throw new BadRequestException('Messages can only be edited within 15 minutes of sending');
    }

    message.edited_content = message.content; // Preserve original
    message.content = dto.content;
    message.is_edited = true;
    message.edited_at = new Date();

    const saved = await this.messageRepo.save(message);

    return this.formatMessage(saved);
  }

  /**
   * Soft-delete a message.
   * Only the sender (or admins, not modelled here) may delete.
   */
  async deleteMessage(
    conversationId: number,
    messageId: number,
    userId: number,
    dto: DeleteMessageDto,
  ): Promise<any> {
    const message = await this.findMessageOrFail(messageId, conversationId);

    if (message.sender_id !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    if (message.is_deleted) {
      throw new BadRequestException('Message is already deleted');
    }

    message.is_deleted = true;
    message.deleted_at = new Date();
    message.delete_reason = dto.reason ?? 'user_deleted';

    await this.messageRepo.save(message);

    return { id: messageId, message: 'Message deleted' };
  }

  /**
   * Toggle an emoji reaction on a message.
   * `dto.add = true` adds the reaction; `false` removes it.
   */
  async reactToMessage(
    conversationId: number,
    messageId: number,
    userId: number,
    dto: ReactToMessageDto,
  ): Promise<any> {
    const conv = await this.findConversationOrFail(conversationId);
    assertParticipant(conv, userId);

    const message = await this.findMessageOrFail(messageId, conversationId);

    if (message.is_deleted) {
      throw new BadRequestException('Cannot react to a deleted message');
    }

    const reactions: Record<string, number[]> = message.reactions ?? {};

    if (dto.add) {
      if (!reactions[dto.emoji]) reactions[dto.emoji] = [];
      if (!reactions[dto.emoji].includes(userId)) {
        reactions[dto.emoji].push(userId);
      }
    } else {
      if (reactions[dto.emoji]) {
        reactions[dto.emoji] = reactions[dto.emoji].filter((id) => id !== userId);
        if (reactions[dto.emoji].length === 0) {
          delete reactions[dto.emoji];
        }
      }
    }

    message.reactions = reactions;
    await this.messageRepo.save(message);

    return { id: messageId, reactions };
  }

  /**
   * Pin or unpin a message.
   * Both conversation participants may pin/unpin.
   */
  async pinMessage(
    conversationId: number,
    messageId: number,
    userId: number,
    dto: PinMessageDto,
  ): Promise<any> {
    const conv = await this.findConversationOrFail(conversationId);
    assertParticipant(conv, userId);

    const message = await this.findMessageOrFail(messageId, conversationId);

    if (message.is_deleted) {
      throw new BadRequestException('Cannot pin a deleted message');
    }

    message.is_pinned = dto.pin;
    message.pinned_at = dto.pin ? new Date() : null;
    message.pinned_by_user_id = dto.pin ? userId : null;

    await this.messageRepo.save(message);

    return {
      id: messageId,
      is_pinned: message.is_pinned,
      pinned_at: message.pinned_at,
      message: dto.pin ? 'Message pinned' : 'Message unpinned',
    };
  }

  /**
   * Return all pinned (non-deleted) messages for a conversation.
   */
  async getPinnedMessages(conversationId: number, userId: number): Promise<any[]> {
    const conv = await this.findConversationOrFail(conversationId);
    assertParticipant(conv, userId);

    const messages = await this.messageRepo.find({
      where: { conversation_id: conversationId, is_pinned: true, is_deleted: false },
      relations: ['sender', 'reply_to', 'reply_to.sender'],
      order: { pinned_at: 'DESC' },
    });

    return messages.map((m) => this.formatMessage(m));
  }

  // ═══════════════════════════════════════════════════════════
  // CALLS
  // ═══════════════════════════════════════════════════════════

  /**
   * Initiate an audio or video call inside a conversation.
   * There must be no already-active call in this conversation.
   */
  async initiateCall(
    conversationId: number,
    userId: number,
    dto: InitiateCallDto,
  ): Promise<any> {
    const conv = await this.findConversationOrFail(conversationId);
    assertParticipant(conv, userId);

    if (conv.status === 'deleted') {
      throw new BadRequestException('Cannot initiate a call in a deleted conversation');
    }

    // Prevent double-calls
    const activeCall = await this.callRepo.findOne({
      where: {
        conversation_id: conversationId,
        status: CallStatus.ACTIVE,
      },
    });
    if (activeCall) {
      throw new BadRequestException('There is already an active call in this conversation');
    }

    const receiverId = otherParticipantId(conv, userId);

    // Create the call record first so we have an ID for the room name
    const call = this.callRepo.create({
      conversation_id: conversationId,
      initiator_id: userId,
      receiver_id: receiverId,
      type: dto.type,
      status: CallStatus.RINGING,
      can_be_recorded: dto.can_be_recorded ?? true,
    });
    const saved = await this.callRepo.save(call);

    // Generate LiveKit room and per-participant tokens
    const roomName       = this.livekitService.roomNameForCall(saved.id);
    const initiatorToken = await this.livekitService.generateToken(userId, roomName);
    const receiverToken  = await this.livekitService.generateToken(receiverId, roomName);

    // Persist room info for the receiver to claim later
    saved.call_server_url = this.livekitService.serverUrl;
    saved.call_token      = receiverToken;
    await this.callRepo.save(saved);

    // Bump call count on the conversation
    await this.conversationRepo
      .createQueryBuilder()
      .update(Conversation)
      .set({ call_count: () => 'call_count + 1', last_activity_at: new Date() })
      .where('id = :id', { id: conversationId })
      .execute();

    // Notify receiver via WebSocket
    const initiator = await this.userRepo.findOne({ where: { id: userId } });
    this.appGateway.sendToUser(receiverId, 'incoming_call', {
      call_id:          saved.id,
      conversation_id:  conversationId,
      type:             dto.type,
      caller:           { id: userId, name: initiator ? `${initiator.first_name} ${initiator.last_name}`.trim() : '' },
      call_token:       receiverToken,
      call_server_url:  this.livekitService.serverUrl,
    });

    return {
      ...this.formatCall(saved),
      call_token:      initiatorToken,
      call_server_url: this.livekitService.serverUrl,
    };
  }

  /**
   * Receiver accepts an incoming call.
   */
  async acceptCall(callId: number, userId: number, _dto: AcceptCallDto): Promise<any> {
    const call = await this.findCallOrFail(callId);

    if (call.receiver_id !== userId) {
      throw new ForbiddenException('Only the receiver can accept this call');
    }

    if (call.status !== CallStatus.RINGING && call.status !== CallStatus.INITIATED) {
      throw new BadRequestException(`Call cannot be accepted (current status: ${call.status})`);
    }

    call.status = CallStatus.ACTIVE;
    call.started_at = new Date();

    const saved = await this.callRepo.save(call);

    return {
      ...this.formatCall(saved),
      call_token:      saved.call_token      ?? null,
      call_server_url: saved.call_server_url ?? null,
    };
  }

  /**
   * Receiver rejects/declines an incoming call.
   */
  async rejectCall(callId: number, userId: number): Promise<any> {
    const call = await this.findCallOrFail(callId);

    if (call.receiver_id !== userId) {
      throw new ForbiddenException('Only the receiver can reject this call');
    }

    if (call.status !== CallStatus.RINGING && call.status !== CallStatus.INITIATED) {
      throw new BadRequestException(`Call cannot be rejected (current status: ${call.status})`);
    }

    call.status = CallStatus.REJECTED;
    call.ended_at = new Date();
    call.was_missed = true;
    call.miss_reason = 'rejected';

    const saved = await this.callRepo.save(call);

    return this.formatCall(saved);
  }

  /**
   * Either participant can end the call.
   * Caller provides the measured duration for accuracy.
   */
  async endCall(callId: number, userId: number, dto: EndCallDto): Promise<any> {
    const call = await this.findCallOrFail(callId);

    const isParticipant =
      call.initiator_id === userId || call.receiver_id === userId;
    if (!isParticipant) {
      throw new ForbiddenException('You are not part of this call');
    }

    const terminableStatuses: CallStatus[] = [
      CallStatus.ACTIVE,
      CallStatus.RINGING,
      CallStatus.INITIATED,
    ];
    if (!terminableStatuses.includes(call.status)) {
      throw new BadRequestException(`Call is already in terminal state: ${call.status}`);
    }

    // If it was still ringing when ended → mark as missed
    if (call.status === CallStatus.RINGING || call.status === CallStatus.INITIATED) {
      call.was_missed = call.receiver_id !== userId; // Caller hung up before answer
      call.miss_reason = call.was_missed ? 'no_answer' : 'cancelled';
    }

    call.status = CallStatus.ENDED;
    call.ended_at = new Date();
    call.duration_seconds = dto.duration_seconds;

    if (dto.end_reason) {
      call.miss_reason = dto.end_reason;
    }

    const saved = await this.callRepo.save(call);

    return this.formatCall(saved);
  }

  /**
   * Paginated call history for a conversation.
   */
  async getCallHistory(
    conversationId: number,
    userId: number,
    query: GetCallsQueryDto,
  ): Promise<any> {
    const conv = await this.findConversationOrFail(conversationId);
    assertParticipant(conv, userId);

    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const [calls, total] = await this.callRepo.findAndCount({
      where: { conversation_id: conversationId },
      relations: ['initiator', 'receiver'],
      order: { initiated_at: 'DESC' },
      skip: offset,
      take: limit,
    });

    return {
      total,
      limit,
      offset,
      calls: calls.map((c) => this.formatCall(c)),
    };
  }

  /**
   * Attach post-call quality metrics (bitrate, latency, etc.) to a call record.
   */
  async updateCallQuality(
    callId: number,
    userId: number,
    metrics: CallQualityMetricsDto,
  ): Promise<any> {
    const call = await this.findCallOrFail(callId);

    const isParticipant =
      call.initiator_id === userId || call.receiver_id === userId;
    if (!isParticipant) {
      throw new ForbiddenException('You are not part of this call');
    }

    call.quality_metrics = {
      ...call.quality_metrics,
      ...metrics,
    };

    await this.callRepo.save(call);

    return { id: callId, quality_metrics: call.quality_metrics };
  }

  // ═══════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════

  private async findConversationOrFail(
    id: number,
    relations: string[] = [],
  ): Promise<Conversation> {
    const conv = await this.conversationRepo.findOne({ where: { id }, relations });
    if (!conv) {
      throw new NotFoundException(`Conversation #${id} not found`);
    }
    return conv;
  }

  private async findMessageOrFail(
    id: number,
    conversationId: number,
  ): Promise<Message> {
    const message = await this.messageRepo.findOne({
      where: { id, conversation_id: conversationId },
      relations: ['sender'],
    });
    if (!message) {
      throw new NotFoundException(`Message #${id} not found`);
    }
    return message;
  }

  private async findCallOrFail(id: number): Promise<ConversationCall> {
    const call = await this.callRepo.findOne({
      where: { id },
      relations: ['initiator', 'receiver'],
    });
    if (!call) {
      throw new NotFoundException(`Call #${id} not found`);
    }
    return call;
  }

  private formatConversationSummary(conv: Conversation, userId: number): any {
    const isUser1 = conv.user_1_id === userId;
    const partner = isUser1 ? conv.user_2 : conv.user_1;
    const unreadCount = isUser1
      ? conv.unread_count_user_1
      : conv.unread_count_user_2;

    return {
      id: conv.id,
      status: conv.status,
      type: conv.type,
      language: conv.language
        ? { id: conv.language.id, name: conv.language.name }
        : null,
      partner: partner
        ? {
            id: partner.id,
            name: `${partner.first_name} ${partner.last_name}`.trim(),
            avatar: (partner as any).avatar_url ?? null,
          }
        : null,
      last_message: conv.last_message_content
        ? {
            content: conv.last_message_content,
            sent_by_me: conv.last_message_user_id === userId,
            at: conv.last_message_at,
          }
        : null,
      unread_count: unreadCount ?? 0,
      message_count: conv.message_count,
      call_count: conv.call_count,
      last_activity_at: conv.last_activity_at,
      created_at: conv.created_at,
    };
  }

  private formatMessage(m: Message): any {
    if (m.is_deleted) {
      return {
        id: m.id,
        conversation_id: m.conversation_id,
        is_deleted: true,
        deleted_at: m.deleted_at,
        created_at: m.created_at,
      };
    }

    return {
      id: m.id,
      conversation_id: m.conversation_id,
      sender: m.sender
        ? {
            id: m.sender.id,
            name: `${m.sender.first_name} ${m.sender.last_name}`.trim(),
          }
        : { id: m.sender_id },
      type: m.type,
      content: m.content,
      media_info: m.media_info ?? null,
      status: m.status,
      is_edited: m.is_edited,
      edited_at: m.edited_at ?? null,
      reactions: m.reactions ?? {},
      reply_to: m.reply_to && !m.reply_to.is_deleted
        ? {
            id: m.reply_to.id,
            content: m.reply_to.content?.slice(0, 200) ?? '',
            sender_name: m.reply_to.sender
              ? `${m.reply_to.sender.first_name} ${m.reply_to.sender.last_name}`.trim()
              : null,
          }
        : null,
      is_pinned: m.is_pinned,
      pinned_at: m.pinned_at ?? null,
      read_at: m.read_at ?? null,
      created_at: m.created_at,
      updated_at: m.updated_at,
    };
  }

  private formatCall(c: ConversationCall): any {
    const durationMinutes =
      c.duration_seconds != null ? Math.floor(c.duration_seconds / 60) : null;

    return {
      id: c.id,
      conversation_id: c.conversation_id,
      type: c.type,
      status: c.status,
      initiator: c.initiator
        ? { id: c.initiator.id, name: `${c.initiator.first_name} ${c.initiator.last_name}`.trim() }
        : { id: c.initiator_id },
      receiver: c.receiver
        ? { id: c.receiver.id, name: `${c.receiver.first_name} ${c.receiver.last_name}`.trim() }
        : { id: c.receiver_id },
      call_token:      c.call_token      ?? null,
      call_server_url: c.call_server_url ?? null,
      duration_seconds: c.duration_seconds ?? null,
      duration_minutes: durationMinutes,
      was_missed: c.was_missed,
      miss_reason: c.miss_reason ?? null,
      can_be_recorded: c.can_be_recorded,
      quality_metrics: c.quality_metrics ?? null,
      initiated_at: c.initiated_at,
      started_at: c.started_at ?? null,
      ended_at: c.ended_at ?? null,
    };
  }

}