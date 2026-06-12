import {
  IsString,
  IsInt,
  IsOptional,
  IsEnum,
  MaxLength,
  MinLength,
  ValidateNested,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

// Message Types
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  FILE = 'file',
}

export enum ConversationType {
  TEXT = 'text',
  AUDIO = 'audio',
  VIDEO = 'video',
  MIXED = 'mixed',
}

export enum CallType {
  AUDIO = 'audio',
  VIDEO = 'video',
}

// ═══════════════════════════════════════════════════════════
// MESSAGE DTOs
// ═══════════════════════════════════════════════════════════

export class MediaInfoDto {
  @IsString()
  @IsOptional()
  filename?: string;

  @IsInt()
  @IsOptional()
  size?: number;

  @IsInt()
  @IsOptional()
  duration?: number;

  @IsString()
  @IsOptional()
  mime_type?: string;
}

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;

  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType = MessageType.TEXT;

  @IsOptional()
  @ValidateNested()
  @Type(() => MediaInfoDto)
  media_info?: MediaInfoDto;

  @IsInt()
  @IsOptional()
  reply_to_message_id?: number;
}



export class EditMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;
}

export class ReactToMessageDto {
  @IsString()
  emoji: string;

  @IsBoolean()
  add: boolean;
}

export class PinMessageDto {
  @IsBoolean()
  pin: boolean;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class DeleteMessageDto {
  @IsString()
  @IsOptional()
  reason?: string;
}

// ═══════════════════════════════════════════════════════════
// CALL DTOs
// ═══════════════════════════════════════════════════════════

export class InitiateCallDto {
  @IsEnum(CallType)
  type: CallType;

  @IsBoolean()
  @IsOptional()
  can_be_recorded?: boolean = true;
}

export class AcceptCallDto {
  @IsString()
  @IsOptional()
  ice_candidate?: string;
}

export class EndCallDto {
  @IsInt()
  @Min(0)
  duration_seconds: number;

  @IsString()
  @IsOptional()
  end_reason?: string;
}

export class CallQualityMetricsDto {
  @IsInt()
  @IsOptional()
  bitrate?: number;

  @IsInt()
  @IsOptional()
  latency?: number;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  packet_loss?: number;

  @IsInt()
  @IsOptional()
  jitter?: number;
}

// ═══════════════════════════════════════════════════════════
// QUERY DTOs
// ═══════════════════════════════════════════════════════════

export class GetMessagesQueryDto {
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 50))
  @IsInt()
  @IsOptional()
  @Min(1)
  limit?: number = 50;

  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 0))
  @IsInt()
  @IsOptional()
  @Min(0)
  offset?: number = 0;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  sort_asc?: boolean = false;
}

export class GetCallsQueryDto {
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 20))
  @IsInt()
  @IsOptional()
  @Min(1)
  limit?: number = 20;

  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 0))
  @IsInt()
  @IsOptional()
  @Min(0)
  offset?: number = 0;
}

// ═══════════════════════════════════════════════════════════
// REPORT DTOs
// ═══════════════════════════════════════════════════════════

export class ReportConversationDto {
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  reason: string;

  @IsString()
  @IsOptional()
  message_ids?: string;
}