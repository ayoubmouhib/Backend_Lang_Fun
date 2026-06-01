// src/matching/matching.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { ConversationRequest } from '../entities/conversation-request.entity';
import { ConversationSession } from '../entities/conversation-session.entity';
import { UserLanguageProgress } from '../user/entities/user-language-progress.entity';
import { User } from '../user/entities/user.entity';
import { UserRating } from '../entities/user-rating.entity';
import { MatchingPreference } from '../entities/matching-preference.entity';
import { CreateConversationRequestDto } from '../dto/conversation-request.dto';

interface MatchingCandidate {
  user: User;
  progress: UserLanguageProgress;
  preference: MatchingPreference | null;
  averageRating: number;
}

interface MatchingScore {
  user_id: number;
  compatibility_score: number;
  score_breakdown: {
    language_match: number;
    level_compatibility: number;
    mutual_benefit: number;
    interest_overlap: number;
    timezone_proximity: number;
    rating_score: number;
  };
}

@Injectable()
export class MatchingService {
  constructor(
    @InjectRepository(ConversationRequest)
    private conversationRequestRepo: Repository<ConversationRequest>,

    @InjectRepository(ConversationSession)
    private conversationSessionRepo: Repository<ConversationSession>,

    @InjectRepository(UserLanguageProgress)
    private progressRepo: Repository<UserLanguageProgress>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(UserRating)
    private ratingRepo: Repository<UserRating>,

    @InjectRepository(MatchingPreference)
    private matchingPrefRepo: Repository<MatchingPreference>,
  ) {}

  // 🔥 MAIN MATCHING ALGORITHM
  async findBestMatch(
    userId: number,
    languageId: number,
    requesterRole: string,
  ): Promise<MatchingScore | null> {
    console.log(`🔍 Finding match for user ${userId}, language ${languageId}`);

    // Get requester's progress
    const requesterProgress = await this.progressRepo.findOne({
      where: { user_id: userId, language_id: languageId },
      relations: ['user'],
    });

    if (!requesterProgress) {
      throw new NotFoundException('User language progress not found');
    }

    // Get requester's matching preferences
    const requesterPrefs = await this.matchingPrefRepo.findOne({
      where: { user_id: userId },
    });

    // Get blocked users
    const blockedUsers = await this.getBlockedUsers(userId);

    // 🔥 FIND ALL CANDIDATES
    const candidates = await this.getCandidates(
      userId,
      languageId,
      requesterProgress,
      requesterPrefs,
      blockedUsers,
    );

    console.log(`📊 Found ${candidates.length} candidates`);

    if (candidates.length === 0) {
      return null;
    }

    // 🔥 SCORE ALL CANDIDATES
    const scores = await Promise.all(
      candidates.map((candidate) =>
        this.calculateCompatibilityScore(
          requesterProgress,
          candidate,
          requesterRole,
          requesterPrefs,
        ),
      ),
    );

    // Sort by score (highest first)
    scores.sort((a, b) => b.compatibility_score - a.compatibility_score);

    console.log(`🏆 Top match score: ${scores[0]?.compatibility_score}`);

    return scores[0];
  }

  // 🔥 GET CANDIDATE POOL
  private async getCandidates(
    userId: number,
    languageId: number,
    requesterProgress: UserLanguageProgress,
    requesterPrefs: MatchingPreference | null,
    blockedUsers: number[],
  ): Promise<MatchingCandidate[]> {
    // Find users learning the same language
    const potentialMatches = await this.progressRepo.find({
      where: {
        language_id: languageId,
        user_id: Not(userId), // Not self
      },
      relations: ['user'],
    });

    // Filter candidates
    const candidates: MatchingCandidate[] = [];

    for (const progress of potentialMatches) {
      // Skip if blocked
      if (blockedUsers.includes(progress.user_id)) {
        continue;
      }

      // Skip if already in conversation
      const existingConversation = await this.conversationRequestRepo.findOne({
        where: {
          requester_id: userId,
          matched_user_id: progress.user_id,
          status: In(['pending', 'accepted']),
        },
      });

      if (existingConversation) {
        continue;
      }

      // Get user preferences
      const prefs = await this.matchingPrefRepo.findOne({
        where: { user_id: progress.user_id },
      });

      // Get user rating
      const rating = await this.getAverageUserRating(progress.user_id);

      candidates.push({
        user: progress.user,
        progress,
        preference: prefs,
        averageRating: rating,
      });
    }

    return candidates;
  }

  // 🔥 CALCULATE COMPATIBILITY SCORE
  private async calculateCompatibilityScore(
    requesterProgress: UserLanguageProgress,
    candidate: MatchingCandidate,
    requesterRole: string,
    requesterPrefs: MatchingPreference | null,
  ): Promise<MatchingScore> {
    const scores = {
      language_match: 100, // Always 100 (same language required)
      level_compatibility: this.calculateLevelCompatibility(
        requesterProgress,
        candidate.progress,
        requesterPrefs?.level_flexibility || 2,
      ),
      mutual_benefit: this.calculateMutualBenefit(
        requesterProgress,
        candidate.progress,
      ),
      interest_overlap: await this.calculateInterestOverlap(
        requesterProgress.user_id,
        candidate.user.id,
      ),
      timezone_proximity: this.calculateTimezoneProximity(
        requesterPrefs?.preferred_timezone,
        candidate.preference?.preferred_timezone,
      ),
      rating_score: this.normalizeRating(candidate.averageRating),
    };

    // 🔥 WEIGHTED SCORE CALCULATION
    const weights = {
      language_match: 0.3, // 30% - Most important
      level_compatibility: 0.25, // 25%
      mutual_benefit: 0.2, // 20%
      interest_overlap: 0.1, // 10%
      timezone_proximity: 0.1, // 10%
      rating_score: 0.05, // 5%
    };

    const totalScore =
      (scores.language_match * weights.language_match +
        scores.level_compatibility * weights.level_compatibility +
        scores.mutual_benefit * weights.mutual_benefit +
        scores.interest_overlap * weights.interest_overlap +
        scores.timezone_proximity * weights.timezone_proximity +
        scores.rating_score * weights.rating_score) /
      Object.values(weights).reduce((a, b) => a + b, 0);

    return {
      user_id: candidate.user.id,
      compatibility_score: parseFloat(totalScore.toFixed(2)),
      score_breakdown: scores,
    };
  }

  // 🔥 LEVEL COMPATIBILITY (40% weight)
  private calculateLevelCompatibility(
    requesterProgress: UserLanguageProgress,
    candidateProgress: UserLanguageProgress,
    levelFlexibility: number,
  ): number {
    // Convert CEFR + sub_level to numeric value
    const requesterLevel = this.cefrToNumeric(
      requesterProgress.cefr_level,
      requesterProgress.sub_level,
    );
    const candidateLevel = this.cefrToNumeric(
      candidateProgress.cefr_level,
      candidateProgress.sub_level,
    );

    // Calculate difference
    const levelDiff = Math.abs(requesterLevel - candidateLevel);
    const flexibility = levelFlexibility * 10; // Each sub-level = 10 points
    if (flexibility <= 0) {
      return levelDiff === 0 ? 100 : Math.max(0, 100 - levelDiff * 10);
    }

    // If difference is within flexibility, score decreases with distance
    if (levelDiff <= flexibility) {
      return 100 - (levelDiff / flexibility) * 30; // Max loss = 30%
    } else {
      return Math.max(0, 100 - ((levelDiff - flexibility) / flexibility) * 100);
    }
  }

  // Helper: Convert CEFR + sub_level to numeric
  private cefrToNumeric(
    cefrLevel: string | null,
    subLevel: number | null,
  ): number {
    if (!cefrLevel) {
      return 0;
    }

    const cefrMap = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
    const baseValue = cefrMap[cefrLevel] || 0;
    return baseValue * 10 + (subLevel || 1);
  }

  // 🔥 MUTUAL BENEFIT (20% weight)
  private calculateMutualBenefit(
    requesterProgress: UserLanguageProgress,
    candidateProgress: UserLanguageProgress,
  ): number {
    // Check if they're learning each other's native languages
    // This is a simplified version - in production, you'd check user.native_language

    // For now, assume mutual benefit if levels are complementary
    const requesterLevel = this.cefrToNumeric(
      requesterProgress.cefr_level,
      requesterProgress.sub_level,
    );
    const candidateLevel = this.cefrToNumeric(
      candidateProgress.cefr_level,
      candidateProgress.sub_level,
    );

    // Ideal: one is slightly higher than the other (can teach each other)
    const levelDiff = Math.abs(requesterLevel - candidateLevel);

    if (levelDiff === 0) return 70; // Same level - some benefit
    if (levelDiff <= 10) return 100; // Slight difference - good for mutual learning
    if (levelDiff <= 20) return 80; // Medium difference - still good
    return 50; // Large difference - less mutual benefit
  }

  // 🔥 INTEREST OVERLAP (15% weight)
  private async calculateInterestOverlap(
    userId1: number,
    userId2: number,
  ): Promise<number> {
    // Get both users' interests
    const user1Interests = await this.getUserInterests(userId1);
    const user2Interests = await this.getUserInterests(userId2);

    if (user1Interests.length === 0 || user2Interests.length === 0) {
      return 50; // Neutral score if missing data
    }

    // Calculate intersection
    const commonInterests = user1Interests.filter((i) =>
      user2Interests.includes(i),
    );

    const overlapPercentage =
      (commonInterests.length /
        Math.max(user1Interests.length, user2Interests.length)) *
      100;

    return Math.min(100, overlapPercentage);
  }

  // Helper: Get user interests
  private async getUserInterests(userId: number): Promise<number[]> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['interests'],
    });

    return user?.interests?.map((i) => i.id) || [];
  }

  // 🔥 TIMEZONE PROXIMITY (10% weight)
  private calculateTimezoneProximity(
    userTimezone?: string,
    candidateTimezone?: string,
  ): number {
    if (!userTimezone || !candidateTimezone) {
      return 50; // Neutral if timezone missing
    }

    // In production, calculate actual timezone offset difference
    if (userTimezone === candidateTimezone) {
      return 100; // Same timezone = perfect
    }

    // For now, simplistic calculation based on prefix
    const userRegion = userTimezone.split('/')[0];
    const candidateRegion = candidateTimezone.split('/')[0];

    if (userRegion === candidateRegion) {
      return 80; // Same region
    }

    return 50; // Different region
  }

  // Helper: Normalize rating (1-5) to 0-100
  private normalizeRating(rating: number): number {
    if (!rating) return 50; // Neutral for new users
    return (rating / 5) * 100;
  }

  // Helper: Get average user rating
  private async getAverageUserRating(userId: number): Promise<number> {
    const ratings = await this.ratingRepo.find({
      where: { rated_user_id: userId },
    });

    if (ratings.length === 0) return 0;

    const avgScore =
      ratings.reduce((sum, r) => sum + r.overall_score, 0) / ratings.length;

    return avgScore;
  }

  // Helper: Get blocked users
  private async getBlockedUsers(userId: number): Promise<number[]> {
    // TODO: Implement when BlockedUser entity is created
    return [];
  }

  // 🔥 CREATE CONVERSATION REQUEST
  async createConversationRequest(
    userId: number,
    dto: CreateConversationRequestDto,
  ) {
    console.log(`📝 Creating conversation request for user ${userId}`);

    // Find best match
    const bestMatch = await this.findBestMatch(
      userId,
      dto.requester_language_id,
      dto.requester_role,
    );

    if (!bestMatch) {
      throw new NotFoundException(
        'No suitable match found. Try again later or adjust your preferences.',
      );
    }

    // Create conversation request
    const request = this.conversationRequestRepo.create({
      requester_id: userId,
      requester_language_id: dto.requester_language_id,
      requester_role: dto.requester_role,
      matched_user_id: bestMatch.user_id,
      matched_language_id: dto.requester_language_id,
      matched_user_role: 'learner', // TODO: Determine based on algorithm
      compatibility_score: bestMatch.compatibility_score,
      score_breakdown: bestMatch.score_breakdown,
      status: 'pending',
      matched_at: new Date(),
    });

    const savedRequest = await this.conversationRequestRepo.save(request);

    return {
      request_id: savedRequest.id,
      matched_user_id: bestMatch.user_id,
      compatibility_score: bestMatch.compatibility_score,
      score_breakdown: bestMatch.score_breakdown,
      message: 'Match found! Waiting for their response...',
    };
  }

  // Get pending requests for user
  /*
  async getPendingRequests(userId: number) {
    return this.conversationRequestRepo.find({
      where: { matched_user_id: userId, status: 'pending' },
      relations: [
        'requester',
        'requester_language',
        'matched_user',
        'matched_language',
      ],
    });
  }
*/
// src/matching/matching.service.ts

async getPendingRequests(userId: number): Promise<any[]> {
  console.log(`\n🔍 Finding pending requests for user ${userId}`);

  const requests = await this.conversationRequestRepo.find({
    where: {
      matched_user_id: userId,  // 🔥 User is the MATCHED user
      status: 'pending',         // 🔥 Status must be pending
    },
    relations: ['requester', 'language'],
  });

  console.log(`✅ Found ${requests.length} pending requests for user ${userId}`);

  return requests.map((req) => ({
    request_id: req.id,
    requester: {
      id: req.requester.id,
      name: `${req.requester.first_name} ${req.requester.last_name}`,
      email: req.requester.email,
    },
    language: req.requester_language?.name || 'Unknown',
    compatibility_score: req.compatibility_score,
    score_breakdown: req.score_breakdown,
  }));
}
  // Get all conversations for user
  async getUserConversations(userId: number) {
    return this.conversationRequestRepo.find({
      where: [
        { requester_id: userId, status: 'accepted' },
        { matched_user_id: userId, status: 'accepted' },
      ],
      relations: [
        'requester',
        'matched_user',
        'requester_language',
        'matched_language',
        'conversation_session',
      ],
    });
  }
/*
  async acceptRequest(userId: number, requestId: number) {
    const request = await this.conversationRequestRepo.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Conversation request not found');
    }

    if (request.matched_user_id !== userId) {
      throw new BadRequestException(
        'You can only accept requests matched to you',
      );
    }

    if (request.status !== 'pending') {
      throw new BadRequestException(`Request is already ${request.status}`);
    }

    request.status = 'accepted';
    await this.conversationRequestRepo.save(request);

    const session = this.conversationSessionRepo.create({
      conversation_request_id: request.id,
      user_1_id: request.requester_id,
      user_2_id: request.matched_user_id,
      language_1_id: request.requester_language_id,
      language_2_id:
        request.matched_language_id ?? request.requester_language_id,
      session_type: 'text',
      status: 'waiting',
    });

    const savedSession = await this.conversationSessionRepo.save(session);

    return {
      request_id: request.id,
      session_id: savedSession.id,
      status: request.status,
      message: 'Conversation request accepted',
    };
  }
    */

  /*

  async rejectRequest(userId: number, requestId: number) {
    const request = await this.conversationRequestRepo.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Conversation request not found');
    }

    if (request.matched_user_id !== userId) {
      throw new BadRequestException(
        'You can only reject requests matched to you',
      );
    }

    if (request.status !== 'pending') {
      throw new BadRequestException(`Request is already ${request.status}`);
    }

    request.status = 'rejected';
    await this.conversationRequestRepo.save(request);

    return {
      request_id: request.id,
      status: request.status,
      message: 'Conversation request rejected',
    };
  }
    */


  // 🔥 ACCEPT CONVERSATION REQUEST
  async acceptRequest(
    userId: number,
    requestId: number,
    sessionType: string = 'text',
  ) {
    console.log(`✅ User ${userId} accepting request ${requestId}`);

    // Get request
    const request = await this.conversationRequestRepo.findOne({
      where: { id: requestId },
      relations: ['requester', 'matched_user'],
    });

    if (!request) {
      throw new NotFoundException('Conversation request not found');
    }

    // Verify the matched user is the one accepting
    if (request.matched_user_id !== userId) {
      throw new BadRequestException('You cannot accept this request');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('This request is no longer available');
    }

    // Update request status
    request.status = 'accepted';
    await this.conversationRequestRepo.save(request);

    // 🔥 CREATE CONVERSATION SESSION
    const session = await this.createConversationSession(
      request,
      sessionType,
    );

    return {
      request_id: request.id,
      session_id: session.id,
      status: 'accepted',
      requester: {
        id: request.requester.id,
        name: `${request.requester.first_name} ${request.requester.last_name}`,
        email: request.requester.email,
      },
      matched_user: {
        id: request.matched_user.id,
        name: `${request.matched_user.first_name} ${request.matched_user.last_name}`,
        email: request.matched_user.email,
      },
      session_type: sessionType,
      message: 'Match accepted! Session starting...',
    };
  }

  // 🔥 REJECT CONVERSATION REQUEST
  async rejectRequest(userId: number, requestId: number) {
    console.log(`❌ User ${userId} rejecting request ${requestId}`);

    const request = await this.conversationRequestRepo.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Conversation request not found');
    }

    if (request.matched_user_id !== userId) {
      throw new BadRequestException('You cannot reject this request');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('This request is no longer available');
    }

    // Update status
    request.status = 'rejected';
    await this.conversationRequestRepo.save(request);

    return {
      request_id: request.id,
      status: 'rejected',
      message: 'Request rejected successfully',
    };
  }

  // 🔥 CREATE CONVERSATION SESSION
  private async createConversationSession(
    request: ConversationRequest,
    sessionType: string,
  ): Promise<ConversationSession> {
    console.log(
      `🎯 Creating session between ${request.requester_id} and ${request.matched_user_id}`,
    );

    // Determine language for user 2
    // (User 2 is learning the same language as User 1)
    const user2Language = request.matched_language_id;

    // Get a language that user 2 is native in or learning
    // For now, we'll use the same language (both learning same language)
    const session = this.conversationSessionRepo.create({
      conversation_request_id: request.id,
      user_1_id: request.requester_id,
      user_2_id: request.matched_user_id,
      language_1_id: request.requester_language_id, // User 1 learning
      language_2_id: user2Language, // User 2 learning
      session_type: sessionType,
      status: 'waiting', // Waiting for both to be ready
    });

    const savedSession = await this.conversationSessionRepo.save(session);

    // Award XP for accepting
    await this.awardXPForAction(request.matched_user_id, 20, 'accepted_match');

    return savedSession;
  }

  // 🔥 START CONVERSATION SESSION
  async startSession(userId: number, sessionId: number) {
    console.log(`🚀 Starting session ${sessionId}`);

    const session = await this.conversationSessionRepo.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Verify user is part of this session
    if (session.user_1_id !== userId && session.user_2_id !== userId) {
      throw new BadRequestException('You are not part of this session');
    }

    if (session.status !== 'waiting') {
      throw new BadRequestException('This session has already started');
    }

    session.status = 'active';
    session.started_at = new Date();

    await this.conversationSessionRepo.save(session);

    return {
      session_id: session.id,
      status: 'active',
      started_at: session.started_at,
      message: 'Conversation started!',
    };
  }

  // 🔥 END CONVERSATION SESSION
  async endSession(userId: number, sessionId: number) {
    console.log(`🏁 Ending session ${sessionId}`);

    const session = await this.conversationSessionRepo.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.user_1_id !== userId && session.user_2_id !== userId) {
      throw new BadRequestException('You are not part of this session');
    }

    session.status = 'completed';
    session.ended_at = new Date();

    // Calculate duration
    if (session.started_at) {
      const durationMs =
        session.ended_at.getTime() - session.started_at.getTime();
      session.duration_seconds = Math.floor(durationMs / 1000);
    }

    await this.conversationSessionRepo.save(session);

    // Award XP for conversation
    const xpEarned = Math.ceil(session.duration_seconds / 60) * 5; // 5 XP per minute
    await this.awardXPForAction(
      userId,
      Math.min(xpEarned, 200),
      'conversation_completed',
    );

    return {
      session_id: session.id,
      status: 'completed',
      duration_minutes: Math.floor(session.duration_seconds / 60),
      xp_earned: Math.min(xpEarned, 200),
      message: 'Conversation ended. Great job!',
    };
  }

  // 🔥 RATE USER AFTER CONVERSATION
  async rateUser(
    raterUserId: number,
    sessionId: number,
    ratingData: {
      communication_score: number;
      helpfulness_score: number;
      patience_score: number;
      overall_score: number;
      comment?: string;
    },
  ) {
    console.log(`⭐ Scoring session ${sessionId}`);

    const session = await this.conversationSessionRepo.findOne({
      where: { id: sessionId },
      relations: ['conversation_request'],
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Determine who is being rated
    let ratedUserId: number;
    if (session.user_1_id === raterUserId) {
      ratedUserId = session.user_2_id;
    } else if (session.user_2_id === raterUserId) {
      ratedUserId = session.user_1_id;
    } else {
      throw new BadRequestException('You are not part of this session');
    }

    // Check if already rated
    const existingRating = await this.ratingRepo.findOne({
      where: {
        conversation_session_id: sessionId,
        rater_id: raterUserId,
      },
    });

    if (existingRating) {
      throw new BadRequestException('You have already rated this session');
    }

    // Create rating
    const rating = this.ratingRepo.create({
      conversation_session_id: sessionId,
      rater_id: raterUserId,
      rated_user_id: ratedUserId,
      communication_score: ratingData.communication_score,
      helpfulness_score: ratingData.helpfulness_score,
      patience_score: ratingData.patience_score,
      overall_score: ratingData.overall_score,
      comment: ratingData.comment,
    });

    await this.ratingRepo.save(rating);

    // Award bonus XP for rating
    await this.awardXPForAction(raterUserId, 10, 'left_rating');

    return {
      rating_id: rating.id,
      rated_user_id: ratedUserId,
      overall_score: ratingData.overall_score,
      message: 'Thank you for rating!',
    };
  }

  // 🔥 GET SESSION DETAILS
  async getSessionDetails(userId: number, sessionId: number) {
    const session = await this.conversationSessionRepo.findOne({
      where: { id: sessionId },
      relations: [
        'conversation_request',
        'user_1',
        'user_2',
        'language_1',
        'language_2',
      ],
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.user_1_id !== userId && session.user_2_id !== userId) {
      throw new BadRequestException('You are not part of this session');
    }

    // Get other user details
    const otherUserId =
      session.user_1_id === userId ? session.user_2_id : session.user_1_id;
    const otherUser = await this.userRepo.findOne({
      where: { id: otherUserId },
    });

    // Get rating if exists
    const rating = await this.ratingRepo.findOne({
      where: {
        conversation_session_id: sessionId,
        rated_user_id: otherUserId,
      },
    });

    return {
      session_id: session.id,
      status: session.status,
      session_type: session.session_type,
      started_at: session.started_at,
      ended_at: session.ended_at,
      duration_minutes: session.duration_seconds
        ? Math.floor(session.duration_seconds / 60)
        : null,
      other_user: {
        id: otherUser!.id,
        name: `${otherUser!.first_name} ${otherUser!.last_name}`,
        email: otherUser!.email,
      },
      language_1: session.language_1.name,
      language_2: session.language_2.name,
      rating: rating || null,
    };
  }

  // 🔥 CANCEL CONVERSATION REQUEST
  async cancelRequest(userId: number, requestId: number) {
    console.log(`🚫 Canceling request ${requestId}`);

    const request = await this.conversationRequestRepo.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.requester_id !== userId) {
      throw new BadRequestException('You cannot cancel this request');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('This request cannot be cancelled');
    }

    request.status = 'expired';
    await this.conversationRequestRepo.save(request);

    return {
      request_id: request.id,
      status: 'expired',
      message: 'Request cancelled',
    };
  }

  // Helper: Award XP
  private async awardXPForAction(
    userId: number,
    xp: number,
    action: string,
  ) {
    try {
      // TODO: Update user XP in user_language_progress table
      console.log(`🎁 Awarded ${xp} XP to user ${userId} for ${action}`);
    } catch (error) {
      console.error('Error awarding XP:', error);
    }
  }

  // Get user's conversation history
  async getConversationHistory(userId: number) {
    const sessions = await this.conversationSessionRepo.find({
      where: [
        { user_1_id: userId },
        { user_2_id: userId },
      ],
      relations: ['user_1', 'user_2', 'language_1', 'language_2'],
      order: { created_at: 'DESC' },
    });

    return sessions.map((session) => {
      const otherUserId =
        session.user_1_id === userId ? session.user_2_id : session.user_1_id;
      const otherUser =
        session.user_1_id === userId ? session.user_2 : session.user_1;

      return {
        session_id: session.id,
        partner: {
          id: otherUser.id,
          name: `${otherUser.first_name} ${otherUser.last_name}`,
        },
        language: session.language_1.name,
        duration_minutes: session.duration_seconds
          ? Math.floor(session.duration_seconds / 60)
          : null,
        status: session.status,
        started_at: session.started_at,
        completed_at: session.ended_at,
      };
    });
  }

  // Get user's active conversations
  async getActiveConversations(userId: number) {
    const sessions = await this.conversationSessionRepo.find({
      where: [
        { user_1_id: userId, status: In(['waiting', 'active']) },
        { user_2_id: userId, status: In(['waiting', 'active']) },
      ],
      relations: ['user_1', 'user_2', 'language_1', 'language_2'],
      order: { created_at: 'DESC' },
    });

    return sessions.map((session) => {
      const otherUser =
        session.user_1_id === userId ? session.user_2 : session.user_1;

      return {
        session_id: session.id,
        partner: {
          id: otherUser.id,
          name: `${otherUser.first_name} ${otherUser.last_name}`,
          email: otherUser.email,
        },
        language: session.language_1.name,
        session_type: session.session_type,
        status: session.status,
        started_at: session.started_at,
        duration_minutes: session.started_at
          ? Math.floor(
              (new Date().getTime() - session.started_at.getTime()) / 60000,
            )
          : 0,
      };
    });
  }
}
