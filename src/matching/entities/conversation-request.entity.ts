// src/matching/entities/conversation-request.entity.ts (UPDATED)
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Language } from '../../languages/entities/language.entity';

@Entity('conversation_requests')
export class ConversationRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  requester_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requester_id' })
  requester: User;

  @Column()
  requester_language_id: number;

  @ManyToOne(() => Language)
  @JoinColumn({ name: 'requester_language_id' })
  requester_language: Language;

  @Column()
  requester_role: string;

  @Column({ nullable: true })
  matched_user_id: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'matched_user_id' })
  matched_user: User;

  @Column({ nullable: true })
  matched_language_id: number;

  @ManyToOne(() => Language, { nullable: true })
  @JoinColumn({ name: 'matched_language_id' })
  matched_language: Language;

  @Column({ nullable: true })
  matched_user_role: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  compatibility_score: number;

  @Column({ type: 'json', nullable: true })
  score_breakdown: any;

  @Column({ default: 'pending' })
  status: string;

  @Column({ type: 'boolean', default: false })
  is_active_search: boolean;

  @Column({ type: 'timestamp', nullable: true })
  active_search_timeout: Date | null;

  @Column({ nullable: true })
  matched_at: Date;

  @Column({ nullable: true })
  expired_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}