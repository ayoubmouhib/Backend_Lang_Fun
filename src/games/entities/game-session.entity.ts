// src/games/entities/game-session.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Language } from '../../languages/entities/language.entity';

export enum GameType {
  WORD_MATCH = 'word_match',
  WORD_SCRAMBLE = 'word_scramble',
}

export enum GameSessionStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

// Shape of each entry stored in the `rounds` json column.
export interface GameRound {
  word_id: number;
  term: string;
  prompt: string;
  correct_answer: string;
  options?: string[];
  scrambled?: string;
  hint?: string | null;
  user_answer?: string | null;
  is_correct?: boolean | null;
  time_spent_seconds?: number | null;
}

@Entity('game_sessions')
@Index(['user_id', 'status'])
export class GameSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  language_id: number;

  @Column({ type: 'enum', enum: GameType })
  game_type: GameType;

  @Column({ type: 'enum', enum: GameSessionStatus, default: GameSessionStatus.IN_PROGRESS })
  status: GameSessionStatus;

  @Column({ type: 'json' })
  rounds: GameRound[];

  @Column({ type: 'int', default: 0 })
  current_round_index: number;

  @Column({ type: 'int', default: 0 })
  correct_count: number;

  @Column({ type: 'int', default: 0 })
  incorrect_count: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  score_percentage: number | null;

  @Column({ type: 'int', default: 0 })
  xp_earned: number;

  @Column({ type: 'timestamp', nullable: true })
  started_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date | null;

  @Column({ type: 'int', nullable: true })
  time_taken_seconds: number | null;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Language, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'language_id' })
  language: Language;
}
