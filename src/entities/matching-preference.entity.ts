import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user/entities/user.entity';

@Entity('matching_preferences')
export class MatchingPreference {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: ['text', 'voice', 'video'],
    default: 'text',
  })
  preferred_session_type: string;

  @Column({ type: 'int', default: 15 })
  min_session_duration_minutes: number;

  @Column({ type: 'int', default: 60 })
  max_session_duration_minutes: number;

  @Column({ type: 'varchar', nullable: true })
  preferred_timezone: string;

  @Column({ type: 'int', nullable: true })
  age_range_min: number;

  @Column({ type: 'int', nullable: true })
  age_range_max: number;

  @Column({ type: 'int', default: 2 })
  level_flexibility: number;

  @Column({ type: 'boolean', default: false })
  must_share_interests: boolean;

  @Column({ type: 'json', nullable: true })
  available_days: string[]; // ["Monday", "Tuesday", ...]

  @Column({ type: 'time', nullable: true })
  available_hours_start: string;

  @Column({ type: 'time', nullable: true })
  available_hours_end: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

