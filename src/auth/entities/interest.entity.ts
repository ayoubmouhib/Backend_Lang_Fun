import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { User } from 'src/user/entities/user.entity';

@Entity('interests')
export class Interest {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 100 })
    name: string;

    @Column({ length: 100 })
    icon: string;

    @ManyToMany(() => User, user => user.interests)
    users: User[];
}