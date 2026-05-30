// src/quiz/entities/quiz-result.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn, OneToOne } from 'typeorm';
import { QuizInstance } from './quiz-instance.entity';
import { User } from '../../user/entities/user.entity';
import { Language } from '../../languages/entities/language.entity';
import { CEFRLevel } from './quiz-questions-bank.entity';
import { UserLanguageProgress } from 'src/user/entities/user-language-progress.entity';

@Entity('quiz_results')
@Index(['user_id', 'completed_at'])
export class QuizResult {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  quiz_instance_id!: number;

  @Column()
  user_id!: number;

  @Column()
  language_id!: number;

  @Column({ type: 'int' })
  total_questions!: number;

  @Column({ type: 'int' })
  correct_answers!: number;

  @Column({ type: 'int' })
  incorrect_answers!: number;

  @Column({ type: 'int', default: 0 })
  skipped_answers!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  score_percentage!: number;

  @Column({
    type: 'enum',
    enum: CEFRLevel,
    nullable: true,
  })
  calculated_cefr_level: CEFRLevel;

  @Column({ type: 'int', nullable: true })
  calculated_sub_level!: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  previous_level!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  new_level!: string | null;

  @Column({ type: 'boolean', default: false })
  leveled_up!: boolean;

  @Column({ type: 'json' })
  performance_by_skill!: Record<string, { correct: number; total: number; percentage: number }>;

  @Column({ type: 'json' })
  performance_by_level!: Record<string, { correct: number; total: number; percentage: number }>;

  @Column({ type: 'int', default: 0 })
  xp_earned!: number;

  @Column({ type: 'int', nullable: true })
  time_taken_seconds!: number | null;

  @CreateDateColumn()
  completed_at!: Date;

  @OneToOne(() => QuizInstance, instance => instance.result, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quiz_instance_id' })
  instance!: QuizInstance;

  @ManyToOne(() => User, user => user.quizResults, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Language, language => language.quizResults, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'language_id' })
  language!: Language;

  @ManyToOne(() => UserLanguageProgress, ulp => ulp.quizResults)
  userLanguageProgress!: UserLanguageProgress;
}