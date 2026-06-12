// interests/interests.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { InterestsService } from './interests.service';
import { AuthGuard } from 'src/garuds/auth.gaurd'; 
import { GetUser } from 'src/auth/decorators/get-user.decorator';

@Controller('interests')
export class InterestsController {
  constructor(private readonly interestsService: InterestsService) {}

  // Get all available interests
  @Get()
  async getAllInterests() {
    return this.interestsService.findAll();
  }

  // Get user's interests (protected route)
  @UseGuards(AuthGuard)
  @Get('my-interests')
  async getMyInterests(@GetUser() user: any) {
    return this.interestsService.getUserInterests(user.userId);
  }

  // Update user's interests (protected route)
  @UseGuards(AuthGuard)
  @Put('my-interests')
  async updateMyInterests(
    @GetUser() user: any,
    @Body('interest_ids') interestIds: number[]
  ) {
    return this.interestsService.updateUserInterests(user.userId, interestIds);
  }

  // Add interest to user (protected route)
  @UseGuards(AuthGuard)
  @Post('add')
  async addInterest(
    @GetUser() user: any,
    @Body('interest_id') interestId: number
  ) {
    return this.interestsService.addInterestToUser(user.userId, interestId);
  }

  // Remove interest from user (protected route)
  @UseGuards(AuthGuard)
  @Delete(':interestId')
  async removeInterest(
    @GetUser() user: any,
    @Param('interestId') interestId: number
  ) {
    return this.interestsService.removeInterestFromUser(user.userId, interestId);
  }
}