// src/games/games.controller.ts
import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { GamesService } from './games.service';
import { StartGameDto, SubmitGameRoundDto } from './dto';

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  // 🔥 1. Games available for a user/language
  @Get('available/:userId/:languageId')
  async getAvailableGames(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('languageId', ParseIntPipe) languageId: number,
  ) {
    return this.gamesService.getAvailableGames(userId, languageId);
  }

  // 🔥 2. Start a new game session
  @Post('start/:userId')
  async startGame(@Param('userId', ParseIntPipe) userId: number, @Body() dto: StartGameDto) {
    return this.gamesService.startGame(userId, dto.language_id, dto.game_type, dto.round_count);
  }

  // 🔥 3. Submit the answer for the current round
  @Post(':sessionId/answer')
  async submitRound(@Param('sessionId', ParseIntPipe) sessionId: number, @Body() dto: SubmitGameRoundDto) {
    return this.gamesService.submitRound(sessionId, dto.round_index, dto.user_answer, dto.time_spent_seconds);
  }

  // 🔥 4. Complete the game and persist the result
  @Post(':sessionId/complete')
  async completeGame(@Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.gamesService.completeGame(sessionId);
  }

  // 🔥 5. Resume / inspect a session
  @Get('session/:sessionId')
  async getGameSession(@Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.gamesService.getGameSession(sessionId);
  }

  // 🔥 6. Result of a finished session
  @Get('result/:sessionId')
  async getGameResult(@Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.gamesService.getGameResult(sessionId);
  }

  // 🔥 7. History for a user/language
  @Get('history/:userId/:languageId')
  async getGameHistory(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('languageId', ParseIntPipe) languageId: number,
  ) {
    return this.gamesService.getGameHistory(userId, languageId);
  }
}
