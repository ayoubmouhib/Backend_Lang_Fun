import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { User } from '../../user/entities/user.entity';

export enum CallType {
  AUDIO = 'audio',
  VIDEO = 'video',
}

export enum CallStatus {
  INITIATED = 'initiated',
  RINGING = 'ringing',
  ACCEPTED = 'accepted',
  ACTIVE = 'active',
  ENDED = 'ended',
  MISSED = 'missed',
  REJECTED = 'rejected',
  FAILED = 'failed',
}

@Entity('conversation_calls')
@Index(['conversation_id', 'initiated_at'])
@Index(['initiator_id'])
@Index(['status'])
export class ConversationCall {
  @PrimaryGeneratedColumn()
  id: number;

  // Conversation reference
  @Column()
  conversation_id: number;

  @ManyToOne(() => Conversation, (conv) => conv.calls, {
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  // Call participants
  @Column({ nullable: true })
  initiator_id: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'initiator_id' })
  initiator: User;

  @Column({ nullable: true })
  receiver_id: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'receiver_id' })
  receiver: User;

  // Call details
  @Column({ type: 'enum', enum: CallType, default: CallType.AUDIO })
  type: CallType;

  @Column({ type: 'enum', enum: CallStatus, default: CallStatus.INITIATED })
  status: CallStatus;

  // Timestamps
  @CreateDateColumn()
  initiated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  started_at: Date; // When receiver accepted

  @Column({ type: 'timestamp', nullable: true })
  ended_at: Date;

  // Duration in seconds
  @Column({ type: 'int', nullable: true })
  duration_seconds: number;

  // WebRTC/Call server info
  @Column({ type: 'varchar', nullable: true })
  call_token: string; // Token for WebRTC connection

  @Column({ type: 'varchar', nullable: true })
  call_server_url: string; // Signaling server URL

  @Column({ type: 'json', nullable: true })
  ice_servers?: Array<{
    urls: string[];
    username?: string;
    credential?: string;
  }>;

  // Quality metrics
  @Column({ type: 'json', nullable: true })
  quality_metrics?: {
    bitrate?: number;
    latency?: number;
    packet_loss?: number;
    jitter?: number;
  };

  // Missed call info
  @Column({ type: 'boolean', default: false })
  was_missed: boolean;

  @Column({ type: 'varchar', nullable: true })
  miss_reason?: string; // 'no_answer' | 'rejected' | 'failed' | 'network_error'

  // Recording
  @Column({ type: 'boolean', default: false })
  was_recorded: boolean;

  @Column({ type: 'varchar', nullable: true })
  recording_url: string;

  @Column({ type: 'boolean', default: true })
  can_be_recorded: boolean;

  // Transcription (for audio calls with transcription service)
  @Column({ type: 'longtext', nullable: true })
  transcription: string;

  @Column({ type: 'boolean', default: false })
  transcription_available: boolean;

  // Call metadata
  @Column({ type: 'json', nullable: true })
  metadata?: {
    learning_language_id?: number;
    teaching_language_id?: number;
    practice_topic?: string;
  };
}