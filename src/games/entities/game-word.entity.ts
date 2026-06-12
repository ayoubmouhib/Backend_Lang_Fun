// src/games/entities/game-word.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn } from 'typeorm';
import { Language } from '../../languages/entities/language.entity';
import { CEFRLevel } from '../../quiz/entities/quiz-questions-bank.entity';

@Entity('game_words')
@Index(['language_id', 'cefr_level'])
export class GameWord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  language_id: number;

  @Column({ type: 'varchar', length: 100 })
  term: string;

  @Column({ type: 'varchar', length: 100 })
  translation: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  hint: string | null;

  @Column({
    type: 'enum',
    enum: CEFRLevel,
    default: CEFRLevel.A1,
  })
  cefr_level: CEFRLevel;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string | null;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Language, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'language_id' })
  language: Language;
}
