import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('blocked_users')
@Index(['blocker_id', 'blocked_user_id'], { unique: true }) // 🔥 Unique pair
export class BlockedUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  blocker_id: number;

  @Column()
  blocked_user_id: number;

  @Column({ type: 'text', nullable: true })
  reason?: string | null; // 🔥 WHY they blocked (optional)

  @CreateDateColumn()
  created_at: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'blocker_id' })
  blocker: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'blocked_user_id' })
  blocked_user: User;
}