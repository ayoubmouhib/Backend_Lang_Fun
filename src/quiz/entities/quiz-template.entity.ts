// src/quiz/entities/quiz-template.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Language } from '../../languages/entities/language.entity';
import { QuizInstance } from './quiz-instance.entity';

export enum QuizType {
  PLACEMENT = 'placement',
  PROGRESS_CHECK = 'progress_check',
  SKILL_FOCUSED = 'skill_focused',
}

@Entity('quiz_templates')
@Index(['language_id', 'is_currently_active'])
export class QuizTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  template_code: string;

  @Column()
  language_id: number;

  @Column({
    type: 'enum',
    enum: QuizType,
  })
  quiz_type: QuizType;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  target_cefr_levels: string[];

  @Column({ type: 'int', default: 20 })
  total_questions: number;

  @Column({ type: 'json' })
  question_distribution: Record<string, any>;

  @Column({ type: 'int', default: 20 })
  time_limit_minutes: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 60.00 })
  passing_score_percentage: number;

  @Column({ type: 'date', nullable: true })
  active_week_start: Date;

  @Column({ type: 'date', nullable: true })
  active_week_end: Date;

  @Column({ type: 'boolean', default: false })
  is_currently_active: boolean;

  @Column({ type: 'int', default: 50 })
  xp_reward_base: number;

  @Column({ type: 'int', default: 150 })
  xp_reward_perfect: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Language, language => language.quizTemplates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'language_id' })
  language: Language;

   @OneToMany(() => QuizInstance, instance => instance.template)
  instances: QuizInstance[];
}