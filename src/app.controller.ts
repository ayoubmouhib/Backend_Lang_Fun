import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { request } from 'http';
import { AuthGaurd } from './garuds/auth.gaurd';

@UseGuards(AuthGaurd) // we can use this in any places
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
/*
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
*/
  @Get()
  someProtectedRout(@Req() req){
    return {message : 'Accessed Resource', userId: req.userId};
  }

 
}
