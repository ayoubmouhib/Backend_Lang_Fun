import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { AddUserLanguageDto } from './dto/add-user-language.dto';
import { AuthGuard } from 'src/garuds/auth.gaurd';

const PROFILE_PICTURE_DIR = './uploads/profile-pictures';
const ALLOWED_IMAGE_TYPES = /^image\/(jpe?g|png|webp|gif)$/;

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(AuthGuard)
  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @UseGuards(AuthGuard)
  @Get('leaderboard')
  getLeaderboard(
    @Req() req: any,
    @Query('period') period: string = 'week',
    @Query('category') category: string = 'xp',
  ) {
    const currentUserId = Number(req.user?.id ?? req.userId ?? 0);
    return this.userService.getLeaderboard(period, category, currentUserId);
  }

  @UseGuards(AuthGuard)
  @Get('search')
  searchUsers(@Req() req: any, @Query('q') query: string = '') {
    const currentUserId = Number(req.user?.id ?? req.userId ?? 0);
    return this.userService.searchUsers(query, currentUserId);
  }

  @UseGuards(AuthGuard)
  @Get(':id/public-profile')
  getPublicProfile(@Req() req: any, @Param('id') id: string) {
    const viewerId = Number(req.user?.id ?? req.userId ?? 0);
    return this.userService.getPublicProfile(+id, viewerId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @UseGuards(AuthGuard)
  @Post(':id/languages')
  addLanguage(@Param('id') id: string, @Body() dto: AddUserLanguageDto) {
    return this.userService.addLanguage(+id, dto);
  }

  @UseGuards(AuthGuard)
  @Post(':id/profile-picture')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: PROFILE_PICTURE_DIR,
        filename: (req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `user-${req.params.id}-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!ALLOWED_IMAGE_TYPES.test(file.mimetype)) {
          cb(new BadRequestException('Only image files (jpg, png, webp, gif) are allowed'), false);
          return;
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadProfilePicture(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.userService.updateProfilePicture(+id, file.filename);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
