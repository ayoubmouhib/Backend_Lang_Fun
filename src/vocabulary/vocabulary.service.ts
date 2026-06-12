import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VocabularyEntry } from './entities/vocabulary-entry.entity';
import { CreateVocabularyEntryDto } from './dto/create-vocabulary-entry.dto';
import { UpdateVocabularyEntryDto } from './dto/update-vocabulary-entry.dto';

@Injectable()
export class VocabularyService {
  constructor(
    @InjectRepository(VocabularyEntry) private entryRepo: Repository<VocabularyEntry>,
  ) {}

  findAll(userId: number) {
    return this.entryRepo.find({
      where: { user_id: userId },
      relations: ['language'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(userId: number, id: number) {
    const entry = await this.entryRepo.findOne({
      where: { id, user_id: userId },
      relations: ['language'],
    });
    if (!entry) {
      throw new NotFoundException(`Vocabulary entry #${id} not found`);
    }
    return entry;
  }

  create(userId: number, dto: CreateVocabularyEntryDto) {
    const entry = this.entryRepo.create({
      user_id: userId,
      word: dto.word,
      translation: dto.translation,
      example: dto.example ?? null,
      language_id: dto.language_id ?? null,
    });
    return this.entryRepo.save(entry);
  }

  async update(userId: number, id: number, dto: UpdateVocabularyEntryDto) {
    const entry = await this.findOne(userId, id);
    Object.assign(entry, {
      ...(dto.word !== undefined && { word: dto.word }),
      ...(dto.translation !== undefined && { translation: dto.translation }),
      ...(dto.example !== undefined && { example: dto.example }),
      ...(dto.language_id !== undefined && { language_id: dto.language_id }),
    });
    return this.entryRepo.save(entry);
  }

  async setAudio(userId: number, id: number, audioPath: string) {
    const entry = await this.findOne(userId, id);
    entry.audio_path = audioPath;
    return this.entryRepo.save(entry);
  }

  async remove(userId: number, id: number) {
    const entry = await this.findOne(userId, id);
    await this.entryRepo.remove(entry);
    return { success: true };
  }
}
