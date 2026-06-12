// src/games/games.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameWord } from './entities/game-word.entity';
import { GameSession, GameSessionStatus, GameRound, GameType } from './entities/game-session.entity';
import { UserLanguageProgress } from '../user/entities/user-language-progress.entity';
import { CEFRLevel } from '../quiz/entities/quiz-questions-bank.entity';

const CEFR_ORDER = [CEFRLevel.A1, CEFRLevel.A2, CEFRLevel.B1, CEFRLevel.B2, CEFRLevel.C1, CEFRLevel.C2];

const GAME_INFO: Record<GameType, { title: string; description: string; xp_per_correct: number; xp_perfect_bonus: number }> = {
  [GameType.WORD_MATCH]: {
    title: 'Word Match',
    description: 'Match each word with its correct translation.',
    xp_per_correct: 3,
    xp_perfect_bonus: 15,
  },
  [GameType.WORD_SCRAMBLE]: {
    title: 'Word Scramble',
    description: 'Unscramble the letters to find the hidden word.',
    xp_per_correct: 4,
    xp_perfect_bonus: 20,
  },
};

const DEFAULT_ROUND_COUNT = 8;

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(GameWord)
    private gameWordRepo: Repository<GameWord>,

    @InjectRepository(GameSession)
    private gameSessionRepo: Repository<GameSession>,

    @InjectRepository(UserLanguageProgress)
    private progressRepo: Repository<UserLanguageProgress>,
  ) {}

  // 🔥 1. List the games available to a user for a language, with word-pool sizes
  async getAvailableGames(userId: number, languageId: number) {
    const levels = await this.levelsUpToUser(userId, languageId);

    const wordPoolSize = await this.gameWordRepo.count({
      where: levels.map((cefr_level) => ({ language_id: languageId, cefr_level })),
    });

    return {
      language_id: languageId,
      word_pool_size: wordPoolSize,
      games: Object.values(GameType).map((game_type) => ({
        game_type,
        title: GAME_INFO[game_type].title,
        description: GAME_INFO[game_type].description,
        xp_per_correct: GAME_INFO[game_type].xp_per_correct,
        xp_perfect_bonus: GAME_INFO[game_type].xp_perfect_bonus,
        playable: wordPoolSize >= 4,
      })),
    };
  }

  // 🔥 2. Start a new game session
  async startGame(userId: number, languageId: number, gameType: GameType, roundCount = DEFAULT_ROUND_COUNT) {
    const levels = await this.levelsUpToUser(userId, languageId);

    const pool = await this.gameWordRepo.find({
      where: levels.map((cefr_level) => ({ language_id: languageId, cefr_level })),
    });

    if (pool.length < 4) {
      throw new BadRequestException('Not enough vocabulary available for this language yet');
    }

    const shuffledPool = this.shuffleArray(pool);
    const selected = shuffledPool.slice(0, Math.min(roundCount, shuffledPool.length));

    const rounds: GameRound[] = selected.map((word) =>
      gameType === GameType.WORD_MATCH
        ? this.buildWordMatchRound(word, shuffledPool)
        : this.buildWordScrambleRound(word),
    );

    const session = this.gameSessionRepo.create({
      user_id: userId,
      language_id: languageId,
      game_type: gameType,
      status: GameSessionStatus.IN_PROGRESS,
      rounds,
      current_round_index: 0,
      correct_count: 0,
      incorrect_count: 0,
      xp_earned: 0,
      started_at: new Date(),
    });

    await this.gameSessionRepo.save(session);

    return this.formatSessionStart(session);
  }

  // 🔥 3. Submit the answer for the current round
  async submitRound(sessionId: number, roundIndex: number, userAnswer: string, timeSpentSeconds?: number) {
    const session = await this.gameSessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException('Game session not found');
    }
    if (session.status !== GameSessionStatus.IN_PROGRESS) {
      throw new BadRequestException('This game session has already ended');
    }
    if (roundIndex !== session.current_round_index) {
      throw new BadRequestException('Round index does not match the current round');
    }

    const round = session.rounds[roundIndex];
    if (!round) {
      throw new NotFoundException('Round not found');
    }

    const isCorrect = this.normalizeAnswer(userAnswer) === this.normalizeAnswer(round.correct_answer);

    round.user_answer = userAnswer;
    round.is_correct = isCorrect;
    round.time_spent_seconds = timeSpentSeconds ?? null;

    if (isCorrect) {
      session.correct_count += 1;
    } else {
      session.incorrect_count += 1;
    }
    session.current_round_index += 1;

    await this.gameSessionRepo.save(session);

    const finished = session.current_round_index >= session.rounds.length;
    const nextRound = finished ? null : this.formatPublicRound(session.rounds[session.current_round_index], session.current_round_index);

    return {
      is_correct: isCorrect,
      correct_answer: round.correct_answer,
      finished,
      progress: {
        current_round_index: session.current_round_index,
        total_rounds: session.rounds.length,
        correct_count: session.correct_count,
        incorrect_count: session.incorrect_count,
      },
      next_round: nextRound,
    };
  }

  // 🔥 4. Complete a session, compute score/xp and persist progress
  async completeGame(sessionId: number) {
    const session = await this.gameSessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException('Game session not found');
    }
    if (session.status === GameSessionStatus.COMPLETED) {
      return this.formatResult(session);
    }

    const totalRounds = session.rounds.length;
    const scorePercentage = totalRounds > 0 ? (session.correct_count / totalRounds) * 100 : 0;
    const info = GAME_INFO[session.game_type];
    const perfectBonus = scorePercentage === 100 ? info.xp_perfect_bonus : 0;
    const xpEarned = session.correct_count * info.xp_per_correct + perfectBonus;

    session.status = GameSessionStatus.COMPLETED;
    session.completed_at = new Date();
    session.score_percentage = Math.round(scorePercentage * 100) / 100;
    session.xp_earned = xpEarned;
    session.time_taken_seconds = session.started_at
      ? Math.floor((session.completed_at.getTime() - session.started_at.getTime()) / 1000)
      : null;

    await this.gameSessionRepo.save(session);
    await this.awardXp(session.user_id, session.language_id, xpEarned);

    return this.formatResult(session);
  }

  // 🔥 5. Fetch a finished session's result
  async getGameResult(sessionId: number) {
    const session = await this.gameSessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException('Game session not found');
    }
    if (session.status !== GameSessionStatus.COMPLETED) {
      throw new BadRequestException('This game session is not finished yet');
    }
    return this.formatResult(session);
  }

  // 🔥 6. Resume / inspect an in-progress (or finished) session
  async getGameSession(sessionId: number) {
    const session = await this.gameSessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException('Game session not found');
    }

    if (session.status !== GameSessionStatus.IN_PROGRESS) {
      return this.formatResult(session);
    }

    return {
      session_id: session.id,
      game_type: session.game_type,
      status: session.status,
      title: GAME_INFO[session.game_type].title,
      total_rounds: session.rounds.length,
      current_round_index: session.current_round_index,
      correct_count: session.correct_count,
      incorrect_count: session.incorrect_count,
      current_round: this.formatPublicRound(session.rounds[session.current_round_index], session.current_round_index),
    };
  }

  // 🔥 7. Past sessions for a user/language
  async getGameHistory(userId: number, languageId: number) {
    const sessions = await this.gameSessionRepo.find({
      where: { user_id: userId, language_id: languageId, status: GameSessionStatus.COMPLETED },
      order: { completed_at: 'DESC' },
      take: 50,
    });

    return {
      history: sessions.map((s) => ({
        session_id: s.id,
        game_type: s.game_type,
        title: GAME_INFO[s.game_type].title,
        total_rounds: s.rounds.length,
        correct_count: s.correct_count,
        score_percentage: s.score_percentage,
        xp_earned: s.xp_earned,
        time_taken_seconds: s.time_taken_seconds,
        completed_at: s.completed_at,
      })),
    };
  }

  // ─── Round builders ────────────────────────────────────────────────────────

  private buildWordMatchRound(word: GameWord, pool: GameWord[]): GameRound {
    const distractors = this.shuffleArray(
      pool.filter((w) => w.id !== word.id && w.translation.toLowerCase() !== word.translation.toLowerCase()),
    ).slice(0, 3);

    const options = this.shuffleArray([word.translation, ...distractors.map((d) => d.translation)]);

    return {
      word_id: word.id,
      term: word.term,
      prompt: `What does "${word.term}" mean?`,
      correct_answer: word.translation,
      options,
      hint: word.hint,
    };
  }

  private buildWordScrambleRound(word: GameWord): GameRound {
    let scrambled = word.term;
    if (word.term.length > 1) {
      do {
        scrambled = this.shuffleArray(word.term.split('')).join('');
      } while (scrambled.toLowerCase() === word.term.toLowerCase());
    }

    return {
      word_id: word.id,
      term: word.term,
      prompt: `Unscramble the letters — hint: it means "${word.translation}"`,
      correct_answer: word.term,
      scrambled,
      hint: word.hint,
    };
  }

  // ─── Formatting helpers (never leak the correct answer ahead of time) ──────

  private formatSessionStart(session: GameSession) {
    return {
      session_id: session.id,
      game_type: session.game_type,
      status: session.status,
      title: GAME_INFO[session.game_type].title,
      total_rounds: session.rounds.length,
      current_round_index: 0,
      current_round: this.formatPublicRound(session.rounds[0], 0),
    };
  }

  private formatPublicRound(round: GameRound, index: number) {
    if (!round) return null;
    return {
      round_index: index,
      word_id: round.word_id,
      prompt: round.prompt,
      options: round.options ?? null,
      scrambled: round.scrambled ?? null,
      hint: round.hint ?? null,
    };
  }

  private formatResult(session: GameSession) {
    return {
      session_id: session.id,
      game_type: session.game_type,
      title: GAME_INFO[session.game_type].title,
      status: session.status,
      total_rounds: session.rounds.length,
      correct_count: session.correct_count,
      incorrect_count: session.incorrect_count,
      score_percentage: session.score_percentage,
      xp_earned: session.xp_earned,
      time_taken_seconds: session.time_taken_seconds,
      rounds: session.rounds.map((r, i) => ({
        round_index: i,
        term: r.term,
        prompt: r.prompt,
        correct_answer: r.correct_answer,
        user_answer: r.user_answer ?? null,
        is_correct: r.is_correct ?? null,
        time_spent_seconds: r.time_spent_seconds ?? null,
      })),
    };
  }

  // ─── Misc helpers ──────────────────────────────────────────────────────────

  private async levelsUpToUser(userId: number, languageId: number): Promise<CEFRLevel[]> {
    const progress = await this.progressRepo.findOne({ where: { user_id: userId, language_id: languageId } });
    const userLevel = progress?.cefr_level ?? CEFRLevel.A1;
    const idx = CEFR_ORDER.indexOf(userLevel);
    return CEFR_ORDER.slice(0, idx >= 0 ? idx + 1 : 1);
  }

  private async awardXp(userId: number, languageId: number, xpEarned: number) {
    if (xpEarned <= 0) return;

    const progress = await this.progressRepo.findOne({ where: { user_id: userId, language_id: languageId } });
    if (!progress) return;

    progress.xp_points += xpEarned;
    progress.last_activity_date = new Date();
    await this.progressRepo.save(progress);
  }

  private normalizeAnswer(value: string): string {
    return value.trim().toLowerCase();
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
