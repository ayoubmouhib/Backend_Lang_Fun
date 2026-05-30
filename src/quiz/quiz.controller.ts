// src/quiz/quiz.controller.ts
import { Controller, Get, Post, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { QuizService } from './quiz.service';

@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  // 🔥 1. Get available quiz for user
  @Get('available/:userId/:languageId')
  async getAvailableQuiz(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('languageId', ParseIntPipe) languageId: number,
  ) {
    return this.quizService.getAvailableQuiz(userId, languageId);
  }

  // 🔥 2. Start a quiz
  @Post('start/:quizInstanceId')
  async startQuiz(
    @Param('quizInstanceId', ParseIntPipe) quizInstanceId: number,
  ) {
    return this.quizService.startQuiz(quizInstanceId);
  }

  // 🔥 3. Submit an answer
  @Post('answer/:quizInstanceId')
  async submitAnswer(
    @Param('quizInstanceId', ParseIntPipe) quizInstanceId: number,
    @Body() answerData: {
      questionId: number;
      userAnswer: string;
      timeSpentSeconds: number;
    },
  ) {
    return this.quizService.submitAnswer(
      quizInstanceId,
      answerData.questionId,
      answerData.userAnswer,
      answerData.timeSpentSeconds,
    );
  }

  // 🔥 4. Complete quiz and get results
  @Post('complete/:quizInstanceId')
  async completeQuiz(
    @Param('quizInstanceId', ParseIntPipe) quizInstanceId: number,
  ) {
    return this.quizService.completeQuiz(quizInstanceId);
  }

  // 🔥 5. Get quiz result by instance
  @Get('result/:quizInstanceId')
  async getQuizResult(
    @Param('quizInstanceId', ParseIntPipe) quizInstanceId: number,
  ) {
    return this.quizService.getQuizResult(quizInstanceId);
  }

  // 🔥 6. Get user's quiz history
  @Get('history/:userId/:languageId')
  async getUserQuizHistory(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('languageId', ParseIntPipe) languageId: number,
  ) {
    return this.quizService.getUserQuizHistory(userId, languageId);
  }

  // 🔥 7. Get quiz instance (resume)
  @Get('instance/:quizInstanceId')
  async getQuizInstance(
    @Param('quizInstanceId', ParseIntPipe) quizInstanceId: number,
  ) {
    return this.quizService.getQuizInstance(quizInstanceId);
  }
}