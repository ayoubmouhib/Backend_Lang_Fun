import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Language } from '../../languages/entities/language.entity';
import { ConversationSession } from '../../matching/entities/conversation-session.entity';
import { Message } from './message.entity';
import { ConversationCall } from './conversation-call.entity';

export enum ConversationType {
  TEXT = 'text',
  AUDIO = 'audio',
  VIDEO = 'video',
  MIXED = 'mixed', // Can switch between types
}

@Entity('conversations')
@Index(['user_1_id', 'user_2_id'])
@Index(['session_id'])
@Index(['created_at'])
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  // Link to matching session
  @Column()
  session_id: number;

  @ManyToOne(() => ConversationSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: ConversationSession;

  // Participants
  @Column()
  user_1_id: number;

  @Column()
  user_2_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'user_1_id' })
  user_1: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'user_2_id' })
  user_2: User;

  // Language being practiced
  @Column()
  language_id: number;

  @ManyToOne(() => Language, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'language_id' })
  language: Language;

  // Conversation type
  @Column({
    type: 'enum',
    enum: ConversationType,
    default: ConversationType.TEXT,
  })
  type: ConversationType;

  // Status
  @Column({ type: 'varchar', default: 'active' })
  status: 'active' | 'archived' | 'deleted';

  // Statistics
  @Column({ type: 'int', default: 0 })
  message_count: number;

  @Column({ type: 'int', default: 0 })
  call_count: number;

  // Last activity
  @Column({ type: 'text', nullable: true })
  last_message_content: string;

  @Column({ type: 'int', nullable: true })
  last_message_user_id: number;

  @Column({ type: 'timestamp', nullable: true })
  last_message_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  last_activity_at: Date;

  // Unread counts (for UI optimization)
  @Column({ type: 'int', default: 0 })
  unread_count_user_1: number;

  @Column({ type: 'int', default: 0 })
  unread_count_user_2: number;

  // Online status
  @Column({ type: 'boolean', default: false })
  is_user_1_online: boolean;

  @Column({ type: 'boolean', default: false })
  is_user_2_online: boolean;

  @Column({ type: 'timestamp', nullable: true })
  user_1_last_seen: Date;

  @Column({ type: 'timestamp', nullable: true })
  user_2_last_seen: Date;

  // Blocked status
  @Column({ type: 'boolean', default: false })
  is_user_1_blocked: boolean; // User 2 blocked User 1

  @Column({ type: 'boolean', default: false })
  is_user_2_blocked: boolean; // User 1 blocked User 2

  // Reported
  @Column({ type: 'boolean', default: false })
  is_reported: boolean;

  @Column({ type: 'varchar', nullable: true })
  report_reason: string;

  // Timestamps
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @OneToMany(() => Message, (message) => message.conversation, {
    cascade: true,
  })
  messages: Message[];

  @OneToMany(() => ConversationCall, (call) => call.conversation, {
    cascade: true,
  })
  calls: ConversationCall[];
}