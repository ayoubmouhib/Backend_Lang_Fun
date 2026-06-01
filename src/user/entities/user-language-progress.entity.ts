import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index, Unique, OneToMany } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Language } from '../../languages/entities/language.entity';
import { QuizResult } from 'src/quiz/entities/quiz-result.entity';

export enum InitialLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

export enum CEFRLevel {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
  C2 = 'C2'
}

@Entity('user_language_progress')
@Unique(['user_id', 'language_id'])
@Index(['language_id', 'cefr_level', 'sub_level'])
@Index(['user_id', 'level_verified'])
@Index(['language_id', 'xp_points'])
export class UserLanguageProgress {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  user_id!: number;

  @Column()
  language_id!: number;

  // 🔥 Initial level from signup
  @Column({
    type: 'enum',
    enum: InitialLevel,
    default: InitialLevel.BEGINNER
  })
  initial_level!: InitialLevel;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  initial_selected_at!: Date;

  // 🔥 Current verified level
  @Column({
    type: 'enum',
    enum: CEFRLevel,
    nullable: true
  })
  cefr_level!: CEFRLevel | null;

  @Column({ type: 'int', nullable: true })
  sub_level!: number | null;

  @Column({ default: false })
  level_verified!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  verified_at!: Date | null;

  @Column({
    type: 'enum',
    enum: ['learning', 'native', 'fluent'],
    default: 'learning',
  })
  user_type: 'learning' | 'native' | 'fluent';
  // learning = wants to learn this language
  // native = native speaker of this language
  // fluent = fluent but not native (learned well)

  // 🔥 Gamification
  @Column({ type: 'int', default: 0 })
  xp_points!: number;

  @Column({ type: 'int', default: 0 })
  conversation_count!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  practice_hours!: number;

  // 🔥 Assessment tracking
  @Column({ type: 'timestamp', nullable: true })
  last_assessment_date!: Date | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  last_assessment_score!: number | null;

  @Column({ default: false })
  needs_reassessment!: boolean;

  // 🔥 Streaks
  @Column({ type: 'int', default: 0 })
  current_streak_days!: number;

  @Column({ type: 'int', default: 0 })
  longest_streak_days!: number;

  @Column({ type: 'date', nullable: true })
  last_activity_date!: Date | null;

  // 🔥 Learning preferences (JSON)
  @Column({ type: 'json', nullable: true })
  learning_goals!: string[] | null;

  @Column({ type: 'json', nullable: true })
  focus_areas!: string[] | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Relations
  @ManyToOne(() => User, user => user.languageProgress, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Language, language => language.userProgress, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'language_id' })
  language!: Language;

  @OneToMany(() => QuizResult, quizResult => quizResult.userLanguageProgress)
  quizResults!: QuizResult[];

}