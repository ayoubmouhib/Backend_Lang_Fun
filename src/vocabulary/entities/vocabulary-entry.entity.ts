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
import { User } from '../../user/entities/user.entity';
import { Language } from '../../languages/entities/language.entity';

@Entity('vocabulary_entries')
@Index(['user_id'])
export class VocabularyEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column({ type: 'int', nullable: true })
  language_id: number | null;

  @Column({ type: 'varchar', length: 255 })
  word: string;

  @Column({ type: 'varchar', length: 255 })
  translation: string;

  @Column({ type: 'text', nullable: true })
  example: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  audio_path: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Language, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'language_id' })
  language: Language | null;
}
