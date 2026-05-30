// src/quiz/entities/quiz-instance.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn, OneToOne, OneToMany } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { QuizTemplate } from './quiz-template.entity';
import { Language } from '../../languages/entities/language.entity';
import { QuizResult } from './quiz-result.entity';
import { QuizUserAnswer } from './quiz-user-answer.entity';

export enum QuizStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

@Entity('quiz_instances')
@Index(['user_id', 'status'])
export class QuizInstance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  template_id: number;

  @Column()
  language_id: number;

  @Column({ type: 'json' })
  selected_questions: { question_id: number; order: number }[];

  @Column({
    type: 'enum',
    enum: QuizStatus,
    default: QuizStatus.NOT_STARTED,
  })
  status: QuizStatus;

  @Column({ type: 'timestamp', nullable: true })
  started_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;

  @Column({ type: 'int', nullable: true })
  time_taken_seconds: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  level_before: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, user => user.quizInstances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => QuizTemplate, template => template.instances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: QuizTemplate;

  @ManyToOne(() => Language, language => language.quizInstances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'language_id' })
  language: Language;

   @OneToMany(() => QuizUserAnswer, answer => answer.instance)
  answers: QuizUserAnswer[];

  @OneToOne(() => QuizResult, result => result.instance)
  result: QuizResult;
}