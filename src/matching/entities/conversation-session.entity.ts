// src/matching/entities/conversation-session.entity.ts (UPDATED)
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Language } from '../../languages/entities/language.entity';
import { ConversationRequest } from './conversation-request.entity';

@Entity('conversation_sessions')
export class ConversationSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  conversation_request_id: number;

  @OneToOne(() => ConversationRequest)
  @JoinColumn({ name: 'conversation_request_id' })
  conversation_request: ConversationRequest;

  @Column()
  user_1_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_1_id' })
  user_1: User;

  @Column()
  user_2_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_2_id' })
  user_2: User;

  @Column()
  language_1_id: number;

  @ManyToOne(() => Language)
  @JoinColumn({ name: 'language_1_id' })
  language_1: Language;

  @Column()
  language_2_id: number;

  @ManyToOne(() => Language)
  @JoinColumn({ name: 'language_2_id' })
  language_2: Language;

  @Column({ default: 'text' })
  session_type: string;

  @Column({ default: 'waiting' })
  status: string;

  @Column({ nullable: true })
  started_at: Date;

  @Column({ nullable: true })
  ended_at: Date;

  @Column({ type: 'int', nullable: true })
  duration_seconds: number;

  @Column({ type: 'int', default: 0 })
  message_count: number;

  @Column({ type: 'int', default: 0 })
  corrections_made: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}