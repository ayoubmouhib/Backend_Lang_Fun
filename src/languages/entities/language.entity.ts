import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { User } from '../../user/entities/user.entity'; 

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
}