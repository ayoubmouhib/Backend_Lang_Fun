import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../user/entities/user.entity';
import { ConversationSession } from './conversation-session.entity';

@Entity('user_ratings')
export class UserRating {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  conversation_session_id: number;

  @ManyToOne(() => ConversationSession)
  @JoinColumn({ name: 'conversation_session_id' })
  conversation_session: ConversationSession;

  @Column()
  rater_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'rater_id' })
  rater: User;

  @Column()
  rated_user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'rated_user_id' })
  rated_user: User;

  @Column({ type: 'int' })
  communication_score: number;

  @Column({ type: 'int' })
  helpfulness_score: number;

  @Column({ type: 'int' })
  patience_score: number;

  @Column({ type: 'int' })
  overall_score: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @CreateDateColumn()
  created_at: Date;
}