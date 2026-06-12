import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FollowStatus, UserFollow } from './entities/user-follow.entity';
import { User } from '../user/entities/user.entity';
import { ConversationRequest } from '../matching/entities/conversation-request.entity';
import { ConversationSession } from '../matching/entities/conversation-session.entity';
import { Conversation, ConversationType } from '../conversation/entities/conversation.entity';

export type RelationshipStatus =
  | 'self'
  | 'none'
  | 'request_sent'
  | 'request_received'
  | 'following';

@Injectable()
export class FollowsService {
  constructor(
    @InjectRepository(UserFollow) private followRepo: Repository<UserFollow>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(ConversationRequest) private convRequestRepo: Repository<ConversationRequest>,
    @InjectRepository(ConversationSession) private convSessionRepo: Repository<ConversationSession>,
    @InjectRepository(Conversation) private conversationRepo: Repository<Conversation>,
  ) {}

  // ── Send a follow request ────────────────────────────────────────────────
  async sendRequest(userId: number, targetUserId: number) {
    if (userId === targetUserId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const target = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!target) {
      throw new NotFoundException(`User #${targetUserId} not found`);
    }

    const existing = await this.followRepo.findOne({
      where: { follower_id: userId, following_id: targetUserId },
    });
    if (existing) {
      if (existing.status === FollowStatus.ACCEPTED) {
        throw new ConflictException('You are already following this user');
      }
      if (existing.status === FollowStatus.PENDING) {
        throw new ConflictException('Follow request already sent');
      }
      // Previously declined — allow re-sending by reopening the request
      existing.status = FollowStatus.PENDING;
      existing.responded_at = null;
      return this.toRequestDto(await this.followRepo.save(existing));
    }

    const reciprocal = await this.followRepo.findOne({
      where: { follower_id: targetUserId, following_id: userId, status: FollowStatus.PENDING },
    });
    if (reciprocal) {
      // They already asked to follow us — accept theirs instead of creating a duplicate ticket
      return this.acceptRequest(userId, reciprocal.id);
    }

    const request = this.followRepo.create({
      follower_id: userId,
      following_id: targetUserId,
      status: FollowStatus.PENDING,
    });
    return this.toRequestDto(await this.followRepo.save(request));
  }

  // ── Incoming / outgoing pending requests ─────────────────────────────────
  async getIncomingRequests(userId: number) {
    const requests = await this.followRepo.find({
      where: { following_id: userId, status: FollowStatus.PENDING },
      relations: ['follower'],
      order: { created_at: 'DESC' },
    });
    return requests.map((r) => this.toRequestDto(r, r.follower));
  }

  async getOutgoingRequests(userId: number) {
    const requests = await this.followRepo.find({
      where: { follower_id: userId, status: FollowStatus.PENDING },
      relations: ['following'],
      order: { created_at: 'DESC' },
    });
    return requests.map((r) => this.toRequestDto(r, r.following));
  }

  // ── Accept ────────────────────────────────────────────────────────────────
  async acceptRequest(userId: number, requestId: number) {
    const request = await this.followRepo.findOne({
      where: { id: requestId },
      relations: ['follower', 'following'],
    });
    if (!request) {
      throw new NotFoundException('Follow request not found');
    }
    if (request.following_id !== userId) {
      throw new ForbiddenException('You cannot accept this request');
    }
    if (request.status !== FollowStatus.PENDING) {
      throw new BadRequestException('This request has already been handled');
    }

    request.status = FollowStatus.ACCEPTED;
    request.responded_at = new Date();
    await this.followRepo.save(request);

    const conversation = await this.ensureConversation(request.follower_id, request.following_id);

    return {
      request_id: request.id,
      status: 'accepted',
      follower: this.toUserSummary(request.follower),
      following: this.toUserSummary(request.following),
      conversation_id: conversation.id,
      message: `You and ${request.follower.first_name} can now message each other.`,
    };
  }

  // ── Decline ───────────────────────────────────────────────────────────────
  async declineRequest(userId: number, requestId: number) {
    const request = await this.followRepo.findOne({ where: { id: requestId } });
    if (!request) {
      throw new NotFoundException('Follow request not found');
    }
    if (request.following_id !== userId) {
      throw new ForbiddenException('You cannot decline this request');
    }
    if (request.status !== FollowStatus.PENDING) {
      throw new BadRequestException('This request has already been handled');
    }

    request.status = FollowStatus.DECLINED;
    request.responded_at = new Date();
    await this.followRepo.save(request);

    return { request_id: request.id, status: 'declined' };
  }

  // ── Cancel a request you sent ─────────────────────────────────────────────
  async cancelRequest(userId: number, requestId: number) {
    const request = await this.followRepo.findOne({ where: { id: requestId } });
    if (!request) {
      throw new NotFoundException('Follow request not found');
    }
    if (request.follower_id !== userId) {
      throw new ForbiddenException('You cannot cancel this request');
    }
    if (request.status !== FollowStatus.PENDING) {
      throw new BadRequestException('This request has already been handled');
    }

    await this.followRepo.remove(request);
    return { request_id: requestId, status: 'cancelled' };
  }

  // ── Unfollow ──────────────────────────────────────────────────────────────
  async unfollow(userId: number, targetUserId: number) {
    const link = await this.followRepo.findOne({
      where: { follower_id: userId, following_id: targetUserId, status: FollowStatus.ACCEPTED },
    });
    if (!link) {
      throw new NotFoundException('You are not following this user');
    }
    await this.followRepo.remove(link);
    return { user_id: targetUserId, status: 'unfollowed' };
  }

  // ── Followers / following lists ───────────────────────────────────────────
  async getFollowers(userId: number) {
    const links = await this.followRepo.find({
      where: { following_id: userId, status: FollowStatus.ACCEPTED },
      relations: ['follower'],
      order: { responded_at: 'DESC' },
    });
    return links.map((l) => this.toUserSummary(l.follower));
  }

  async getFollowing(userId: number) {
    const links = await this.followRepo.find({
      where: { follower_id: userId, status: FollowStatus.ACCEPTED },
      relations: ['following'],
      order: { responded_at: 'DESC' },
    });
    return links.map((l) => this.toUserSummary(l.following));
  }

  async getFollowCounts(userId: number) {
    const [followers, following] = await Promise.all([
      this.followRepo.count({ where: { following_id: userId, status: FollowStatus.ACCEPTED } }),
      this.followRepo.count({ where: { follower_id: userId, status: FollowStatus.ACCEPTED } }),
    ]);
    return { followers, following };
  }

  // ── Relationship between viewer and a profile owner (for UI state) ───────
  async getRelationshipStatus(viewerId: number, profileUserId: number): Promise<{
    status: RelationshipStatus;
    requestId: number | null;
  }> {
    if (viewerId === profileUserId) {
      return { status: 'self', requestId: null };
    }

    const [outgoing, incoming] = await Promise.all([
      this.followRepo.findOne({ where: { follower_id: viewerId, following_id: profileUserId } }),
      this.followRepo.findOne({ where: { follower_id: profileUserId, following_id: viewerId } }),
    ]);

    if (outgoing?.status === FollowStatus.ACCEPTED) {
      return { status: 'following', requestId: outgoing.id };
    }
    if (outgoing?.status === FollowStatus.PENDING) {
      return { status: 'request_sent', requestId: outgoing.id };
    }
    if (incoming?.status === FollowStatus.PENDING) {
      return { status: 'request_received', requestId: incoming.id };
    }

    return { status: 'none', requestId: null };
  }

  // ── Internal: reuse the existing conversation infrastructure ─────────────
  private async ensureConversation(userAId: number, userBId: number): Promise<Conversation> {
    const existing = await this.conversationRepo.findOne({
      where: [
        { user_1_id: userAId, user_2_id: userBId },
        { user_1_id: userBId, user_2_id: userAId },
      ],
    });
    if (existing) return existing;

    const [userA, userB] = await Promise.all([
      this.userRepo.findOne({ where: { id: userAId } }),
      this.userRepo.findOne({ where: { id: userBId } }),
    ]);
    // Practice in whichever language the connection has in common — default to
    // the recipient's native language since that's what the follower wants to learn.
    const languageId = userB?.preferred_language_id ?? userA?.preferred_language_id;
    if (!languageId) {
      throw new BadRequestException('Both users need a language set on their profile to start chatting');
    }

    const request = await this.convRequestRepo.save(
      this.convRequestRepo.create({
        requester_id: userAId,
        requester_language_id: languageId,
        matched_user_id: userBId,
        matched_language_id: languageId,
        requester_role: 'follow_connection',
        matched_user_role: 'follow_connection',
        status: 'accepted',
        matched_at: new Date(),
      }),
    );

    const session = await this.convSessionRepo.save(
      this.convSessionRepo.create({
        conversation_request_id: request.id,
        user_1_id: userAId,
        user_2_id: userBId,
        language_1_id: languageId,
        language_2_id: languageId,
        session_type: 'text',
        status: 'active',
        started_at: new Date(),
      }),
    );

    return this.conversationRepo.save(
      this.conversationRepo.create({
        session_id: session.id,
        user_1_id: userAId,
        user_2_id: userBId,
        language_id: languageId,
        type: ConversationType.TEXT,
        status: 'active',
      }),
    );
  }

  // ── Mappers ───────────────────────────────────────────────────────────────
  private toUserSummary(user: User) {
    return {
      id: user.id,
      name: `${user.first_name} ${user.last_name}`.trim(),
      username: user.username,
      profile_picture: user.profile_picture,
    };
  }

  private toRequestDto(request: UserFollow, otherUser?: User) {
    return {
      request_id: request.id,
      status: request.status,
      created_at: request.created_at,
      user: otherUser ? this.toUserSummary(otherUser) : null,
    };
  }
}
