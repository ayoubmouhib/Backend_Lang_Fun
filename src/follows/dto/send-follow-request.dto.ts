import { IsInt, IsNotEmpty } from 'class-validator';

export class SendFollowRequestDto {
  @IsInt()
  @IsNotEmpty()
  user_id: number;
}
