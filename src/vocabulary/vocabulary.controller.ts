import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { VocabularyService } from './vocabulary.service';
import { CreateVocabularyEntryDto } from './dto/create-vocabulary-entry.dto';
import { UpdateVocabularyEntryDto } from './dto/update-vocabulary-entry.dto';
import { AuthGuard } from '../garuds/auth.gaurd';

const VOCABULARY_AUDIO_DIR = './uploads/vocabulary-audio';
const ALLOWED_AUDIO_TYPES = /^audio\//;

@Controller('vocabulary')
@UseGuards(AuthGuard)
export class VocabularyController {
  constructor(private readonly vocabularyService: VocabularyService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.vocabularyService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.vocabularyService.findOne(req.user.id, id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateVocabularyEntryDto) {
    return this.vocabularyService.create(req.user.id, dto);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVocabularyEntryDto,
  ) {
    return this.vocabularyService.update(req.user.id, id, dto);
  }

  @Post(':id/audio')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: VOCABULARY_AUDIO_DIR,
        filename: (req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `vocab-${req.params.id}-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!ALLOWED_AUDIO_TYPES.test(file.mimetype)) {
          cb(new BadRequestException('Only audio files are allowed'), false);
          return;
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadAudio(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.vocabularyService.setAudio(req.user.id, id, file.filename);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.vocabularyService.remove(req.user.id, id);
  }
}
