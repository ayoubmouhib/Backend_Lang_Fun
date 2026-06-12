import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MatchingService } from '../src/matching/matching.service';
import { ConversationRequest } from '../src/matching/entities/conversation-request.entity';
import { ConversationSession } from '../src/matching/entities/conversation-session.entity';
import { MatchingPreference } from '../src/matching/entities/matching-preference.entity';
import { UserRating } from '../src/matching/entities/user-rating.entity';
import { UserLanguageProgress } from '../src/user/entities/user-language-progress.entity';
import { User } from '../src/user/entities/user.entity';

const ENGLISH = 1;
const SPANISH = 2;

describe('MatchingService', () => {
  let service: MatchingService;
  let conversationRequestRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let progressRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let userRepo: {
    findOne: jest.Mock;
  };
  let activeSearches: any[];
  let targetSpeakers: any[];

  beforeEach(async () => {
    activeSearches = [];
    targetSpeakers = [
      {
        user_id: 2,
        language_id: SPANISH,
        user_type: 'native',
        cefr_level: 'C2',
        sub_level: 1,
        user: {
          id: 2,
          first_name: 'User',
          last_name: 'B',
          email: 'b@example.com',
        },
      },
    ];

    conversationRequestRepo = {
      create: jest.fn((payload) => payload),
      save: jest.fn(async (payload) => ({ id: 99, ...payload })),
      findOne: jest.fn(async ({ where }) => {
        if (where?.id) {
          return (
            activeSearches.find((search) => search.id === where.id) ?? null
          );
        }

        return null;
      }),
      find: jest.fn(async ({ where }) => {
        if (where?.status === 'searching') {
          return activeSearches;
        }

        return [];
      }),
    };

    progressRepo = {
      findOne: jest.fn(async ({ where }) => {
        if (where.user_id === 1 && where.language_id === SPANISH) {
          return {
            user_id: 1,
            language_id: SPANISH,
            user_type: 'learning',
            cefr_level: 'A2',
            sub_level: 1,
            user: { id: 1 },
          };
        }

        if (where.user_id === 2 && where.language_id === ENGLISH) {
          return {
            user_id: 2,
            language_id: ENGLISH,
            user_type: 'learning',
            cefr_level: 'A2',
            sub_level: 2,
            user: { id: 2 },
          };
        }

        if (where.user_id === 2 && where.language_id === SPANISH) {
          return {
            user_id: 2,
            language_id: SPANISH,
            user_type: 'native',
            cefr_level: 'C2',
            sub_level: 1,
            user: {
              id: 2,
              first_name: 'User',
              last_name: 'B',
              email: 'b@example.com',
            },
          };
        }

        return null;
      }),
      find: jest.fn(async ({ where }) => {
        if (where.user_id === 1) {
          return [
            {
              user_id: 1,
              language_id: ENGLISH,
              user_type: 'native',
              cefr_level: 'C2',
              sub_level: 1,
            },
          ];
        }

        if (where.language_id === SPANISH) {
          return targetSpeakers;
        }

        return [];
      }),
    };

    userRepo = {
      findOne: jest.fn(async ({ where }) => ({
        id: where.id,
        preferred_language_id: where.id === 1 ? ENGLISH : SPANISH,
        interests: [],
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchingService,
        {
          provide: getRepositoryToken(ConversationRequest),
          useValue: conversationRequestRepo,
        },
        {
          provide: getRepositoryToken(ConversationSession),
          useValue: {},
        },
        {
          provide: getRepositoryToken(UserLanguageProgress),
          useValue: progressRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: getRepositoryToken(UserRating),
          useValue: { find: jest.fn(async () => []) },
        },
        {
          provide: getRepositoryToken(MatchingPreference),
          useValue: { findOne: jest.fn(async () => null) },
        },
      ],
    }).compile();

    service = module.get<MatchingService>(MatchingService);
  });

  it('creates a reciprocal exchange request using both language directions', async () => {
    const result = await service.createConversationRequest(1, {
      requester_language_id: SPANISH,
      requester_role: 'learner',
    });

    expect(result.matched_user_id).toBe(2);
    expect(result.matched_language_id).toBe(ENGLISH);
    expect(result.compatibility_score).toBeGreaterThan(0);
    expect(conversationRequestRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        requester_id: 1,
        requester_language_id: SPANISH,
        matched_user_id: 2,
        matched_language_id: ENGLISH,
        matched_user_role: 'learner',
        status: 'pending',
      }),
    );
  });

  it('creates an active search when no reciprocal partner exists yet', async () => {
    targetSpeakers = [];

    const result = await service.createConversationRequest(1, {
      requester_language_id: SPANISH,
      requester_role: 'learner',
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: 'searching',
        requester_language_id: SPANISH,
        matched_language_id: ENGLISH,
        match_source: 'waiting_for_partner',
      }),
    );
    expect(conversationRequestRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        requester_id: 1,
        requester_language_id: SPANISH,
        matched_language_id: ENGLISH,
        status: 'searching',
      }),
    );
  });

  it('claims a reciprocal active search when the second user starts searching', async () => {
    activeSearches = [
      {
        id: 77,
        requester_id: 2,
        requester_language_id: ENGLISH,
        requester_role: 'learner',
        matched_language_id: SPANISH,
        matched_user_role: 'learner',
        status: 'searching',
        requester: {
          id: 2,
          first_name: 'User',
          last_name: 'B',
          email: 'b@example.com',
        },
      },
    ];

    const result = await service.createConversationRequest(1, {
      requester_language_id: SPANISH,
      requester_role: 'learner',
    });

    expect(result).toEqual(
      expect.objectContaining({
        request_id: 77,
        matched_user_id: 2,
        matched_language_id: ENGLISH,
        match_source: 'active_request',
        status: 'pending',
      }),
    );
    expect(conversationRequestRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 77,
        requester_id: 2,
        requester_language_id: ENGLISH,
        matched_user_id: 1,
        matched_language_id: SPANISH,
        status: 'pending',
      }),
    );
  });
});
