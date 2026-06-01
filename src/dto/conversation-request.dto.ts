import { IsInt, IsEnum, IsNotEmpty, Min, Max, IsString, IsOptional } from 'class-validator';

export class CreateConversationRequestDto {
  @IsInt()
  @IsNotEmpty()
  requester_language_id: number;

  @IsEnum(['learner', 'native_speaker', 'both'])
  @IsNotEmpty()
  requester_role: string;
}

export class MatchConversationRequestDto {
  @IsInt()
  @IsNotEmpty()
  matched_user_id: number;

  @IsInt()
  @IsNotEmpty()
  matched_language_id: number;

  @IsEnum(['learner', 'native_speaker', 'both'])
  @IsNotEmpty()
  matched_user_role: string;
}

export class AcceptConversationRequestDto {
  @IsInt()
  @IsNotEmpty()
  request_id: number;

  @IsEnum(['text', 'voice', 'video'])
  @IsNotEmpty()
  session_type: string = 'text';
}

export class RateUserDto {
  @IsInt()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  communication_score: number;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  helpfulness_score: number;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  patience_score: number;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  overall_score: number;

  @IsString()
  @IsOptional()
  comment?: string;
}