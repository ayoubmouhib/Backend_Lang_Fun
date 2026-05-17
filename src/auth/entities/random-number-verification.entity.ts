import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('random_number')
export class RandomNumber {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  code_randaom: string;


  @Column({ type: 'timestamp' })
  expires_at: Date;

  // The link back to the User
  @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  user_id: number;
}