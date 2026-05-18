// user-languages/user-languages.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserLanguage } from 'src/user/entities/user-language.entity';
import { Language } from 'src/languages/entities/language.entity';
import { UserLanguageDto } from 'src/user/dto/user-language.dto';

@Injectable()
export class UserLanguagesService {
  constructor(
    @InjectRepository(UserLanguage)
    private userLanguagesRepository: Repository<UserLanguage>,

    @InjectRepository(Language)
    private languagesRepository: Repository<Language>,
  ) {}

  async getUserLanguages(userId: number) {
    const userLanguages = await this.userLanguagesRepository.find({
      where: { user_id: userId },
      relations: ['language'],
      order: { created_at: 'ASC' }
    });

    return userLanguages.map(ul => ({
      id: ul.id,
      language_id: ul.language_id,
      language_name: ul.language.name,
      language_code: ul.language.iso_code,
      native_name: ul.language.native_name,
      proficiency_level: ul.proficiency_level,
      created_at: ul.created_at
    }));
  }

  async updateUserLanguages(userId: number, languages: UserLanguageDto[]) {
    // Validate all language IDs
    const languageIds = languages.map(l => l.language_id);
    const validLanguages = await this.languagesRepository.findBy({
      id: In(languageIds)
    });

    if (validLanguages.length !== languageIds.length) {
      throw new BadRequestException('One or more language IDs are invalid');
    }

    // Check for duplicates
    const uniqueIds = new Set(languageIds);
    if (uniqueIds.size !== languageIds.length) {
      throw new BadRequestException('Cannot select the same language twice');
    }

    // Delete existing user languages
    await this.userLanguagesRepository.delete({ user_id: userId });

    // Create new entries
    const userLanguageEntries = languages.map(lang => 
      this.userLanguagesRepository.create({
        user_id: userId,
        language_id: lang.language_id,
        proficiency_level: lang.level
      })
    );

    await this.userLanguagesRepository.save(userLanguageEntries);

    return {
      message: 'Languages updated successfully',
      languages: await this.getUserLanguages(userId)
    };
  }

  async addLanguage(userId: number, languageDto: UserLanguageDto) {
    // Check if already exists
    const existing = await this.userLanguagesRepository.findOne({
      where: { 
        user_id: userId, 
        language_id: languageDto.language_id 
      }
    });

    if (existing) {
      throw new BadRequestException('Language already added');
    }

    // Validate language exists
    const language = await this.languagesRepository.findOne({
      where: { id: languageDto.language_id }
    });

    if (!language) {
      throw new NotFoundException('Language not found');
    }

    const userLanguage = this.userLanguagesRepository.create({
      user_id: userId,
      language_id: languageDto.language_id,
      proficiency_level: languageDto.level
    });

    await this.userLanguagesRepository.save(userLanguage);

    return {
      message: 'Language added successfully',
      language: {
        ...userLanguage,
        language_name: language.name,
        language_code: language.iso_code
      }
    };
  }

  async updateLanguageLevel(userId: number, languageId: number, level: string) {
    const userLanguage = await this.userLanguagesRepository.findOne({
      where: { user_id: userId, language_id: languageId }
    });

    if (!userLanguage) {
      throw new NotFoundException('Language not found for this user');
    }

    userLanguage.proficiency_level = level as any;
    await this.userLanguagesRepository.save(userLanguage);

    return {
      message: 'Language level updated successfully',
      language: userLanguage
    };
  }

  async removeLanguage(userId: number, languageId: number) {
    const result = await this.userLanguagesRepository.delete({
      user_id: userId,
      language_id: languageId
    });

    if (result.affected === 0) {
      throw new NotFoundException('Language not found for this user');
    }

    return { message: 'Language removed successfully' };
  }
}