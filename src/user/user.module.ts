import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserLanguage } from './entities/user-language.entity';
import { UserLanguageProgress } from './entities/user-language-progress.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserLanguage, UserLanguageProgress])],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
