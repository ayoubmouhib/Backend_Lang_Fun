// src/quiz/quiz.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { QuizInstance } from 'src/quiz/entities/quiz-instance.entity';
import { QuizQuestionsBank, CEFRLevel, SkillCategory, QuestionType } from 'src/quiz/entities/quiz-questions-bank.entity';
import { QuizResult } from 'src/quiz/entities/quiz-result.entity';
import { QuizTemplate, QuizType } from 'src/quiz/entities/quiz-template.entity';
import { QuizUserAnswer } from 'src/quiz/entities/quiz-user-answer.entity';
import { UserLanguageProgress, InitialLevel } from 'src/user/entities/user-language-progress.entity';
import { QuizStatus } from './entities/quiz-instance.entity';

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(QuizTemplate)
    private quizTemplateRepo: Repository<QuizTemplate>,
    
    @InjectRepository(QuizQuestionsBank)
    private questionsBankRepo: Repository<QuizQuestionsBank>,
    
    @InjectRepository(QuizInstance)
    private quizInstanceRepo: Repository<QuizInstance>,
    
    @InjectRepository(QuizUserAnswer)
    private userAnswerRepo: Repository<QuizUserAnswer>,
    
    @InjectRepository(QuizResult)
    private resultRepo: Repository<QuizResult>,
    
    @InjectRepository(UserLanguageProgress)
    private progressRepo: Repository<UserLanguageProgress>,
  ) {}

  // 🔥 1. Get current active quiz for user
  async getAvailableQuiz(userId: number, languageId: number) {
    const userProgress = await this.progressRepo.findOne({
      where: { user_id: userId, language_id: languageId }
    });

    if (!userProgress) {
      throw new NotFoundException('User language not found');
    }

    const quizType = userProgress.level_verified ? QuizType.PROGRESS_CHECK : QuizType.PLACEMENT;

    const activeQuiz = await this.quizTemplateRepo.findOne({
      where: {
        language_id: languageId,
        quiz_type: quizType,
        is_currently_active: true
      }
    });

    if (!activeQuiz) {
      throw new NotFoundException('No active quiz available');
    }

    const existingInstance = await this.quizInstanceRepo.findOne({
      where: {
        user_id: userId,
        template_id: activeQuiz.id,
        status: In([QuizStatus.NOT_STARTED, QuizStatus.IN_PROGRESS])
      }
    });

    if (existingInstance && existingInstance.status === QuizStatus.IN_PROGRESS) {
      return this.getQuizInstance(existingInstance.id);
    }

    return this.createQuizInstance(userId, activeQuiz.id, languageId);
  }

  // 🔥 2. Create quiz instance
  async createQuizInstance(userId: number, templateId: number, languageId: number) {
    const template = await this.quizTemplateRepo.findOne({
      where: { id: templateId }
    });

    if (!template) {
      throw new NotFoundException('Quiz template not found');
    }

    const userProgress = await this.progressRepo.findOne({
      where: { user_id: userId, language_id: languageId }
    });

     if (!userProgress) {
      throw new NotFoundException('User language progress not found');
    }

    const levelBefore = userProgress.level_verified
      ? `${userProgress.cefr_level}.${userProgress.sub_level}`
      : userProgress.initial_level;

    const selectedQuestions = await this.selectQuestionsForQuiz(template, userProgress);

    const instance = this.quizInstanceRepo.create({
      user_id: userId,
      template_id: templateId,
      language_id: languageId,
      selected_questions: selectedQuestions,
      level_before: levelBefore,
      status: QuizStatus.NOT_STARTED,
    });

    await this.quizInstanceRepo.save(instance);

    const questions = await this.getQuestionsForInstance(instance.id);

    return {
      quiz_instance_id:   instance.id,
      title:              template.title,
      description:        template.description,
      total_questions:    questions.length,   // actual count, not template default
      time_limit_minutes: template.time_limit_minutes,
      xp_reward:          template.xp_reward_base,
      questions,
    };
  }

  // 🔥 3. SMART QUESTION SELECTION
  async selectQuestionsForQuiz(
    template: QuizTemplate,
    userProgress: UserLanguageProgress
  ): Promise<{ question_id: number; order: number }[]> {
    const distribution = template.question_distribution;
    const selectedQuestions: { question_id: number; order: number }[] = [];

    let targetLevels: string[];
    
    if (!userProgress.level_verified) {
      targetLevels = ['A1', 'A2', 'B1', 'B2', 'C1'];
    } else {
      const currentLevel = userProgress.cefr_level || 'A1';
      targetLevels = this.getAdjacentLevels(currentLevel);
    }

    let orderCounter = 1;

    for (const [skill, count] of Object.entries(distribution)) {
      if (skill === 'difficulty_distribution') continue;

      const questions = await this.questionsBankRepo.find({
        where: {
          language_id: template.language_id,
          skill_category: skill as SkillCategory,
          target_cefr_level: In(targetLevels as CEFRLevel[]),
          is_active: true
        },
        order: { actual_difficulty: 'ASC' },
        take: (count as number) * 2
      });

      const shuffled = this.shuffleArray([...questions]); // 🔥 FIX: Clone array before sort
      const selected = shuffled.slice(0, count as number);

      selected.forEach((q) => {
        selectedQuestions.push({
          question_id: q.id,
          order: orderCounter++
        });
      });
    }

    return selectedQuestions;
  }

  private getAdjacentLevels(currentLevel: string): string[] {
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const currentIndex = levels.indexOf(currentLevel);
    
    if (currentIndex === -1) return levels; // 🔥 FIX: Handle invalid level
    
    const start = Math.max(0, currentIndex - 1);
    const end = Math.min(levels.length, currentIndex + 2);
    
    return levels.slice(start, end);
  }

  // 🔥 4. Start quiz
  async startQuiz(quizInstanceId: number) {
    const instance = await this.quizInstanceRepo.findOne({
      where: { id: quizInstanceId }
    });

    if (!instance) {
      throw new NotFoundException('Quiz instance not found');
    }

    instance.status = QuizStatus.IN_PROGRESS;
    instance.started_at = new Date();
    
    await this.quizInstanceRepo.save(instance);

    return { message: 'Quiz started', started_at: instance.started_at };
  }

  // 🔥 5. Submit answer
  async submitAnswer(
    quizInstanceId: number,
    questionId: number,
    userAnswer: string,
    timeSpentSeconds: number
  ) {
    const question = await this.questionsBankRepo.findOne({
      where: { id: questionId }
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const isCorrect = this.checkAnswer(question, userAnswer);

    const answer = this.userAnswerRepo.create({
      quiz_instance_id: quizInstanceId,
      question_id: questionId,
      user_answer: userAnswer,
      is_correct: isCorrect,
      time_spent_seconds: timeSpentSeconds
    });

    await this.userAnswerRepo.save(answer);
    await this.updateQuestionStats(questionId, isCorrect);

    return {
      is_correct: isCorrect,
      correct_answer: question.correct_answer,
      explanation: question.explanation
    };
  }

  private checkAnswer(question: QuizQuestionsBank, userAnswer: string): boolean {
    if (!userAnswer) return false;

    // Strip trailing punctuation and collapse internal whitespace so minor
    // differences in translation phrasing do not mark a correct answer wrong.
    const normalize = (s: string) =>
      s.toLowerCase()
       .trim()
       .replace(/[.,!?;:…]+$/g, '')   // remove trailing punctuation
       .replace(/\s+/g, ' ');          // collapse whitespace

    const normalizedUser = normalize(userAnswer);

    const correctAnswers = [
      normalize(question.correct_answer),
      ...(question.alternative_answers || []).map(normalize),
    ];

    return correctAnswers.includes(normalizedUser);
  }

  // 🔥 6. Complete quiz
  async completeQuiz(quizInstanceId: number) {
    const instance = await this.quizInstanceRepo.findOne({
      where: { id: quizInstanceId },
      relations: ['template']
    });

    if (!instance) {
      throw new NotFoundException('Quiz instance not found');
    }

    const answers = await this.userAnswerRepo.find({
      where: { quiz_instance_id: quizInstanceId },
      relations: ['question']
    });

    const totalQuestions = answers.length;
    const correctAnswers = answers.filter(a => a.is_correct).length;
    const incorrectAnswers = totalQuestions - correctAnswers;
    const scorePercentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    const calculatedLevel = this.calculateLevelFromPerformance(answers, instance.template);

    const userProgress = await this.progressRepo.findOne({
      where: { 
        user_id: instance.user_id, 
        language_id: instance.language_id 
      }
    });

    const previousLevel = instance.level_before;
    const newLevel = `${calculatedLevel.cefr}.${calculatedLevel.sub}`;
    const leveledUp = this.compareLevels(newLevel, previousLevel) > 0;

    const baseXP = instance.template.xp_reward_base;
    const perfectBonus = scorePercentage === 100 ? instance.template.xp_reward_perfect - baseXP : 0;
    const xpEarned = baseXP + perfectBonus;

    const performanceBySkill = this.calculatePerformanceBySkill(answers);
    const performanceByLevel = this.calculatePerformanceByLevel(answers);

    instance.status = QuizStatus.COMPLETED;
    instance.completed_at = new Date();
    instance.time_taken_seconds = instance.started_at 
      ? Math.floor((instance.completed_at.getTime() - instance.started_at.getTime()) / 1000)
      : 0;
    
    await this.quizInstanceRepo.save(instance);

    const result = this.resultRepo.create({
      quiz_instance_id: quizInstanceId,
      user_id: instance.user_id,
      language_id: instance.language_id,
      total_questions: totalQuestions,
      correct_answers: correctAnswers,
      incorrect_answers: incorrectAnswers,
      score_percentage: scorePercentage,
      calculated_cefr_level: calculatedLevel.cefr as CEFRLevel, // 🔥 FIX: Cast to enum
      calculated_sub_level: calculatedLevel.sub,
      previous_level: previousLevel,
      new_level: newLevel,
      leveled_up: leveledUp,
      performance_by_skill: performanceBySkill,
      performance_by_level: performanceByLevel,
      xp_earned: xpEarned,
      time_taken_seconds: instance.time_taken_seconds
    });

    await this.resultRepo.save(result);
    await this.updateUserProgress(instance.user_id, instance.language_id, calculatedLevel, xpEarned, scorePercentage);

    return {
      result_id: result.id,
      score_percentage: scorePercentage,
      correct_answers: correctAnswers,
      total_questions: totalQuestions,
      previous_level: previousLevel,
      new_level: newLevel,
      leveled_up: leveledUp,
      xp_earned: xpEarned,
      performance_by_skill: performanceBySkill,
      performance_by_level: performanceByLevel
    };
  }

  // 🔥 7. LEVEL CALCULATION
  private calculateLevelFromPerformance(
    answers: QuizUserAnswer[],
    template: QuizTemplate
  ): { cefr: string, sub: number } {
    const performanceByLevel: Record<string, { correct: number; total: number }> = {};

    for (const answer of answers) {
      if (!answer.question) continue; // 🔥 FIX: Skip if question relation missing
      
      const level = answer.question.target_cefr_level;
      if (!performanceByLevel[level]) {
        performanceByLevel[level] = { correct: 0, total: 0 };
      }
      performanceByLevel[level].total++;
      if (answer.is_correct) {
        performanceByLevel[level].correct++;
      }
    }

    const levelPercentages = Object.entries(performanceByLevel).map(
      ([level, stats]) => ({
        level,
        percentage: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
      })
    );

    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    let determinedLevel = 'A1';
    let determinedSub = 1;

    for (let i = levels.length - 1; i >= 0; i--) {
      const levelData = levelPercentages.find(lp => lp.level === levels[i]);
      if (levelData && levelData.percentage >= 70) {
        determinedLevel = levels[i];
        
        if (levelData.percentage >= 90) determinedSub = 6;
        else if (levelData.percentage >= 83) determinedSub = 5;
        else if (levelData.percentage >= 76) determinedSub = 3;
        else determinedSub = 1;
        
        break;
      }
    }

    return { cefr: determinedLevel, sub: determinedSub };
  }

  // Update user progress
  private async updateUserProgress(
    userId: number,
    languageId: number,
    level: { cefr: string, sub: number },
    xpEarned: number,
    score: number
  ) {
    const progress = await this.progressRepo.findOne({
      where: { user_id: userId, language_id: languageId }
    });

    if (!progress) {
      throw new NotFoundException('User progress not found');
    }

    progress.cefr_level = level.cefr as CEFRLevel;
    progress.sub_level = level.sub;
    progress.level_verified = true;
    progress.verified_at = new Date();
    progress.xp_points += xpEarned;
    progress.last_assessment_date = new Date();
    progress.last_assessment_score = score;
    
    // 🔥 FIX: Update streak logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastActivity = progress.last_activity_date ? new Date(progress.last_activity_date) : null;
    if (lastActivity) lastActivity.setHours(0, 0, 0, 0);

    if (!lastActivity) {
      progress.current_streak_days = 1;
    } else {
      const diffTime = today.getTime() - lastActivity.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        // Same day, don't increment
      } else if (diffDays === 1) {
        progress.current_streak_days++;
        if (progress.current_streak_days > progress.longest_streak_days) {
          progress.longest_streak_days = progress.current_streak_days;
        }
      } else {
        progress.current_streak_days = 1;
      }
    }
    
    progress.last_activity_date = new Date();

    await this.progressRepo.save(progress);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]; // 🔥 FIX: Create copy
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private compareLevels(level1: string, level2: string): number {
    const parseLevel = (level: string) => {
      if (level === 'beginner') return 15;
      if (level === 'intermediate') return 35;
      if (level === 'advanced') return 55;
      
      const parts = level.split('.');
      const cefr = parts[0];
      const sub = parts[1] ? parseInt(parts[1]) : 1;
      const cefrNum = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].indexOf(cefr) + 1;
      return cefrNum * 10 + sub;
    };

    return parseLevel(level1) - parseLevel(level2);
  }

  private isConsecutiveDay(date1: string, date2: string): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1;
  }

  private calculatePerformanceBySkill(answers: QuizUserAnswer[]): Record<string, { correct: number; total: number; percentage: number }> {
    const skills: Record<string, { correct: number; total: number }> = {};
    
    for (const answer of answers) {
      if (!answer.question) continue;
      const skill = answer.question.skill_category;
      if (!skills[skill]) skills[skill] = { correct: 0, total: 0 };
      skills[skill].total++;
      if (answer.is_correct) skills[skill].correct++;
    }

    const result: Record<string, { correct: number; total: number; percentage: number }> = {};
    for (const skill in skills) {
      result[skill] = {
        ...skills[skill],
        percentage: skills[skill].total > 0 ? (skills[skill].correct / skills[skill].total) * 100 : 0
      };
    }
    return result;
  }

  private calculatePerformanceByLevel(answers: QuizUserAnswer[]): Record<string, { correct: number; total: number; percentage: number }> {
    const levels: Record<string, { correct: number; total: number }> = {};
    
    for (const answer of answers) {
      if (!answer.question) continue;
      const level = answer.question.target_cefr_level;
      if (!levels[level]) levels[level] = { correct: 0, total: 0 };
      levels[level].total++;
      if (answer.is_correct) levels[level].correct++;
    }

    const result: Record<string, { correct: number; total: number; percentage: number }> = {};
    for (const level in levels) {
      result[level] = {
        ...levels[level],
        percentage: levels[level].total > 0 ? (levels[level].correct / levels[level].total) * 100 : 0
      };
    }
    return result;
  }

  private async updateQuestionStats(questionId: number, wasCorrect: boolean) {
    const question = await this.questionsBankRepo.findOne({
      where: { id: questionId }
    });

    if (!question) return; // 🔥 FIX: Handle missing question

    question.times_used++;
    if (wasCorrect) {
      question.times_correct++;
    } else {
      question.times_incorrect++;
    }

    question.actual_difficulty = question.times_used > 0
      ? (question.times_incorrect / question.times_used) * 100
      : 50;

    await this.questionsBankRepo.save(question);
  }

  // 🔥 PUBLIC METHODS for controller

  async getQuizResult(quizInstanceId: number) {
    const result = await this.resultRepo.findOne({
      where: { quiz_instance_id: quizInstanceId },
    });
    
    if (!result) {
      throw new NotFoundException('Quiz result not found');
    }
    
    return result;
  }
  /*

  async getUserQuizHistory(userId: number, languageId: number) {
    return this.resultRepo.find({
      where: { user_id: userId, language_id: languageId },
      order: { completed_at: 'DESC' },
    });
  }
*/
async getUserQuizHistory(userId: number, languageId: number) {
  const results = await this.resultRepo.find({
    where: { user_id: userId, language_id: languageId },
    order: { completed_at: 'DESC' },
  });
  return { history: results }; // wrap it
}
  async getQuizInstance(quizInstanceId: number) {
    const instance = await this.quizInstanceRepo.findOne({
      where: { id: quizInstanceId },
      relations: ['template'],
    });

    if (!instance) {
      throw new NotFoundException('Quiz instance not found');
    }

    const questions = await this.getQuestionsForInstance(quizInstanceId);

    return {
      quiz_instance_id:   instance.id,
      status:             instance.status,
      title:              instance.template?.title || '',
      description:        instance.template?.description || null,
      total_questions:    questions.length,   // actual count
      time_limit_minutes: instance.template?.time_limit_minutes || 0,
      xp_reward:          instance.template?.xp_reward_base || 50,
      questions,
    };
  }

  private async getQuestionsForInstance(quizInstanceId: number) {
    const instance = await this.quizInstanceRepo.findOne({
      where: { id: quizInstanceId },
    });
    
    if (!instance || !instance.selected_questions) return [];
    
    const questionIds = instance.selected_questions.map(q => q.question_id);
    
    if (questionIds.length === 0) return [];
    
    const questions = await this.questionsBankRepo.findBy({
      id: In(questionIds),
    });
    
    const orderedQuestions = instance.selected_questions.map(selected => {
      const question = questions.find(q => q.id === selected.question_id);
      if (!question) return null;

      const isTranslation =
        question.question_type === QuestionType.TRANSLATION_TO_TARGET ||
        question.question_type === QuestionType.TRANSLATION_TO_NATIVE;

      // For true/false questions with no stored options, supply them here
      const resolvedOptions =
        question.question_type === QuestionType.TRUE_FALSE
          ? ['True', 'False']
          : question.question_type === QuestionType.MULTIPLE_CHOICE
          ? question.options ?? null
          : null;

      return {
        order:             selected.order,
        question_id:       question.id,
        question_text:     question.question_text,
        question_type:     question.question_type,
        options:           resolvedOptions,
        skill_category:    question.skill_category,
        target_cefr_level: question.target_cefr_level,
        // Translation-specific fields
        source_sentence:   isTranslation ? (question.source_sentence ?? null) : null,
        source_language:   isTranslation ? (question.source_language ?? null) : null,
        target_language:   isTranslation ? (question.target_language ?? null) : null,
        // Hint shown to the user for any question type
        hint:              question.hint ?? null,
        // Explanation always returned so feedback banner can show it immediately
        explanation:       question.explanation ?? null,
      };
    }).filter(q => q !== null);

    return orderedQuestions;
  }
}