// src/quiz/entities/quiz-user-answer.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { QuizInstance } from './quiz-instance.entity';
import { QuizQuestionsBank } from './quiz-questions-bank.entity';

@Entity('quiz_user_answers')
export class QuizUserAnswer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  quiz_instance_id: number;

  @Column()
  question_id: number;

  @Column({ type: 'text', nullable: true })
  user_answer: string;

  @Column({ type: 'boolean', nullable: true })
  is_correct: boolean;

  @Column({ type: 'int', nullable: true })
  time_spent_seconds: number;

  @Column({ type: 'boolean', default: false })
  was_skipped: boolean;

  @Column({ type: 'boolean', default: false })
  used_hint: boolean;

  @CreateDateColumn()
  answered_at: Date;

  @ManyToOne(() => QuizInstance, instance => instance.answers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quiz_instance_id' })
  instance: QuizInstance;

  @ManyToOne(() => QuizQuestionsBank, question => question.userAnswers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: QuizQuestionsBank;
}