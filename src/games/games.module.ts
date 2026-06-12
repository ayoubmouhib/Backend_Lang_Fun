// src/games/games.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { GameWord } from './entities/game-word.entity';
import { GameSession } from './entities/game-session.entity';
import { UserLanguageProgress } from '../user/entities/user-language-progress.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([GameWord, GameSession, UserLanguageProgress]),
  ],
  providers: [GamesService],
  controllers: [GamesController],
  exports: [GamesService],
})
export class GamesModule {}
