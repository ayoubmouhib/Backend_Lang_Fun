import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { JwtService } from '@nestjs/jwt';
import { IncomingMessage } from 'http';

@WebSocketGateway()
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // userId → connected socket
  private readonly userSockets = new Map<number, WebSocket>();

  constructor(private readonly jwtService: JwtService) {}

  // ─── Lifecycle ──────────────────────────────────────────────────────────

  async handleConnection(client: WebSocket, req: IncomingMessage) {
    try {
      const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      if (!token) { client.close(1008, 'Missing token'); return; }

      const payload = this.jwtService.verify<{ userId: number }>(token);
      const userId = payload.userId;
      (client as any)._userId = userId;
      this.userSockets.set(userId, client);
    } catch {
      client.close(1008, 'Invalid token');
    }
  }

  handleDisconnect(client: WebSocket) {
    const userId: number | undefined = (client as any)._userId;
    if (userId) this.userSockets.delete(userId);
  }

  // ─── Subscribed messages ────────────────────────────────────────────────

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: WebSocket) {
    this._send(client, 'pong', {});
  }

  @SubscribeMessage('join_conversation')
  handleJoin(@ConnectedSocket() client: WebSocket, @MessageBody() data: any) {
    const rooms: Set<number> = (client as any)._rooms ?? new Set();
    rooms.add(Number(data?.conversation_id));
    (client as any)._rooms = rooms;
  }

  @SubscribeMessage('leave_conversation')
  handleLeave(@ConnectedSocket() client: WebSocket, @MessageBody() data: any) {
    const rooms: Set<number> = (client as any)._rooms ?? new Set();
    rooms.delete(Number(data?.conversation_id));
  }

  // ─── Push helpers ────────────────────────────────────────────────────────

  sendToUser(userId: number, event: string, data: unknown): boolean {
    const socket = this.userSockets.get(userId);
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ event, data }));
      return true;
    }
    return false;
  }

  broadcastToConversation(conversationId: number, event: string, data: unknown, excludeUserId?: number) {
    for (const [userId, socket] of this.userSockets.entries()) {
      if (userId === excludeUserId) continue;
      const rooms: Set<number> = (socket as any)._rooms ?? new Set();
      if (rooms.has(conversationId) && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ event, data }));
      }
    }
  }

  private _send(client: WebSocket, event: string, data: unknown) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ event, data }));
    }
  }
}
