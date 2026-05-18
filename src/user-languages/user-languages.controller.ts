// user-languages/user-languages.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { UserLanguagesService } from './user-languages.service';
import { AuthGaurd } from 'src/garuds/auth.gaurd';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserLanguageDto } from 'src/user/dto/user-language.dto';

@Controller('user-languages')
export class UserLanguagesController {
  constructor(private readonly userLanguagesService: UserLanguagesService) {}

  // Get user's languages with levels (protected)
  @UseGuards(AuthGaurd)
  @Get('my-languages')
  async getMyLanguages(@GetUser() user: any) {
    return this.userLanguagesService.getUserLanguages(user.userId);
  }

  // Update all user's languages (replace)
  @UseGuards(AuthGaurd)
  @Put('my-languages')
  async updateMyLanguages(
    @GetUser() user: any,
    @Body('languages') languages: UserLanguageDto[]
  ) {
    return this.userLanguagesService.updateUserLanguages(user.userId, languages);
  }

  // Add a single language
  @UseGuards(AuthGaurd)
  @Post('add')
  async addLanguage(
    @GetUser() user: any,
    @Body() languageDto: UserLanguageDto
  ) {
    return this.userLanguagesService.addLanguage(user.userId, languageDto);
  }

  // Update language level
  @UseGuards(AuthGaurd)
  @Put(':languageId/level')
  async updateLanguageLevel(
    @GetUser() user: any,
    @Param('languageId') languageId: number,
    @Body('level') level: string
  ) {
    return this.userLanguagesService.updateLanguageLevel(user.userId, languageId, level);
  }

  // Remove a language
  @UseGuards(AuthGaurd)
  @Delete(':languageId')
  async removeLanguage(
    @GetUser() user: any,
    @Param('languageId') languageId: number
  ) {
    return this.userLanguagesService.removeLanguage(user.userId, languageId);
  }
}