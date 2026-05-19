import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { User } from '../../user/entities/user.entity'; 
import { UserLanguageProgress } from 'src/user/entities/user-language-progress.entity';
import { UserLanguage } from 'src/user/entities/user-language.entity';

@Entity('languages')
export class Language {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 10, unique: true })
  iso_code: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  native_name: string;

  @Column({
    type: 'enum',
    enum: ['LTR', 'RTL'],
    default: 'LTR',
  })
  direction: string;

  // This allows you to find all users who speak this language
  @OneToMany(() => User, (user) => user.language)
  users: User[];

  @OneToMany(() => UserLanguage, userLanguage => userLanguage.language)
  userLanguages: UserLanguage[];


// UPDATED: Replace old userLanguages with new userProgress
  @OneToMany(() => UserLanguageProgress, progress => progress.language)
  userProgress: UserLanguageProgress[];
}