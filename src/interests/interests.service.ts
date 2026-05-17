// interests/interests.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Interest } from 'src/auth/entities/interest.entity';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class InterestsService {
  constructor(
    @InjectRepository(Interest)
    private interestsRepository: Repository<Interest>,

    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  // Get all interests
  async findAll(): Promise<Interest[]> {
    return this.interestsRepository.find({
      order: { name: 'ASC' }
    });
  }

  // Get user's interests
  async getUserInterests(userId: number): Promise<Interest[]> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['interests'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.interests;
  }

  // Update user's interests (replace all)
  async updateUserInterests(userId: number, interestIds: number[]) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['interests'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate all interest IDs exist
    const interests = await this.interestsRepository.findBy({
      id: In(interestIds)
    });

    if (interests.length !== interestIds.length) {
      throw new BadRequestException('One or more interest IDs are invalid');
    }

    // Replace interests
    user.interests = interests;
    await this.usersRepository.save(user);

    return {
      message: 'Interests updated successfully',
      interests: interests
    };
  }

  // Add single interest to user
  async addInterestToUser(userId: number, interestId: number) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['interests'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const interest = await this.interestsRepository.findOne({
      where: { id: interestId }
    });

    if (!interest) {
      throw new NotFoundException('Interest not found');
    }

    // Check if already has this interest
    const hasInterest = user.interests.some(i => i.id === interestId);
    if (hasInterest) {
      throw new BadRequestException('Interest already added');
    }

    user.interests.push(interest);
    await this.usersRepository.save(user);

    return {
      message: 'Interest added successfully',
      interest: interest
    };
  }

  // Remove interest from user
  async removeInterestFromUser(userId: number, interestId: number) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['interests'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.interests = user.interests.filter(i => i.id !== interestId);
    await this.usersRepository.save(user);

    return {
      message: 'Interest removed successfully'
    };
  }
}