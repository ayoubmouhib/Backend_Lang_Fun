// test/matching.service.spec.ts
/*
import { Test, TestingModule } from '@nestjs/testing';
import { MatchingService } from '../src/matching/matching.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConversationRequest } from 'src/entities/conversation-request.entity';
import { beforeEach, describe, it } from 'node:test';

describe('MatchingService', () => {
  let service: MatchingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchingService,
        {
          provide: getRepositoryToken(ConversationRequest),
          useValue: {},
        },
        // ... other mocks
      ],
    }).compile();

    service = module.get<MatchingService>(MatchingService);
  });

  it('should find best match with high compatibility', async () => {
    // Test algorithm
    const result = await service.findBestMatch(1, 1, 'learner');
    expect(result).toBeDefined();
    expect(result.compatibility_score).toBeGreaterThan(0);
  });

  it('should prioritize level compatibility', () => {
    // Test level calculation
    const score = service['calculateLevelCompatibility'](
      { cefr_level: 'B1', sub_level: 3 } as any,
      { cefr_level: 'B1', sub_level: 2 } as any,
      2,
    );
    expect(score).toBeGreaterThan(90); // Should be high for similar levels
  });
});
*/