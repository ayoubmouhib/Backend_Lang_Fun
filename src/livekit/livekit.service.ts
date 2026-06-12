import { Injectable } from '@nestjs/common';
import { AccessToken } from 'livekit-server-sdk';

@Injectable()
export class LiveKitService {
  private readonly apiKey    = process.env.LIVEKIT_API_KEY    ?? 'devkey';
  private readonly apiSecret = process.env.LIVEKIT_API_SECRET ?? 'devsecretdevsecretdevsecretdev1';
  readonly serverUrl          = process.env.LIVEKIT_URL        ?? 'ws://localhost:7880';

  async generateToken(userId: number, roomName: string): Promise<string> {
    const token = new AccessToken(this.apiKey, this.apiSecret, {
      identity: String(userId),
      ttl: '2h',
    });
    token.addGrant({
      roomJoin:       true,
      room:           roomName,
      canPublish:     true,
      canSubscribe:   true,
      canPublishData: true,
    });
    return token.toJwt();
  }

  roomNameForCall(callId: number): string {
    return `call_${callId}`;
  }
}
