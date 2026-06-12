// src/matching/matching.controller.ts (UPDATED)
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
  Query,
  HttpCode,
} from '@nestjs/common';
import { MatchingService } from './matching.service';
import { ActiveSearchDto, CreateConversationRequestDto } from '../dto/conversation-request.dto';
import { AuthGuard } from '../garuds/auth.gaurd'; 

@Controller('matching')
@UseGuards(AuthGuard) // 🔥 YOUR GUARD
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  // 🔥 0. CASE 0 — ACTIVE SEARCH (instant match if someone is searching right now)
  @Post('request/active-search')
  async initiateActiveSearch(
    @Req() req: any,
    @Body() dto: ActiveSearchDto,
  ) {
    const userId = req.user?.id || req.userId;
    if (!userId) throw new Error('User ID not found');

    return this.matchingService.initiateActiveSearch(
      userId,
      dto.requester_language_id,
      dto.timeout_seconds ?? 600,
    );
  }

  // 🔥 0b. POLL SEARCH STATUS — User A polls this while waiting in the active pool
  @Get('search-status/:requestId')
  async getSearchStatus(
    @Req() req: any,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    const userId = req.user?.id || req.userId;
    if (!userId) throw new Error('User ID not found');

    return this.matchingService.getSearchStatus(userId, requestId);
  }

  // 🔥 1. REQUEST A CONVERSATION
  @Post('request')
  async createConversationRequest(
    @Req() req: any,
    @Body() dto: CreateConversationRequestDto,
  ) {
    // 🔥 Use req.user.id (set by your guard) or req.userId
    const userId = req.user?.id || req.userId;

    console.log('📝 Matching Request - User ID:', userId);
    console.log('📋 Language ID:', dto.requester_language_id);
    console.log('👤 Role:', dto.requester_role);

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.matchingService.createConversationRequest(userId, dto);
  }

  // 🔥 2. GET PENDING REQUESTS
  /*
  @Get('pending-requests')
  async getPendingRequests(@Req() req: any) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    const requests = await this.matchingService.getPendingRequests(userId);

    return {
      total: requests.length,
      requests: requests.map((r) => ({
        request_id: r.id,
        requester: {
          id: r.requester.id,
          name: `${r.requester.first_name} ${r.requester.last_name}`,
          email: r.requester.email,
        },
        language: r.requester_language.name,
        compatibility_score: r.compatibility_score,
        score_breakdown: r.score_breakdown,
      })),
    };
  }
    */
   // src/matching/matching.controller.ts

@Get('pending-requests')
@UseGuards(AuthGuard)
async getPendingRequests(@Req() req) {
  const userId = req.user?.id || req.userId;
  
  console.log(`\n🔥 Getting pending requests for user ${userId}`);
  
  const requests = await this.matchingService.getPendingRequests(userId);
  
  console.log(`Found ${requests.length} pending requests`);
  
  return {
    total: requests.length,
    requests,
  };
}

  // 🔥 3. GET ACTIVE CONVERSATIONS
  @Get('active')
  async getActiveConversations(@Req() req: any) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.matchingService.getActiveConversations(userId);
  }

  // 🔥 4. GET HISTORY
  @Get('history')
  async getConversationHistory(@Req() req: any) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.matchingService.getConversationHistory(userId);
  }

  // 🔥 5. ACCEPT REQUEST
  @Post('requests/:requestId/accept')
  @HttpCode(200)
  async acceptRequest(
    @Req() req: any,
    @Param('requestId', ParseIntPipe) requestId: number,
    @Body() body: { session_type?: string; planned_duration_minutes?: number },
  ) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.matchingService.acceptRequest(
      userId,
      requestId,
      body.session_type || 'text',
      body.planned_duration_minutes,
    );
  }

  // 🔥 6. REJECT REQUEST
  @Post('requests/:requestId/reject')
  @HttpCode(200)
  async rejectRequest(
    @Req() req: any,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.matchingService.rejectRequest(userId, requestId);
  }

  // 🔥 7. CANCEL REQUEST
  @Delete('requests/:requestId')
  async cancelRequest(
    @Req() req: any,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.matchingService.cancelRequest(userId, requestId);
  }

  // 🔥 8. START SESSION
  @Post('sessions/:sessionId/start')
  @HttpCode(200)
  async startSession(
    @Req() req: any,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() body: { planned_duration_minutes?: number } = {},
  ) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.matchingService.startSession(userId, sessionId, body.planned_duration_minutes);
  }

  // 🔥 9. END SESSION
  @Post('sessions/:sessionId/end')
  @HttpCode(200)
  async endSession(
    @Req() req: any,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.matchingService.endSession(userId, sessionId);
  }

  // 🔥 10. GET SESSION DETAILS
  @Get('sessions/:sessionId')
  async getSessionDetails(
    @Req() req: any,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.matchingService.getSessionDetails(userId, sessionId);
  }

  // 🔥 11. RATE USER
  @Post('sessions/:sessionId/rate')
  async rateUser(
    @Req() req: any,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body()
    ratingData: {
      communication_score: number;
      helpfulness_score: number;
      patience_score: number;
      overall_score: number;
      comment?: string;
    },
  ) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.matchingService.rateUser(userId, sessionId, ratingData);
  }

  // 🔥 12. GET RATINGS RECEIVED BY THE CURRENT USER ("My Reviews")
  @Get('ratings/received')
  async getMyRatings(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.matchingService.getUserRatings(
      userId,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }
}