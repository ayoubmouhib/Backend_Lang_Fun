import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FollowsService } from './follows.service';
import { SendFollowRequestDto } from './dto/send-follow-request.dto';
import { AuthGuard } from '../garuds/auth.gaurd';

@Controller('follows')
@UseGuards(AuthGuard)
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Post('requests')
  sendRequest(@Req() req: any, @Body() dto: SendFollowRequestDto) {
    return this.followsService.sendRequest(req.user.id, dto.user_id);
  }

  @Get('requests/incoming')
  getIncoming(@Req() req: any) {
    return this.followsService.getIncomingRequests(req.user.id);
  }

  @Get('requests/outgoing')
  getOutgoing(@Req() req: any) {
    return this.followsService.getOutgoingRequests(req.user.id);
  }

  @Post('requests/:id/accept')
  @HttpCode(200)
  accept(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.followsService.acceptRequest(req.user.id, id);
  }

  @Post('requests/:id/decline')
  @HttpCode(200)
  decline(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.followsService.declineRequest(req.user.id, id);
  }

  @Delete('requests/:id')
  cancel(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.followsService.cancelRequest(req.user.id, id);
  }

  @Delete(':userId')
  unfollow(@Req() req: any, @Param('userId', ParseIntPipe) userId: number) {
    return this.followsService.unfollow(req.user.id, userId);
  }

  @Get('followers')
  getMyFollowers(@Req() req: any) {
    return this.followsService.getFollowers(req.user.id);
  }

  @Get('following')
  getMyFollowing(@Req() req: any) {
    return this.followsService.getFollowing(req.user.id);
  }

  @Get(':userId/followers')
  getFollowersOf(@Param('userId', ParseIntPipe) userId: number) {
    return this.followsService.getFollowers(userId);
  }

  @Get(':userId/following')
  getFollowingOf(@Param('userId', ParseIntPipe) userId: number) {
    return this.followsService.getFollowing(userId);
  }
}
