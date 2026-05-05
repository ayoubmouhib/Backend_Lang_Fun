import { Injectable } from '@nestjs/common';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { Language } from './entities/language.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class LanguagesService {


  constructor(
      @InjectRepository(Language)
      private langaguesRepository : Repository<Language>
    ){}


  create(createLanguageDto: CreateLanguageDto) {
    return 'This action adds a new language';
  }

  findAll(): Promise<Language[]>{
    // This action returns all languages
    return this.langaguesRepository.find();
  }

  findOne(id: number) {
    return `This action returns a #${id} language`;
  }

  update(id: number, updateLanguageDto: UpdateLanguageDto) {
    return `This action updates a #${id} language`;
  }

  remove(id: number) {
    return `This action removes a #${id} language`;
  }
}
