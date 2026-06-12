import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserLanguage } from './entities/user-language.entity';
import { UserLanguageProgress } from './entities/user-language-progress.entity';
import { Language } from '../languages/entities/language.entity';
import { FollowsModule } from '../follows/follows.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserLanguage, UserLanguageProgress, Language]),
    FollowsModule,
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
