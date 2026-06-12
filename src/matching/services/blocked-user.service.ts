// src/matching/services/blocked-user.service.ts

import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockedUser } from '../entities/blocked-user.entity';
import { User } from '../../user/entities/user.entity';
import { BlockUserDto, UnblockUserDto } from '../../dto/block-user.dto'; 

@Injectable()
export class BlockedUserService {
  constructor(
    @InjectRepository(BlockedUser)
    private blockedUserRepo: Repository<BlockedUser>,

    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  // 🔥 BLOCK A USER
  async blockUser(
    blockerId: number,
    dto: BlockUserDto,
  ): Promise<{ message: string; blocked_user_id: number }> {
    console.log(`🚫 User ${blockerId} blocking user ${dto.blocked_user_id}`);

    // 1️⃣ Validate both users exist
    const blocker = await this.userRepo.findOne({ where: { id: blockerId } });
    if (!blocker) {
      throw new NotFoundException('Blocker user not found');
    }

    const blockedUser = await this.userRepo.findOne({
      where: { id: dto.blocked_user_id },
    });
    if (!blockedUser) {
      throw new NotFoundException('Blocked user not found');
    }

    // 2️⃣ Can't block self
    if (blockerId === dto.blocked_user_id) {
      throw new BadRequestException('You cannot block yourself');
    }

    // 3️⃣ Check if already blocked
    const existingBlock = await this.blockedUserRepo.findOne({
      where: {
        blocker_id: blockerId,
        blocked_user_id: dto.blocked_user_id,
      },
    });

    if (existingBlock) {
      throw new BadRequestException('This user is already blocked');
    }

    // 4️⃣ Create block record - 🔥 FIX: Use IDs, not entities
    const blockedRecord = this.blockedUserRepo.create({
      blocker_id: blockerId,
      blocked_user_id: dto.blocked_user_id,
      reason: dto.reason || null,
    });

    const savedRecord = await this.blockedUserRepo.save(blockedRecord);

    console.log(
      `✅ User ${blockerId} blocked user ${dto.blocked_user_id}. Record ID: ${savedRecord.id}`,
    );

    return {
      message: `User ${blockedUser.username} has been blocked`,
      blocked_user_id: dto.blocked_user_id,
    };
  }

  // 🔥 UNBLOCK A USER
  async unblockUser(
    blockerId: number,
    dto: UnblockUserDto,
  ): Promise<{ message: string }> {
    console.log(`✅ User ${blockerId} unblocking user ${dto.blocked_user_id}`);

    const blockedRecord = await this.blockedUserRepo.findOne({
      where: {
        blocker_id: blockerId,
        blocked_user_id: dto.blocked_user_id,
      },
      relations: ['blocked_user'],
    });

    if (!blockedRecord) {
      throw new NotFoundException('This user is not blocked');
    }

    await this.blockedUserRepo.remove(blockedRecord);

    console.log(
      `✅ User ${blockerId} unblocked user ${dto.blocked_user_id}`,
    );

    return {
      message: `User ${blockedRecord.blocked_user.username} has been unblocked`,
    };
  }

  // 🔥 GET BLOCKED USERS (my block list)
  async getBlockedUsers(blockerId: number): Promise<any[]> {
    console.log(`🔍 Getting blocked users for ${blockerId}`);

    const blockedUsers = await this.blockedUserRepo.find({
      where: { blocker_id: blockerId },
      relations: ['blocked_user'],
      order: { created_at: 'DESC' },
    });

    console.log(`Found ${blockedUsers.length} blocked users`);

    return blockedUsers.map((record) => ({
      id: record.id,
      blocked_user_id: record.blocked_user.id,
      username: record.blocked_user.username,
      email: record.blocked_user.email,
      name: `${record.blocked_user.first_name} ${record.blocked_user.last_name}`,
      reason: record.reason,
      blocked_at: record.created_at,
    }));
  }

  // 🔥 GET BLOCKERS (who blocked me)
  async getBlockers(userId: number): Promise<any[]> {
    console.log(`🔍 Getting users who blocked ${userId}`);

    const blockers = await this.blockedUserRepo.find({
      where: { blocked_user_id: userId },
      relations: ['blocker'],
      order: { created_at: 'DESC' },
    });

    console.log(`Found ${blockers.length} blockers`);

    return blockers.map((record) => ({
      id: record.id,
      blocker_id: record.blocker.id,
      username: record.blocker.username,
      email: record.blocker.email,
      name: `${record.blocker.first_name} ${record.blocker.last_name}`,
      blocked_at: record.created_at,
    }));
  }

  // 🔥 CHECK IF USER IS BLOCKED
  async isUserBlocked(blockerId: number, userId: number): Promise<boolean> {
    const blocked = await this.blockedUserRepo.findOne({
      where: {
        blocker_id: blockerId,
        blocked_user_id: userId,
      },
    });

    return !!blocked;
  }

  // 🔥 GET ALL BLOCKED USER IDS (for matching algorithm)
  async getBlockedUserIds(userId: number): Promise<number[]> {
    const blockedUsers = await this.blockedUserRepo.find({
      where: { blocker_id: userId },
      select: ['blocked_user_id'],
    });

    return blockedUsers.map((record) => record.blocked_user_id);
  }

  // 🔥 CHECK IF BIDIRECTIONAL BLOCK
  async isMutuallyBlocked(userId1: number, userId2: number): Promise<boolean> {
    const blocked1 = await this.isUserBlocked(userId1, userId2);
    const blocked2 = await this.isUserBlocked(userId2, userId1);

    return blocked1 && blocked2;
  }

  // 🔥 UPDATE BLOCK REASON
  async updateBlockReason(
    blockerId: number,
    blockedUserId: number,
    reason: string,
  ): Promise<{ message: string }> {
    const blockedRecord = await this.blockedUserRepo.findOne({
      where: {
        blocker_id: blockerId,
        blocked_user_id: blockedUserId,
      },
    });

    if (!blockedRecord) {
      throw new NotFoundException('This user is not blocked');
    }

    blockedRecord.reason = reason;
    await this.blockedUserRepo.save(blockedRecord);

    console.log(`✅ Updated block reason for user ${blockedUserId}`);

    return { message: 'Block reason updated successfully' };
  }

  // 🔥 NEW: GET BLOCK INFO
  async getBlockInfo(blockerId: number, blockedUserId: number): Promise<any> {
    const blockRecord = await this.blockedUserRepo.findOne({
      where: {
        blocker_id: blockerId,
        blocked_user_id: blockedUserId,
      },
      relations: ['blocked_user'],
    });

    if (!blockRecord) {
      throw new NotFoundException('Block record not found');
    }

    return {
      id: blockRecord.id,
      blocked_user_id: blockRecord.blocked_user.id,
      username: blockRecord.blocked_user.username,
      reason: blockRecord.reason,
      blocked_at: blockRecord.created_at,
    };
  }

  // 🔥 NEW: BULK CHECK IF USERS ARE BLOCKED
  async filterBlockedUsers(
    blockerId: number,
    userIds: number[],
  ): Promise<number[]> {
    const blockedRecords = await this.blockedUserRepo.find({
      where: {
        blocker_id: blockerId,
        blocked_user_id: userIds as any, // TypeORM In() operator
      },
      select: ['blocked_user_id'],
    });

    return blockedRecords.map((r) => r.blocked_user_id);
  }
}