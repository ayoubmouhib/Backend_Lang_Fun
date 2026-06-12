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
import { User } from '../user/entities/user.entity';
import { Language } from '../languages/entities/language.entity';
import { ConversationSession } from './conversation-session.entity';

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

  @Column({ type: 'enum', enum: ['learner', 'native_speaker', 'both'] })
  requester_role: string;

  // Matched user
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

  @Column({ type: 'enum', enum: ['learner', 'native_speaker', 'both'], nullable: true })
  matched_user_role: string;

  // Scoring
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  compatibility_score: number;

  @Column({ type: 'json', nullable: true })
  score_breakdown: {
    language_match: number;
    level_compatibility: number;
    mutual_benefit: number;
    interest_overlap: number;
    timezone_proximity: number;
    rating_score: number;
  };

  @Column({
    type: 'enum',
    enum: ['pending', 'accepted', 'rejected', 'expired'],
    default: 'pending',
  })
  status: string;

  @Column({ nullable: true })
  matched_at: Date;

  @Column({ nullable: true })
  expired_at: Date;

  @OneToOne(() => ConversationSession, (session) => session.conversation_request)
  conversation_session: ConversationSession;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}