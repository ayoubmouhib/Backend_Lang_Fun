// src/auth/auth.guard.ts (UPDATED - Fix the typo and improve)
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {  // 🔥 Fixed typo: Gaurd -> Guard
  constructor(private jwtService: JwtService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Invalid Token');
    }

    try {
      const payload = this.jwtService.verify(token);
      
      // 🔥 SET req.user OBJECT (not just userId)
      request.user = {
        id: payload.userId, // userId from token
        userId: payload.userId,
        email: payload.email,
      };
      
      // Also set userId for backward compatibility
      request.userId = payload.userId;
      
      console.log('✅ Auth Guard - User authenticated:', request.user);
      
      return true;
    } catch (e) {
      Logger.error('Auth error:', e.message);
      throw new UnauthorizedException('Invalid Token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const auth = request.headers.authorization;
    if (!auth) return undefined;
    
    const parts = auth.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return undefined;
    }
    
    return parts[1];
  }
}