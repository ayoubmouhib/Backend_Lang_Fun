import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { User } from '../../user/entities/user.entity';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  FILE = 'file',
  SYSTEM = 'system', // For system messages (user joined, left, etc)
}

@Entity('messages')
@Index(['conversation_id', 'created_at'])
@Index(['sender_id'])
@Index(['is_pinned'])
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  // Conversation reference
  @Column()
  conversation_id: number;

  @ManyToOne(() => Conversation, (conv) => conv.messages, {
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  // Sender
  @Column({ nullable: true })
  sender_id: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  // Message content
  @Column({ type: 'enum', enum: MessageType, default: MessageType.TEXT })
  type: MessageType;

  @Column({ type: 'longtext', nullable: true })
  content: string; // Message text or file URL

  @Column({ type: 'json', nullable: true })
  media_info?: {
    filename?: string;
    size?: number;
    duration?: number; // For audio/video in seconds
    width?: number; // For images/videos
    height?: number; // For images/videos
    mime_type?: string;
  };

  // Message status
  @Column({ type: 'varchar', default: 'sent' })
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

  @Column({ type: 'timestamp', nullable: true })
  read_at: Date;

  // Edit history
  @Column({ type: 'boolean', default: false })
  is_edited: boolean;

  @Column({ type: 'timestamp', nullable: true })
  edited_at: Date;

  @Column({ type: 'longtext', nullable: true })
  edited_content: string; // Store edited version

  // Reactions (JSON: { "👍": [user_ids], "❤️": [user_ids] })
  @Column({ type: 'json', nullable: true })
  reactions?: Record<string, number[]>;

  // Reply (quoting another message in the same conversation)
  @Column({ type: 'int', nullable: true })
  reply_to_message_id: number | null;

  @ManyToOne(() => Message, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'reply_to_message_id' })
  reply_to: Message | null;

  // Message pinning
  @Column({ type: 'boolean', default: false })
  is_pinned: boolean;

  @Column({ type: 'timestamp', nullable: true })
  pinned_at: Date | null;

  @Column({ type: 'int', nullable: true })
  pinned_by_user_id: number | null;

  // Moderation
  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deleted_at: Date;

  @Column({ type: 'varchar', nullable: true })
  delete_reason?: string; // 'user_deleted' | 'admin_deleted' | 'reported'

  // Timestamps
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}