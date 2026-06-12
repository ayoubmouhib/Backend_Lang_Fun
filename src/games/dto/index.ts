import { IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { GameType } from '../entities/game-session.entity';

export class StartGameDto {
  @IsInt()
  language_id: number;

  @IsEnum(GameType)
  game_type: GameType;

  @IsOptional()
  @IsInt()
  @Min(4)
  @Max(20)
  round_count?: number;
}

export class SubmitGameRoundDto {
  @IsInt()
  round_index: number;

  @IsString()
  @MinLength(1)
  user_answer: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  time_spent_seconds?: number;
}
