// src/quiz/entities/quiz-questions-bank.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Language } from '../../languages/entities/language.entity';
import { QuizUserAnswer } from './quiz-user-answer.entity';

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  FILL_BLANK = 'fill_blank',
  TRUE_FALSE = 'true_false',
  WORD_ORDER = 'word_order',
  MATCHING = 'matching',
}

export enum SkillCategory {
  GRAMMAR = 'grammar',
  VOCABULARY = 'vocabulary',
  READING = 'reading',
  LISTENING = 'listening',
  WRITING = 'writing',
}

export enum CEFRLevel {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
  C2 = 'C2',
}

@Entity('quiz_questions_bank')
@Index(['language_id', 'target_cefr_level'])
@Index(['skill_category', 'difficulty_score'])
export class QuizQuestionsBank {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  question_code!: string;

  @Column()
  language_id!: number;

  @Column({ type: 'text' })
  question_text!: string;

  @Column({
    type: 'enum',
    enum: QuestionType,
  })
  question_type!: QuestionType;

  @Column({ type: 'json', nullable: true })
  options!: string[];

  @Column({ type: 'varchar', length: 500 })
  correct_answer!: string;

  @Column({ type: 'json', nullable: true })
  alternative_answers!: string[];

  @Column({ type: 'text', nullable: true })
  explanation!: string;

  @Column({ type: 'text', nullable: true })
  hint!: string;

  @Column({
    type: 'enum',
    enum: SkillCategory,
  })
  skill_category!: SkillCategory;

  @Column({ type: 'varchar', length: 100, nullable: true })
  grammar_topic!: string;

  @Column({
    type: 'enum',
    enum: CEFRLevel,
  })
  target_cefr_level!: CEFRLevel;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 1.00 })
  difficulty_score!: number;

  @Column({ type: 'int', default: 0 })
  times_used!: number;

  @Column({ type: 'int', default: 0 })
  times_correct!: number;

  @Column({ type: 'int', default: 0 })
  times_incorrect!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  actual_difficulty!: number;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'int', nullable: true })
  created_by!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => Language, language => language.quizQuestions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'language_id' })
  language!: Language;

   @OneToMany(() => QuizUserAnswer, answer => answer.question)
  userAnswers!: QuizUserAnswer[];
}