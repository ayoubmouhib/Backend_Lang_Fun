// src/quiz/quiz.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { QuizQuestionsBank } from './entities/quiz-questions-bank.entity';
import { QuizTemplate } from './entities/quiz-template.entity';
import { QuizInstance } from './entities/quiz-instance.entity';
import { QuizUserAnswer } from './entities/quiz-user-answer.entity';
import { QuizResult } from './entities/quiz-result.entity';
import { UserLanguageProgress } from '../user/entities/user-language-progress.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QuizQuestionsBank,
      QuizTemplate,
      QuizInstance,
      QuizUserAnswer,
      QuizResult,
      UserLanguageProgress,
    ]),
  ],
  providers: [QuizService],
  controllers: [QuizController],
  exports: [QuizService],
})
export class QuizModule {}