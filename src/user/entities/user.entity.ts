import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn, 
  ManyToOne, 
  JoinColumn, 
  ManyToMany,
  JoinTable,
  OneToMany
} from 'typeorm';
import { Language } from '../../languages/entities/language.entity'; 
import { Interest } from 'src/auth/entities/interest.entity';
import { UserLanguageProgress } from './user-language-progress.entity';
import { UserLanguage } from './user-language.entity';
import { QuizResult } from 'src/quiz/entities/quiz-result.entity';
import { QuizInstance } from 'src/quiz/entities/quiz-instance.entity';

@Entity('users') // Matches The table name in phpMyAdmin
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  first_name: string;

  @Column({ type: 'varchar', length: 100 })
  last_name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  password: string;

  @Column({ type: 'int', nullable: true })
  age: number;

  @Column({ type: 'boolean', default: false })
  email_verified: boolean;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'timestamp', nullable: true })
  last_login: Date;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({ 
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP', 
    onUpdate: 'CURRENT_TIMESTAMP' 
  })
  updated_at: Date;

  // --- Foreign Key Logic ---

  @Column({ type: 'int', nullable: true })
  preferred_language_id: number;

  @ManyToMany(() => Interest, interest => interest.users, { cascade: true })
    @JoinTable({
        name: 'user_interests', // This will be your junction table
        joinColumn: { name: 'user_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'interest_id', referencedColumnName: 'id' }
    })
    interests: Interest[];

  
  // Relationship mapping: This links the ID column to the Language Entity.
  @ManyToOne(() => Language)
  @JoinColumn({ name: 'preferred_language_id' })
  language: Language;

   @OneToMany(() => UserLanguage, userLanguage => userLanguage.user, { cascade: true })
  userLanguages: UserLanguage[];


// UPDATED: Replace old userLanguages with new languageProgress
  @OneToMany(() => UserLanguageProgress, progress => progress.user)
  languageProgress: UserLanguageProgress[];

   @OneToMany(() => QuizInstance, instance => instance.user)
  quizInstances: QuizInstance[];

  @OneToMany(() => QuizResult, result => result.user)
  quizResults: QuizResult[];
  
}