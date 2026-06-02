// src/matching/controllers/blocked-user.controller.ts

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
  HttpCode,
} from '@nestjs/common';
import { BlockedUserService } from './services/blocked-user.service';
import { BlockUserDto, UnblockUserDto } from '../dto/block-user.dto';
import { AuthGuard } from '../garuds/auth.gaurd';

@Controller('blocked-users')
@UseGuards(AuthGuard)
export class BlockedUserController {
  constructor(private readonly blockedUserService: BlockedUserService) {}

  // 🔥 BLOCK A USER
  @Post('block')
  @HttpCode(201)
  async blockUser(@Req() req: any, @Body() dto: BlockUserDto) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.blockedUserService.blockUser(userId, dto);
  }

  // 🔥 UNBLOCK A USER
  @Post('unblock')
  @HttpCode(200)
  async unblockUser(@Req() req: any, @Body() dto: UnblockUserDto) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.blockedUserService.unblockUser(userId, dto);
  }

  // 🔥 GET MY BLOCKED USERS
  @Get('my-blocks')
  async getMyBlockedUsers(@Req() req: any) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    const blockedUsers = await this.blockedUserService.getBlockedUsers(userId);

    return {
      total: blockedUsers.length,
      blocked_users: blockedUsers,
    };
  }

  // 🔥 GET WHO BLOCKED ME
  @Get('blockers')
  async getBlockers(@Req() req: any) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    const blockers = await this.blockedUserService.getBlockers(userId);

    return {
      total: blockers.length,
      blockers,
    };
  }

  // 🔥 CHECK IF SPECIFIC USER IS BLOCKED
  @Get('check/:userId')
  async checkIfBlocked(
    @Req() req: any,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    const myId = req.user?.id || req.userId;

    if (!myId) {
      throw new Error('User ID not found');
    }

    const isBlocked = await this.blockedUserService.isUserBlocked(myId, userId);

    return {
      is_blocked: isBlocked,
      blocked_user_id: userId,
    };
  }

  // 🔥 UPDATE BLOCK REASON
  @Post(':blockedUserId/reason')
  @HttpCode(200)
  async updateBlockReason(
    @Req() req: any,
    @Param('blockedUserId', ParseIntPipe) blockedUserId: number,
    @Body() body: { reason: string },
  ) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.blockedUserService.updateBlockReason(
      userId,
      blockedUserId,
      body.reason,
    );
  }

  // 🔥 DELETE BLOCK (same as unblock)
  @Delete(':blockedUserId')
  @HttpCode(200)
  async deleteBlock(
    @Req() req: any,
    @Param('blockedUserId', ParseIntPipe) blockedUserId: number,
  ) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.blockedUserService.unblockUser(userId, {
      blocked_user_id: blockedUserId,
    });
  }
}