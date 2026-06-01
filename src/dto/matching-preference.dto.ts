// src/dto/matching-preference.dto.ts
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsArray,
  Matches,
  Min,
  Max,
} from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export class MatchingPreferenceDto {
  @IsEnum(['text', 'voice', 'video'])
  @IsOptional()
  preferred_session_type?: 'text' | 'voice' | 'video';

  @IsInt()
  @Min(5)
  @Max(300)
  @IsOptional()
  min_session_duration_minutes?: number;

  @IsInt()
  @Min(5)
  @Max(300)
  @IsOptional()
  max_session_duration_minutes?: number;

  @IsOptional()
  preferred_timezone?: string;

  @IsInt()
  @Min(13)
  @Max(100)
  @IsOptional()
  age_range_min?: number;

  @IsInt()
  @Min(13)
  @Max(100)
  @IsOptional()
  age_range_max?: number;

  @IsInt()
  @Min(0)
  @Max(4)
  @IsOptional()
  level_flexibility?: number;

  @IsOptional()
  must_share_interests?: boolean;

  @IsArray()
  @IsOptional()
  available_days?: string[];

  @Matches(TIME_PATTERN)
  @IsOptional()
  available_hours_start?: string;

  @Matches(TIME_PATTERN)
  @IsOptional()
  available_hours_end?: string;
}
