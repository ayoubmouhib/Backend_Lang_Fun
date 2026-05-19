import { Module } from '@nestjs/common';
import { LanguagesService } from './languages.service';
import { LanguagesController } from './languages.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Language } from './entities/language.entity';
import { UserLanguage } from 'src/user/entities/user-language.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Language, UserLanguage])],
  controllers: [LanguagesController],
  providers: [LanguagesService],
})
export class LanguagesModule {}
