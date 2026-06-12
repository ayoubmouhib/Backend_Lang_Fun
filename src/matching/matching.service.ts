// src/matching/matching.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { ConversationRequest } from './entities/conversation-request.entity';
import { ConversationSession } from './entities/conversation-session.entity';
import { UserLanguageProgress } from '../user/entities/user-language-progress.entity';
import { User } from '../user/entities/user.entity';
import { UserRating } from './entities/user-rating.entity';
import { MatchingPreference } from './entities/matching-preference.entity';
import { CreateConversationRequestDto } from '../dto/conversation-request.dto';
import { BlockedUserService } from './services/blocked-user.service';
import { Conversation, ConversationType } from '../conversation/entities/conversation.entity';
import { AppGateway } from '../gateway/app.gateway';

interface MatchingCandidate {
  user: User;
  targetLanguageProgress: UserLanguageProgress;
  exchangeLanguageProgress: UserLanguageProgress;
  preference: MatchingPreference | null;
  averageRating: number;
  source: 'active_request' | 'reciprocal_profile';
  activeRequest?: ConversationRequest;
}

interface MatchingScore {
  user_id: number;
  matched_language_id: number;
  matched_user_role: string;
  source: 'active_request' | 'reciprocal_profile';
  active_request_id?: number;
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

    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,

    private blockedUserService: BlockedUserService,
    private gateway: AppGateway,
  ) {}

  // 🔥 MAIN MATCHING ALGORITHM
  async findBestMatch(
    userId: number,
    languageId: number,
    requesterRole: string,
  ): Promise<MatchingScore | null> {
    console.log(
      `🔍 Finding exchange match for user ${userId}, target language ${languageId}`,
    );

    const requesterLearningProgress = await this.progressRepo.findOne({
      where: { user_id: userId, language_id: languageId },
      relations: ['user'],
    });

    if (!requesterLearningProgress) {
      throw new NotFoundException('Learning language progress not found');
    }

    const requesterExchangeProgress =
      await this.findBestExchangeLanguageForUser(userId, languageId);

    if (!requesterExchangeProgress) {
      throw new BadRequestException(
        'Add at least one native or fluent language before searching for an exchange partner.',
      );
    }

    const requesterPrefs = await this.matchingPrefRepo.findOne({
      where: { user_id: userId },
    });

    const blockedUsers = await this.getBlockedUsers(userId);

    const candidates = await this.getCandidates(
      userId,
      languageId,
      requesterLearningProgress,
      requesterExchangeProgress.language_id,
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
          requesterLearningProgress,
          requesterExchangeProgress,
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
    targetLanguageId: number,
    requesterLearningProgress: UserLanguageProgress,
    requesterExchangeLanguageId: number,
    requesterPrefs: MatchingPreference | null,
    blockedUsers: number[],
  ): Promise<MatchingCandidate[]> {
    const activeSearchCandidates = await this.getActiveSearchCandidates(
      userId,
      targetLanguageId,
      requesterExchangeLanguageId,
      blockedUsers,
    );

    const targetSpeakers = await this.progressRepo.find({
      where: {
        language_id: targetLanguageId,
        user_id: Not(userId),
        user_type: In(['native', 'fluent']),
      },
      relations: ['user'],
    });

    const candidates: MatchingCandidate[] = [];

    for (const targetProgress of targetSpeakers) {
      if (blockedUsers.includes(targetProgress.user_id)) {
        continue;
      }

      if (
        activeSearchCandidates.some(
          (candidate) => candidate.user.id === targetProgress.user_id,
        )
      ) {
        continue;
      }

      const hasActiveRequest = await this.hasReciprocalPendingRequest(
        targetProgress.user_id,
        userId,
        requesterExchangeLanguageId,
        targetLanguageId,
      );

      if (
        !hasActiveRequest &&
        (await this.hasOpenConversationBetween(userId, targetProgress.user_id))
      ) {
        continue;
      }

      const exchangeProgress = await this.progressRepo.findOne({
        where: {
          user_id: targetProgress.user_id,
          language_id: requesterExchangeLanguageId,
          user_type: 'learning',
        },
      });

      if (!exchangeProgress) {
        continue;
      }

      const prefs = await this.matchingPrefRepo.findOne({
        where: { user_id: targetProgress.user_id },
      });
      const rating = await this.getAverageUserRating(targetProgress.user_id);

      candidates.push({
        user: targetProgress.user,
        targetLanguageProgress: targetProgress,
        exchangeLanguageProgress: exchangeProgress,
        preference: prefs,
        averageRating: rating,
        source: hasActiveRequest ? 'active_request' : 'reciprocal_profile',
      });
    }

    return [...activeSearchCandidates, ...candidates];
  }

  // 🔥 CALCULATE COMPATIBILITY SCORE
  private async calculateCompatibilityScore(
    requesterLearningProgress: UserLanguageProgress,
    requesterExchangeProgress: UserLanguageProgress,
    candidate: MatchingCandidate,
    requesterRole: string,
    requesterPrefs: MatchingPreference | null,
  ): Promise<MatchingScore> {
    const scores = {
      language_match: candidate.source === 'active_request' ? 100 : 90,
      level_compatibility: this.calculateLevelCompatibility(
        requesterLearningProgress,
        candidate.exchangeLanguageProgress,
        requesterPrefs?.level_flexibility || 2,
      ),
      mutual_benefit: this.calculateMutualBenefit(
        requesterLearningProgress,
        requesterExchangeProgress,
        candidate.targetLanguageProgress,
        candidate.exchangeLanguageProgress,
      ),
      interest_overlap: await this.calculateInterestOverlap(
        requesterLearningProgress.user_id,
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
      language_match: 0.35,
      level_compatibility: 0.2,
      mutual_benefit: 0.25,
      interest_overlap: 0.08,
      timezone_proximity: 0.07,
      rating_score: 0.05,
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
      matched_language_id: requesterExchangeProgress.language_id,
      matched_user_role: 'learner',
      source: candidate.source,
      active_request_id: candidate.activeRequest?.id,
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
    requesterLearningProgress: UserLanguageProgress,
    requesterExchangeProgress: UserLanguageProgress,
    candidateTargetProgress: UserLanguageProgress,
    candidateExchangeProgress: UserLanguageProgress,
  ): number {
    const requesterCanTeach =
      requesterExchangeProgress.user_type === 'native' ||
      requesterExchangeProgress.user_type === 'fluent';
    const candidateCanTeach =
      candidateTargetProgress.user_type === 'native' ||
      candidateTargetProgress.user_type === 'fluent';

    const requesterLevel = this.cefrToNumeric(
      requesterLearningProgress.cefr_level,
      requesterLearningProgress.sub_level,
    );
    const candidateLevel = this.cefrToNumeric(
      candidateExchangeProgress.cefr_level,
      candidateExchangeProgress.sub_level,
    );

    const levelDiff = Math.abs(requesterLevel - candidateLevel);
    const reciprocalBonus = requesterCanTeach && candidateCanTeach ? 40 : 0;

    if (levelDiff === 0) return Math.min(100, 55 + reciprocalBonus);
    if (levelDiff <= 10) return Math.min(100, 60 + reciprocalBonus);
    if (levelDiff <= 20) return Math.min(100, 45 + reciprocalBonus);
    return Math.min(100, 30 + reciprocalBonus);
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

  private async findBestExchangeLanguageForUser(
    userId: number,
    targetLanguageId: number,
  ): Promise<UserLanguageProgress | null> {
    const offeredLanguages = await this.progressRepo.find({
      where: {
        user_id: userId,
        user_type: In(['native', 'fluent']),
      },
    });

    const differentLanguage = offeredLanguages.find(
      (progress) => progress.language_id !== targetLanguageId,
    );

    if (differentLanguage) {
      return differentLanguage;
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (
      !user?.preferred_language_id ||
      user.preferred_language_id === targetLanguageId
    ) {
      return null;
    }

    return this.progressRepo.findOne({
      where: {
        user_id: userId,
        language_id: user.preferred_language_id,
      },
    });
  }

  private async getActiveSearchCandidates(
    userId: number,
    targetLanguageId: number,
    requesterExchangeLanguageId: number,
    blockedUsers: number[],
  ): Promise<MatchingCandidate[]> {
    const now = new Date();
    const activeSearches = await this.conversationRequestRepo
      .createQueryBuilder('cr')
      .leftJoinAndSelect('cr.requester', 'requester')
      .where('cr.requester_id != :userId', { userId })
      .andWhere('cr.requester_language_id = :exchangeLangId', { exchangeLangId: requesterExchangeLanguageId })
      .andWhere('cr.matched_language_id = :targetLangId', { targetLangId: targetLanguageId })
      .andWhere('cr.status = :status', { status: 'searching' })
      .andWhere('(cr.active_search_timeout IS NULL OR cr.active_search_timeout > :now)', { now })
      .orderBy('cr.created_at', 'ASC')
      .getMany();

    const candidates: MatchingCandidate[] = [];

    for (const search of activeSearches) {
      if (blockedUsers.includes(search.requester_id)) {
        continue;
      }

      if (await this.hasOpenConversationBetween(userId, search.requester_id)) {
        continue;
      }

      const targetProgress = await this.progressRepo.findOne({
        where: {
          user_id: search.requester_id,
          language_id: targetLanguageId,
          user_type: In(['native', 'fluent']),
        },
        relations: ['user'],
      });

      const exchangeProgress = await this.progressRepo.findOne({
        where: {
          user_id: search.requester_id,
          language_id: requesterExchangeLanguageId,
          user_type: 'learning',
        },
      });

      if (!targetProgress || !exchangeProgress) {
        continue;
      }

      const prefs = await this.matchingPrefRepo.findOne({
        where: { user_id: search.requester_id },
      });
      const rating = await this.getAverageUserRating(search.requester_id);

      candidates.push({
        user: search.requester ?? targetProgress.user,
        targetLanguageProgress: targetProgress,
        exchangeLanguageProgress: exchangeProgress,
        preference: prefs,
        averageRating: rating,
        source: 'active_request',
        activeRequest: search,
      });
    }

    return candidates;
  }

  private async hasOpenConversationBetween(
    userId: number,
    candidateUserId: number,
  ): Promise<boolean> {
    const existingConversation = await this.conversationRequestRepo.findOne({
      where: [
        {
          requester_id: userId,
          matched_user_id: candidateUserId,
          status: In(['pending', 'accepted', 'searching']),
        },
        {
          requester_id: candidateUserId,
          matched_user_id: userId,
          status: In(['pending', 'accepted', 'searching']),
        },
      ],
    });

    return Boolean(existingConversation);
  }

  private async hasReciprocalPendingRequest(
    requesterId: number,
    matchedUserId: number,
    requesterTargetLanguageId: number,
    matchedTargetLanguageId: number,
  ): Promise<boolean> {
    const request = await this.conversationRequestRepo.findOne({
      where: {
        requester_id: requesterId,
        matched_user_id: matchedUserId,
        requester_language_id: requesterTargetLanguageId,
        matched_language_id: matchedTargetLanguageId,
        status: 'pending',
      },
    });

    return Boolean(request);
  }

  // Helper: Get blocked users
  private async getBlockedUsers(userId: number): Promise<number[]> {
     const blockedUsers = await this.blockedUserService.getBlockedUserIds(userId);
  console.log(`🚫 User ${userId} has blocked ${blockedUsers.length} users`);
  return blockedUsers;
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
      return this.createOpenSearchRequest(
        userId,
        dto.requester_language_id,
        dto.requester_role,
      );
    }

    if (bestMatch.source === 'active_request' && bestMatch.active_request_id) {
      return this.claimActiveSearchRequest(userId, bestMatch);
    }

    // Create conversation request
    const request = this.conversationRequestRepo.create({
      requester_id: userId,
      requester_language_id: dto.requester_language_id,
      requester_role: dto.requester_role,
      matched_user_id: bestMatch.user_id,
      matched_language_id: bestMatch.matched_language_id,
      matched_user_role: bestMatch.matched_user_role,
      compatibility_score: bestMatch.compatibility_score,
      score_breakdown: bestMatch.score_breakdown,
      status: 'pending',
      matched_at: new Date(),
    });

    const savedRequest = await this.conversationRequestRepo.save(request);

    return {
      request_id: savedRequest.id,
      matched_user_id: bestMatch.user_id,
      matched_language_id: bestMatch.matched_language_id,
      match_source: bestMatch.source,
      compatibility_score: bestMatch.compatibility_score,
      score_breakdown: bestMatch.score_breakdown,
      message:
        bestMatch.source === 'active_request'
          ? 'Reciprocal match found! Waiting for confirmation...'
          : 'Exchange partner found! Waiting for their response...',
    };
  }

  private async createOpenSearchRequest(
    userId: number,
    targetLanguageId: number,
    requesterRole: string,
    isActiveSearch: boolean = false,
    timeoutSeconds: number = 600,
  ) {
    const requesterExchangeProgress =
      await this.findBestExchangeLanguageForUser(userId, targetLanguageId);

    if (!requesterExchangeProgress) {
      throw new BadRequestException(
        'Add at least one native or fluent language before searching for an exchange partner.',
      );
    }

    const existingSearch = await this.conversationRequestRepo.findOne({
      where: {
        requester_id: userId,
        requester_language_id: targetLanguageId,
        matched_language_id: requesterExchangeProgress.language_id,
        status: 'searching',
      },
    });

    if (existingSearch) {
      const timeoutIn = existingSearch.active_search_timeout
        ? Math.max(0, Math.floor((existingSearch.active_search_timeout.getTime() - Date.now()) / 1000))
        : null;

      return {
        request_id: existingSearch.id,
        status: 'searching',
        requester_language_id: targetLanguageId,
        matched_language_id: requesterExchangeProgress.language_id,
        message: 'Search already active. Waiting for a reciprocal partner...',
        search_timeout_in: timeoutIn,
      };
    }

    const timeoutAt = isActiveSearch
      ? new Date(Date.now() + timeoutSeconds * 1000)
      : null;

    const request = this.conversationRequestRepo.create({
      requester_id: userId,
      requester_language_id: targetLanguageId,
      requester_role: requesterRole,
      matched_language_id: requesterExchangeProgress.language_id,
      matched_user_role: 'learner',
      status: 'searching',
      is_active_search: isActiveSearch,
      active_search_timeout: timeoutAt,
    });

    const savedRequest = await this.conversationRequestRepo.save(request);

    return {
      request_id: savedRequest.id,
      status: 'searching',
      requester_language_id: targetLanguageId,
      matched_language_id: requesterExchangeProgress.language_id,
      message: isActiveSearch
        ? 'Looking for your perfect match...'
        : 'No partner is available yet. Your search is active.',
      estimated_wait: isActiveSearch ? 'Users are matched within 1-5 minutes' : null,
      search_timeout_in: isActiveSearch ? timeoutSeconds : null,
    };
  }

  private async claimActiveSearchRequest(
    userId: number,
    bestMatch: MatchingScore,
  ) {
    const activeRequest = await this.conversationRequestRepo.findOne({
      where: { id: bestMatch.active_request_id, status: 'searching' },
      relations: ['requester'],
    });

    if (!activeRequest) {
      throw new NotFoundException('Active search is no longer available');
    }

    // Case 0: both users are actively searching — create session immediately
    activeRequest.matched_user_id = userId;
    activeRequest.matched_user_role = 'learner';
    activeRequest.status = 'matched';
    activeRequest.compatibility_score = bestMatch.compatibility_score;
    activeRequest.score_breakdown = bestMatch.score_breakdown;
    activeRequest.matched_at = new Date();
    await this.conversationRequestRepo.save(activeRequest);

    const session = await this.createConversationSession(activeRequest, 'text');

    return {
      status: 'matched',
      session_id: session.id,
      matched_user: {
        id: bestMatch.user_id,
        name: `${activeRequest.requester.first_name} ${activeRequest.requester.last_name}`,
      },
      matched_language_id: bestMatch.matched_language_id,
      compatibility_score: bestMatch.compatibility_score,
      score_breakdown: bestMatch.score_breakdown,
      message: 'Match found! Your conversation session has started.',
      can_start_messaging: true,
    };
  }

  async getPendingRequests(userId: number): Promise<any[]> {
    console.log(`\n🔍 Finding pending requests for user ${userId}`);

    const [received, sent] = await Promise.all([
      // Requests others sent TO this user
      this.conversationRequestRepo.find({
        where: { matched_user_id: userId, status: 'pending' },
        relations: ['requester', 'requester_language', 'matched_language'],
      }),
      // Requests THIS user sent that are still pending
      this.conversationRequestRepo.find({
        where: { requester_id: userId, status: 'pending' },
        relations: ['matched_user', 'requester_language', 'matched_language'],
      }),
    ]);

    console.log(`✅ Found ${received.length} incoming, ${sent.length} sent pending requests for user ${userId}`);

    const incoming = received.map((req) => ({
      request_id: req.id,
      is_sender: false,
      requester: {
        id: req.requester.id,
        name: `${req.requester.first_name} ${req.requester.last_name}`,
        email: req.requester.email,
      },
      requester_language: req.requester_language?.name || 'Unknown',
      matched_language: req.matched_language?.name || 'Unknown',
      compatibility_score: req.compatibility_score,
      score_breakdown: req.score_breakdown,
    }));

    const outgoing = sent.map((req) => ({
      request_id: req.id,
      is_sender: true,
      requester: {
        id: req.matched_user?.id ?? 0,
        name: req.matched_user
          ? `${req.matched_user.first_name} ${req.matched_user.last_name}`
          : 'Partner',
        email: req.matched_user?.email ?? '',
      },
      requester_language: req.requester_language?.name || 'Unknown',
      matched_language: req.matched_language?.name || 'Unknown',
      compatibility_score: req.compatibility_score,
      score_breakdown: req.score_breakdown,
    }));

    return [...incoming, ...outgoing];
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
      ],
    });
  }
  // 🔥 ACCEPT CONVERSATION REQUEST
  async acceptRequest(
    userId: number,
    requestId: number,
    sessionType: string = 'text',
    plannedDurationMinutes?: number,
  ) {
    console.log(`✅ User ${userId} accepting request ${requestId}`);

    const request = await this.conversationRequestRepo.findOne({
      where: { id: requestId },
      relations: ['requester', 'matched_user'],
    });

    if (!request) {
      throw new NotFoundException('Conversation request not found');
    }

    if (request.matched_user_id !== userId) {
      throw new BadRequestException('You cannot accept this request');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('This request is no longer available');
    }

    request.status = 'accepted';
    await this.conversationRequestRepo.save(request);

    const session = await this.createConversationSession(request, sessionType, plannedDurationMinutes);

    // Notify the requester (User A) that their request was accepted
    const accepterName = `${request.matched_user.first_name} ${request.matched_user.last_name}`;
    this.gateway.sendToUser(request.requester_id, 'session_accepted', {
      session_id: session.id,
      planned_duration_minutes: plannedDurationMinutes ?? null,
      partner: {
        id: request.matched_user_id,
        name: accepterName,
      },
      session_type: sessionType,
    });

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
        name: accepterName,
        email: request.matched_user.email,
      },
      session_type: sessionType,
      planned_duration_minutes: plannedDurationMinutes ?? null,
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
    plannedDurationMinutes?: number,
  ): Promise<ConversationSession> {
    console.log(
      `🎯 Creating session between ${request.requester_id} and ${request.matched_user_id}`,
    );

    const user2Language = request.matched_language_id;

    const session = this.conversationSessionRepo.create({
      conversation_request_id: request.id,
      user_1_id: request.requester_id,
      user_2_id: request.matched_user_id,
      language_1_id: request.requester_language_id,
      language_2_id: user2Language,
      session_type: sessionType,
      status: 'waiting',
      ...(plannedDurationMinutes ? { planned_duration_minutes: plannedDurationMinutes } : {}),
    });

    const savedSession = await this.conversationSessionRepo.save(session);

    // Create the Conversation record so the messaging layer can find it
    const conversation = this.conversationRepo.create({
      session_id: savedSession.id,
      user_1_id: request.requester_id,
      user_2_id: request.matched_user_id,
      language_id: request.requester_language_id,
      type: (sessionType as ConversationType) ?? ConversationType.TEXT,
      status: 'active',
    });
    await this.conversationRepo.save(conversation);

    // Award XP for accepting (matched_user practices matched_language_id in this session)
    await this.awardXPForAction(request.matched_user_id, request.matched_language_id, 20, 'accepted_match');

    return savedSession;
  }

  // 🔥 START CONVERSATION SESSION
  async startSession(userId: number, sessionId: number, plannedDurationMinutes?: number) {
    console.log(`🚀 Starting session ${sessionId}`);

    const session = await this.conversationSessionRepo.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.user_1_id !== userId && session.user_2_id !== userId) {
      throw new BadRequestException('You are not part of this session');
    }

    // Idempotent: if already active, return current state so both users can call safely
    if (session.status === 'active') {
      return {
        session_id: session.id,
        status: 'active',
        started_at: session.started_at,
        planned_duration_minutes: session.planned_duration_minutes,
        message: 'Session already active',
      };
    }

    if (session.status !== 'waiting') {
      throw new BadRequestException('This session cannot be started');
    }

    session.status = 'active';
    session.started_at = new Date();
    if (plannedDurationMinutes) {
      session.planned_duration_minutes = plannedDurationMinutes;
    }

    await this.conversationSessionRepo.save(session);

    return {
      session_id: session.id,
      status: 'active',
      started_at: session.started_at,
      planned_duration_minutes: session.planned_duration_minutes,
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

    // Award XP for conversation (5 XP per minute, capped at 200)
    const xpEarned = Math.min(Math.ceil(session.duration_seconds / 60) * 5, 200);
    await this.awardXPForAction(
      userId,
      this.sessionLanguageIdForUser(session, userId),
      xpEarned,
      'conversation_completed',
    );

    return {
      session_id: session.id,
      status: 'completed',
      duration_minutes: Math.floor(session.duration_seconds / 60),
      xp_earned: xpEarned,
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

    // Award bonus XP for leaving a rating
    const xpEarned = 10;
    await this.awardXPForAction(
      raterUserId,
      this.sessionLanguageIdForUser(session, raterUserId),
      xpEarned,
      'left_rating',
    );

    return {
      rating_id: rating.id,
      rated_user_id: ratedUserId,
      overall_score: ratingData.overall_score,
      xp_earned: xpEarned,
      message: 'Thank you for rating!',
    };
  }

  // 🔥 GET RATINGS RECEIVED BY A USER (for the "My Reviews" screen)
  async getUserRatings(userId: number, limit = 50, offset = 0) {
    const [ratings, total] = await this.ratingRepo.findAndCount({
      where: { rated_user_id: userId },
      relations: ['rater'],
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset,
    });

    const average =
      ratings.length === 0
        ? 0
        : ratings.reduce((sum, r) => sum + r.overall_score, 0) / ratings.length;

    return {
      total,
      limit,
      offset,
      average_rating: Math.round(average * 10) / 10,
      reviews: ratings.map((r) => ({
        id: r.id,
        rater: r.rater
          ? { id: r.rater.id, name: `${r.rater.first_name} ${r.rater.last_name}`.trim() }
          : null,
        overall_score: r.overall_score,
        communication_score: r.communication_score,
        helpfulness_score: r.helpfulness_score,
        patience_score: r.patience_score,
        comment: r.comment ?? null,
        created_at: r.created_at,
      })),
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

  // 🔥 CANCEL CONVERSATION REQUEST (or active search)
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

    if (!['pending', 'searching'].includes(request.status)) {
      throw new BadRequestException('This request cannot be cancelled');
    }

    request.status = 'expired';
    request.expired_at = new Date();
    await this.conversationRequestRepo.save(request);

    return {
      request_id: request.id,
      status: 'expired',
      message: 'Request cancelled',
    };
  }

  // 🔥 CASE 0: ACTIVE SEARCH — checks the live pool first, creates session instantly on match
  async initiateActiveSearch(userId: number, languageId: number, timeoutSeconds: number = 600) {
    // Reject if user already has an active session
    const activeSession = await this.conversationSessionRepo.findOne({
      where: [
        { user_1_id: userId, status: In(['waiting', 'active']) },
        { user_2_id: userId, status: In(['waiting', 'active']) },
      ],
    });

    if (activeSession) {
      throw new BadRequestException('You already have an active conversation session');
    }

    const blockedUsers = await this.getBlockedUsers(userId);

    const requesterExchangeProgress = await this.findBestExchangeLanguageForUser(userId, languageId);

    if (!requesterExchangeProgress) {
      throw new BadRequestException(
        'Add at least one native or fluent language before searching for an exchange partner.',
      );
    }

    // Only scan the active search pool (not passive profiles — those users haven't indicated readiness)
    const activePoolCandidates = await this.getActiveSearchCandidates(
      userId,
      languageId,
      requesterExchangeProgress.language_id,
      blockedUsers,
    );

    if (activePoolCandidates.length === 0) {
      // No one in the pool yet — add this user and wait
      return this.createOpenSearchRequest(userId, languageId, 'learner', true, timeoutSeconds);
    }

    const requesterLearningProgress = await this.progressRepo.findOne({
      where: { user_id: userId, language_id: languageId },
      relations: ['user'],
    });

    if (!requesterLearningProgress) {
      throw new NotFoundException('Learning language progress not found');
    }

    const requesterPrefs = await this.matchingPrefRepo.findOne({ where: { user_id: userId } });

    const scores = await Promise.all(
      activePoolCandidates.map((candidate) =>
        this.calculateCompatibilityScore(
          requesterLearningProgress,
          requesterExchangeProgress,
          candidate,
          'learner',
          requesterPrefs,
        ),
      ),
    );

    scores.sort((a, b) => b.compatibility_score - a.compatibility_score);
    const bestMatch = scores[0];

    if (bestMatch.active_request_id) {
      return this.claimActiveSearchRequest(userId, bestMatch);
    }

    // Fallback: no claimable request found, add to pool
    return this.createOpenSearchRequest(userId, languageId, 'learner', true, timeoutSeconds);
  }

  // 🔥 POLL SEARCH STATUS — for User A to check if they were matched while waiting
  async getSearchStatus(userId: number, requestId: number) {
    const request = await this.conversationRequestRepo.findOne({
      where: { id: requestId, requester_id: userId },
    });

    if (!request) {
      throw new NotFoundException('Search request not found');
    }

    // Auto-expire if timeout has passed
    if (
      request.status === 'searching' &&
      request.active_search_timeout &&
      request.active_search_timeout < new Date()
    ) {
      request.status = 'expired';
      request.expired_at = new Date();
      await this.conversationRequestRepo.save(request);

      return { status: 'expired', request_id: requestId, message: 'Search timed out. Please try again.' };
    }

    if (request.status === 'matched') {
      const session = await this.conversationSessionRepo.findOne({
        where: { conversation_request_id: requestId },
        relations: ['user_1', 'user_2'],
      });

      const matchedUser = session?.user_1_id === userId ? session?.user_2 : session?.user_1;

      return {
        status: 'matched',
        request_id: requestId,
        session_id: session?.id ?? null,
        matched_user: matchedUser
          ? { id: matchedUser.id, name: `${matchedUser.first_name} ${matchedUser.last_name}` }
          : null,
        message: 'Match found! Your conversation session has started.',
        can_start_messaging: true,
      };
    }

    const timeoutIn = request.active_search_timeout
      ? Math.max(0, Math.floor((request.active_search_timeout.getTime() - Date.now()) / 1000))
      : null;

    return {
      status: request.status,
      request_id: requestId,
      message: 'Still searching for your match...',
      search_timeout_in: timeoutIn,
    };
  }

  // 🔥 Award XP — persists to user_language_progress (xp, conversation count, streak)
  private async awardXPForAction(
    userId: number,
    languageId: number,
    xp: number,
    action: 'accepted_match' | 'conversation_completed' | 'left_rating',
  ): Promise<void> {
    const progress = await this.progressRepo.findOne({
      where: { user_id: userId, language_id: languageId },
    });

    if (!progress) {
      console.warn(`⚠️ No language progress for user ${userId} / language ${languageId} — XP not awarded`);
      return;
    }

    progress.xp_points += xp;

    if (action === 'conversation_completed') {
      progress.conversation_count += 1;
      this.bumpStreak(progress);
    }

    await this.progressRepo.save(progress);
    console.log(`🎁 Awarded ${xp} XP to user ${userId} (language ${languageId}) for ${action}`);
  }

  // Helper: advance the daily streak counter at most once per calendar day
  private bumpStreak(progress: UserLanguageProgress): void {
    const todayStr = new Date().toISOString().slice(0, 10);
    const lastStr = progress.last_activity_date
      ? new Date(progress.last_activity_date).toISOString().slice(0, 10)
      : null;

    if (lastStr === todayStr) return; // already counted today

    const yesterdayStr = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    progress.current_streak_days = lastStr === yesterdayStr ? progress.current_streak_days + 1 : 1;
    progress.longest_streak_days = Math.max(progress.longest_streak_days, progress.current_streak_days);
    progress.last_activity_date = todayStr as unknown as Date;
  }

  // Helper: which language a session participant is practicing in that session
  private sessionLanguageIdForUser(session: ConversationSession, userId: number): number {
    return session.user_1_id === userId ? session.language_1_id : session.language_2_id;
  }

  // Get user's conversation history
  async getConversationHistory(userId: number) {
    const sessions = await this.conversationSessionRepo.find({
      where: [{ user_1_id: userId }, { user_2_id: userId }],
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
