import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Language } from './entities/language.entity';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';

@Injectable()
export class LanguagesService {
  constructor(
    @InjectRepository(Language)
    private languagesRepository: Repository<Language>,
  ) {}

  async create(dto: CreateLanguageDto): Promise<Language> {
    const existing = await this.languagesRepository.findOneBy({ iso_code: dto.iso_code });
    if (existing) {
      throw new ConflictException(`Language with iso_code "${dto.iso_code}" already exists`);
    }
    const language = this.languagesRepository.create(dto);
    return this.languagesRepository.save(language);
  }

  findAll(): Promise<Language[]> {
    return this.languagesRepository.find();
  }

  async findOne(id: number): Promise<Language> {
    const language = await this.languagesRepository.findOneBy({ id });
    if (!language) {
      throw new NotFoundException(`Language #${id} not found`);
    }
    return language;
  }

  async update(id: number, dto: UpdateLanguageDto): Promise<Language> {
    const language = await this.findOne(id);
    if (dto.iso_code && dto.iso_code !== language.iso_code) {
      const conflict = await this.languagesRepository.findOneBy({ iso_code: dto.iso_code });
      if (conflict) {
        throw new ConflictException(`Language with iso_code "${dto.iso_code}" already exists`);
      }
    }
    Object.assign(language, dto);
    return this.languagesRepository.save(language);
  }

  async remove(id: number): Promise<{ message: string }> {
    const language = await this.findOne(id);
    await this.languagesRepository.remove(language);
    return { message: `Language #${id} deleted successfully` };
  }
}
