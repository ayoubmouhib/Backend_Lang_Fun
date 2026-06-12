// seeds/quiz-content.seed.ts
import { DataSource } from 'typeorm';
import { Language } from 'src/languages/entities/language.entity';
import {
  QuizQuestionsBank,
  QuestionType,
  SkillCategory,
  CEFRLevel,
} from 'src/quiz/entities/quiz-questions-bank.entity';
import { QuizTemplate, QuizType } from 'src/quiz/entities/quiz-template.entity';

interface SeedQuestion {
  code: string;
  question_text: string;
  question_type: QuestionType;
  options?: string[];
  correct_answer: string;
  alternative_answers?: string[];
  explanation?: string;
  hint?: string;
  skill_category: SkillCategory;
  target_cefr_level: CEFRLevel;
  source_sentence?: string;
  source_language?: string;
  target_language?: string;
}

// ─── French ──────────────────────────────────────────────────────────────────

const FR_QUESTIONS: SeedQuestion[] = [
  // Grammar
  {
    code: 'GRAM',
    question_text: 'Choisissez la bonne forme : "Je ___ étudiant."',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['suis', 'es', 'est', 'sont'],
    correct_answer: 'suis',
    explanation: '"Je suis" is the correct conjugation of "être" for "I am".',
    skill_category: SkillCategory.GRAMMAR,
    target_cefr_level: CEFRLevel.A1,
  },
  {
    code: 'GRAM',
    question_text: 'Complétez : "Elle ___ une voiture rouge."',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['a', 'as', 'ai', 'ont'],
    correct_answer: 'a',
    explanation: '"Elle a" — third person singular of "avoir".',
    skill_category: SkillCategory.GRAMMAR,
    target_cefr_level: CEFRLevel.A1,
  },
  {
    code: 'GRAM',
    question_text: 'Quelle phrase est correcte ?',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['Nous allons au marché', 'Nous allez au marché', 'Nous vais au marché', 'Nous va au marché'],
    correct_answer: 'Nous allons au marché',
    explanation: '"Nous allons" is the correct conjugation of "aller".',
    skill_category: SkillCategory.GRAMMAR,
    target_cefr_level: CEFRLevel.A2,
  },
  {
    code: 'GRAM',
    question_text: 'Choisissez le bon article : "___ pomme est sur la table."',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['La', 'Le', 'Les', 'Un'],
    correct_answer: 'La',
    explanation: '"Pomme" is feminine singular, so it takes "la".',
    skill_category: SkillCategory.GRAMMAR,
    target_cefr_level: CEFRLevel.A2,
  },
  // Vocabulary
  {
    code: 'VOC',
    question_text: 'Que signifie "bibliothèque" ?',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['library', 'bakery', 'hospital', 'station'],
    correct_answer: 'library',
    explanation: '"Bibliothèque" means "library".',
    skill_category: SkillCategory.VOCABULARY,
    target_cefr_level: CEFRLevel.A1,
  },
  {
    code: 'VOC',
    question_text: 'Quel mot signifie "to eat" ?',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['manger', 'boire', 'dormir', 'courir'],
    correct_answer: 'manger',
    explanation: '"Manger" means "to eat".',
    skill_category: SkillCategory.VOCABULARY,
    target_cefr_level: CEFRLevel.A1,
  },
  {
    code: 'VOC',
    question_text: 'Quel est le contraire de "grand" ?',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['petit', 'beau', 'rapide', 'fort'],
    correct_answer: 'petit',
    explanation: '"Petit" (small) is the opposite of "grand" (big).',
    skill_category: SkillCategory.VOCABULARY,
    target_cefr_level: CEFRLevel.A2,
  },
  {
    code: 'VOC',
    question_text: 'Comment dit-on "weather" en français ?',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['le temps', 'le travail', 'le voyage', 'le matin'],
    correct_answer: 'le temps',
    explanation: '"Le temps" can mean "weather" or "time".',
    skill_category: SkillCategory.VOCABULARY,
    target_cefr_level: CEFRLevel.A2,
  },
  // Reading
  {
    code: 'READ',
    question_text: 'Lisez : "Marc se réveille à sept heures et prend son petit-déjeuner." À quelle heure Marc se réveille-t-il ?',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['7 heures', '8 heures', '9 heures', '6 heures'],
    correct_answer: '7 heures',
    explanation: 'The text states he wakes up at seven o\'clock.',
    skill_category: SkillCategory.READING,
    target_cefr_level: CEFRLevel.A1,
  },
  {
    code: 'READ',
    question_text: 'Lisez : "Sophie aime lire des romans le soir avant de dormir." Que fait Sophie le soir ?',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['Elle lit des romans', 'Elle regarde la télévision', 'Elle fait du sport', 'Elle cuisine'],
    correct_answer: 'Elle lit des romans',
    explanation: 'The passage says she likes reading novels at night.',
    skill_category: SkillCategory.READING,
    target_cefr_level: CEFRLevel.A2,
  },
  // Listening
  {
    code: 'LIST',
    question_text: 'Quelqu\'un dit "Il fait beau aujourd\'hui." De quoi parle cette personne ?',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['du temps qu\'il fait', 'de son travail', 'de sa famille', 'de la nourriture'],
    correct_answer: 'du temps qu\'il fait',
    explanation: '"Il fait beau" describes the weather.',
    skill_category: SkillCategory.LISTENING,
    target_cefr_level: CEFRLevel.A1,
  },
  {
    code: 'LIST',
    question_text: 'Vous entendez : "Rendez-vous à la gare à midi." Où devez-vous aller ?',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['à la gare', 'au restaurant', 'à l\'école', 'au cinéma'],
    correct_answer: 'à la gare',
    explanation: 'The speaker asks to meet at the train station.',
    skill_category: SkillCategory.LISTENING,
    target_cefr_level: CEFRLevel.A2,
  },
  // Translation — native (English) → French
  {
    code: 'TRANS',
    question_text: 'Traduisez cette phrase en français :',
    question_type: QuestionType.TRANSLATION_TO_TARGET,
    source_sentence: 'My sister lives in a small city near Paris.',
    source_language: 'English',
    target_language: 'French',
    correct_answer: 'Ma sœur habite dans une petite ville près de Paris.',
    alternative_answers: [
      'Ma sœur vit dans une petite ville près de Paris.',
      'Ma sœur habite dans une petite ville près Paris.',
      'Mon amie habite dans une petite ville près de Paris.',
    ],
    explanation: '"My sister" → "Ma sœur", "lives" → "habite/vit", "small city" → "petite ville", "near" → "près de".',
    hint: '"Near" = "près de"',
    skill_category: SkillCategory.TRANSLATION,
    target_cefr_level: CEFRLevel.A2,
  },
  // Translation — French → native (English)
  {
    code: 'TRANS',
    question_text: 'Translate this French sentence into English:',
    question_type: QuestionType.TRANSLATION_TO_NATIVE,
    source_sentence: 'Il fait très froid en hiver dans ce pays.',
    source_language: 'French',
    target_language: 'English',
    correct_answer: 'It is very cold in winter in this country.',
    alternative_answers: [
      'It is very cold during winter in this country.',
      'It\'s very cold in winter in this country.',
      'In this country it is very cold in winter.',
    ],
    explanation: '"Il fait très froid" → "It is very cold", "en hiver" → "in winter", "ce pays" → "this country".',
    skill_category: SkillCategory.TRANSLATION,
    target_cefr_level: CEFRLevel.A2,
  },
];

// ─── Spanish ─────────────────────────────────────────────────────────────────

const ES_QUESTIONS: SeedQuestion[] = [
  // Grammar
  {
    code: 'GRAM',
    question_text: 'Elige la forma correcta: "Yo ___ estudiante."',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['soy', 'eres', 'es', 'son'],
    correct_answer: 'soy',
    explanation: '"Yo soy" is the correct form of "ser" for "I am".',
    skill_category: SkillCategory.GRAMMAR,
    target_cefr_level: CEFRLevel.A1,
  },
  {
    code: 'GRAM',
    question_text: 'Completa: "Ella ___ un coche rojo."',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['tiene', 'tienes', 'tengo', 'tienen'],
    correct_answer: 'tiene',
    explanation: '"Ella tiene" — third person singular of "tener".',
    skill_category: SkillCategory.GRAMMAR,
    target_cefr_level: CEFRLevel.A1,
  },
  {
    code: 'GRAM',
    question_text: '¿Qué frase es correcta?',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['Nosotros vamos al mercado', 'Nosotros van al mercado', 'Nosotros voy al mercado', 'Nosotros va al mercado'],
    correct_answer: 'Nosotros vamos al mercado',
    explanation: '"Nosotros vamos" is the correct form of "ir".',
    skill_category: SkillCategory.GRAMMAR,
    target_cefr_level: CEFRLevel.A2,
  },
  {
    code: 'GRAM',
    question_text: 'Elige el artículo correcto: "___ manzana está en la mesa."',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['La', 'El', 'Los', 'Un'],
    correct_answer: 'La',
    explanation: '"Manzana" is feminine singular, so it takes "la".',
    skill_category: SkillCategory.GRAMMAR,
    target_cefr_level: CEFRLevel.A2,
  },
  // Vocabulary
  {
    code: 'VOC',
    question_text: '¿Qué significa "biblioteca"?',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['library', 'bakery', 'hospital', 'station'],
    correct_answer: 'library',
    explanation: '"Biblioteca" means "library".',
    skill_category: SkillCategory.VOCABULARY,
    target_cefr_level: CEFRLevel.A1,
  },
  {
    code: 'VOC',
    question_text: '¿Qué palabra significa "to eat"?',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['comer', 'beber', 'dormir', 'correr'],
    correct_answer: 'comer',
    explanation: '"Comer" means "to eat".',
    skill_category: SkillCategory.VOCABULARY,
    target_cefr_level: CEFRLevel.A1,
  },
  {
    code: 'VOC',
    question_text: '¿Cuál es el contrario de "grande"?',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['pequeño', 'bonito', 'rápido', 'fuerte'],
    correct_answer: 'pequeño',
    explanation: '"Pequeño" (small) is the opposite of "grande" (big).',
    skill_category: SkillCategory.VOCABULARY,
    target_cefr_level: CEFRLevel.A2,
  },
  {
    code: 'VOC',
    question_text: '¿Cómo se dice "weather" en español?',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['el tiempo', 'el trabajo', 'el viaje', 'la mañana'],
    correct_answer: 'el tiempo',
    explanation: '"El tiempo" can mean "weather" or "time".',
    skill_category: SkillCategory.VOCABULARY,
    target_cefr_level: CEFRLevel.A2,
  },
  // Reading
  {
    code: 'READ',
    question_text: 'Lee: "Marcos se despierta a las siete y desayuna." ¿A qué hora se despierta Marcos?',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['a las siete', 'a las ocho', 'a las nueve', 'a las seis'],
    correct_answer: 'a las siete',
    explanation: 'The text states he wakes up at seven.',
    skill_category: SkillCategory.READING,
    target_cefr_level: CEFRLevel.A1,
  },
  {
    code: 'READ',
    question_text: 'Lee: "Sofía disfruta leyendo novelas por la noche antes de dormir." ¿Qué hace Sofía por la noche?',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['Lee novelas', 'Ve la televisión', 'Hace deporte', 'Cocina'],
    correct_answer: 'Lee novelas',
    explanation: 'The passage says she enjoys reading novels at night.',
    skill_category: SkillCategory.READING,
    target_cefr_level: CEFRLevel.A2,
  },
  // Listening
  {
    code: 'LIST',
    question_text: 'Alguien dice "Hace buen tiempo hoy." ¿De qué habla esta persona?',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['del clima', 'de su trabajo', 'de su familia', 'de la comida'],
    correct_answer: 'del clima',
    explanation: '"Hace buen tiempo" describes the weather.',
    skill_category: SkillCategory.LISTENING,
    target_cefr_level: CEFRLevel.A1,
  },
  {
    code: 'LIST',
    question_text: 'Escuchas: "Nos vemos en la estación al mediodía." ¿A dónde debes ir?',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['a la estación', 'al restaurante', 'a la escuela', 'al cine'],
    correct_answer: 'a la estación',
    explanation: 'The speaker suggests meeting at the station.',
    skill_category: SkillCategory.LISTENING,
    target_cefr_level: CEFRLevel.A2,
  },
  // Translation — native (English) → Spanish
  {
    code: 'TRANS',
    question_text: 'Traduce esta frase al español:',
    question_type: QuestionType.TRANSLATION_TO_TARGET,
    source_sentence: 'My sister lives in a small city near Madrid.',
    source_language: 'English',
    target_language: 'Spanish',
    correct_answer: 'Mi hermana vive en una ciudad pequeña cerca de Madrid.',
    alternative_answers: [
      'Mi hermana habita en una ciudad pequeña cerca de Madrid.',
      'Mi hermana vive en una pequeña ciudad cerca de Madrid.',
      'Mi hermana vive en una ciudad pequeña cerca Madrid.',
    ],
    explanation: '"My sister" → "Mi hermana", "lives" → "vive", "small city" → "ciudad pequeña", "near" → "cerca de".',
    hint: '"Near" = "cerca de"',
    skill_category: SkillCategory.TRANSLATION,
    target_cefr_level: CEFRLevel.A2,
  },
  // Translation — Spanish → native (English)
  {
    code: 'TRANS',
    question_text: 'Translate this Spanish sentence into English:',
    question_type: QuestionType.TRANSLATION_TO_NATIVE,
    source_sentence: 'Hace mucho frío en invierno en este país.',
    source_language: 'Spanish',
    target_language: 'English',
    correct_answer: 'It is very cold in winter in this country.',
    alternative_answers: [
      'It is very cold during winter in this country.',
      'It\'s very cold in winter in this country.',
      'In this country it is very cold in winter.',
    ],
    explanation: '"Hace mucho frío" → "It is very cold", "en invierno" → "in winter", "este país" → "this country".',
    skill_category: SkillCategory.TRANSLATION,
    target_cefr_level: CEFRLevel.A2,
  },
];

// ─── English ──────────────────────────────────────────────────────────────────

const EN_QUESTIONS: SeedQuestion[] = [
  // Grammar
  {
    code: 'GRAM',
    question_text: 'Choose the correct form: "She ___ a teacher."',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['is', 'am', 'are', 'be'],
    correct_answer: 'is',
    explanation: '"She is" — third person singular of "to be".',
    skill_category: SkillCategory.GRAMMAR,
    target_cefr_level: CEFRLevel.A1,
  },
  {
    code: 'GRAM',
    question_text: 'Complete: "They ___ to the park every Sunday."',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['go', 'goes', 'going', 'went'],
    correct_answer: 'go',
    explanation: '"They go" — present simple, plural subject.',
    skill_category: SkillCategory.GRAMMAR,
    target_cefr_level: CEFRLevel.A1,
  },
  {
    code: 'GRAM',
    question_text: 'Which sentence is correct?',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['I have lived here for two years', 'I have live here for two years', 'I has lived here for two years', 'I living here for two years'],
    correct_answer: 'I have lived here for two years',
    explanation: 'Present perfect: "have/has" + past participle.',
    skill_category: SkillCategory.GRAMMAR,
    target_cefr_level: CEFRLevel.A2,
  },
  {
    code: 'GRAM',
    question_text: 'Choose the correct article: "___ apple is on the table."',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['An', 'A', 'The', 'Some'],
    correct_answer: 'An',
    explanation: '"Apple" starts with a vowel sound, so "an" is used.',
    skill_category: SkillCategory.GRAMMAR,
    target_cefr_level: CEFRLevel.A2,
  },
  // Vocabulary
  {
    code: 'VOC',
    question_text: 'What does "library" mean?',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['a place with books', 'a place with food', 'a place with medicine', 'a place with trains'],
    correct_answer: 'a place with books',
    explanation: 'A library is a place where books are kept for reading or borrowing.',
    skill_category: SkillCategory.VOCABULARY,
    target_cefr_level: CEFRLevel.A1,
  },
  {
    code: 'VOC',
    question_text: 'Which word means "to consume food"?',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['eat', 'drink', 'sleep', 'run'],
    correct_answer: 'eat',
    explanation: '"Eat" means to consume food.',
    skill_category: SkillCategory.VOCABULARY,
    target_cefr_level: CEFRLevel.A1,
  },
  {
    code: 'VOC',
    question_text: 'What is the opposite of "big"?',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['small', 'tall', 'fast', 'strong'],
    correct_answer: 'small',
    explanation: '"Small" is the opposite of "big".',
    skill_category: SkillCategory.VOCABULARY,
    target_cefr_level: CEFRLevel.A2,
  },
  {
    code: 'VOC',
    question_text: 'Which word best completes: "The ___ was so heavy I could barely lift it."',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['suitcase', 'feather', 'napkin', 'whisper'],
    correct_answer: 'suitcase',
    explanation: 'A suitcase can be heavy enough to be hard to lift.',
    skill_category: SkillCategory.VOCABULARY,
    target_cefr_level: CEFRLevel.A2,
  },
  // Reading
  {
    code: 'READ',
    question_text: 'Read: "Mark wakes up at seven and has breakfast." What time does Mark wake up?',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['seven o\'clock', 'eight o\'clock', 'nine o\'clock', 'six o\'clock'],
    correct_answer: 'seven o\'clock',
    explanation: 'The text states he wakes up at seven.',
    skill_category: SkillCategory.READING,
    target_cefr_level: CEFRLevel.A1,
  },
  {
    code: 'READ',
    question_text: 'Read: "Sophie enjoys reading novels at night before going to sleep." What does Sophie do at night?',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['She reads novels', 'She watches television', 'She exercises', 'She cooks'],
    correct_answer: 'She reads novels',
    explanation: 'The passage says she enjoys reading novels at night.',
    skill_category: SkillCategory.READING,
    target_cefr_level: CEFRLevel.A2,
  },
  // Listening
  {
    code: 'LIST',
    question_text: 'Someone says "It\'s sunny today." What are they talking about?',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['the weather', 'their job', 'their family', 'food'],
    correct_answer: 'the weather',
    explanation: '"It\'s sunny" describes the weather.',
    skill_category: SkillCategory.LISTENING,
    target_cefr_level: CEFRLevel.A1,
  },
  {
    code: 'LIST',
    question_text: 'You hear: "Let\'s meet at the station at noon." Where should you go?',
    question_type: QuestionType.MULTIPLE_CHOICE,
    options: ['the station', 'the restaurant', 'the school', 'the cinema'],
    correct_answer: 'the station',
    explanation: 'The speaker suggests meeting at the station.',
    skill_category: SkillCategory.LISTENING,
    target_cefr_level: CEFRLevel.A2,
  },
  // Translation — foreign language (French) → English (target)
  {
    code: 'TRANS',
    question_text: 'Translate this sentence into English:',
    question_type: QuestionType.TRANSLATION_TO_TARGET,
    source_sentence: 'Ma sœur habite dans une petite ville près de Paris.',
    source_language: 'French',
    target_language: 'English',
    correct_answer: 'My sister lives in a small town near Paris.',
    alternative_answers: [
      'My sister lives in a small city near Paris.',
      'My sister lives in a little town near Paris.',
      'My sister lives near Paris in a small town.',
    ],
    explanation: '"Ma sœur" → "My sister", "habite" → "lives", "petite ville" → "small town/city", "près de" → "near".',
    hint: '"Petite ville" = small town',
    skill_category: SkillCategory.TRANSLATION,
    target_cefr_level: CEFRLevel.A2,
  },
  // Translation — English → Spanish (comprehension check for English learners)
  {
    code: 'TRANS',
    question_text: 'Translate this English sentence into Spanish:',
    question_type: QuestionType.TRANSLATION_TO_NATIVE,
    source_sentence: 'The weather is beautiful today and I want to go to the park.',
    source_language: 'English',
    target_language: 'Spanish',
    correct_answer: 'El tiempo es hermoso hoy y quiero ir al parque.',
    alternative_answers: [
      'El clima es hermoso hoy y quiero ir al parque.',
      'Hoy el tiempo es hermoso y quiero ir al parque.',
      'El tiempo está bonito hoy y quiero ir al parque.',
    ],
    explanation: '"The weather" → "El tiempo", "beautiful" → "hermoso/bonito", "I want to go" → "quiero ir", "park" → "parque".',
    skill_category: SkillCategory.TRANSLATION,
    target_cefr_level: CEFRLevel.A2,
  },
];

// ─── Distribution & seed runner ───────────────────────────────────────────────

const QUESTIONS_BY_ISO: Record<string, SeedQuestion[]> = {
  fr: FR_QUESTIONS,
  es: ES_QUESTIONS,
  en: EN_QUESTIONS,
};

const QUESTION_DISTRIBUTION = {
  grammar:     2,
  vocabulary:  2,
  reading:     1,
  listening:   1,
  translation: 2,
};

export async function seedQuizContent(dataSource: DataSource) {
  const languageRepo = dataSource.getRepository(Language);
  const questionRepo = dataSource.getRepository(QuizQuestionsBank);
  const templateRepo = dataSource.getRepository(QuizTemplate);

  for (const [isoCode, questions] of Object.entries(QUESTIONS_BY_ISO)) {
    const language = await languageRepo.findOne({ where: { iso_code: isoCode } });
    if (!language) continue;

    // Wipe stale questions & templates so old data (wrong types, wrong
    // distributions) never pollutes the quiz again.
    await questionRepo.delete({ language_id: language.id });
    await templateRepo.delete({ language_id: language.id });

    // Insert all questions fresh
    let sequence = 1;
    for (const q of questions) {
      const question_code = `${isoCode.toUpperCase()}-${q.code}-${String(sequence).padStart(3, '0')}`;
      sequence++;

      const entity = questionRepo.create({
        question_code,
        language_id:       language.id,
        question_text:     q.question_text,
        question_type:     q.question_type,
        correct_answer:    q.correct_answer,
        skill_category:    q.skill_category,
        target_cefr_level: q.target_cefr_level,
        difficulty_score:  1.0,
        is_active:         true,
      });

      if (q.options)             entity.options             = q.options;
      if (q.alternative_answers) entity.alternative_answers = q.alternative_answers;
      if (q.explanation)         entity.explanation         = q.explanation;
      if (q.hint)                entity.hint                = q.hint;
      if (q.source_sentence)     entity.source_sentence     = q.source_sentence;
      if (q.source_language)     entity.source_language     = q.source_language;
      if (q.target_language)     entity.target_language     = q.target_language;

      await questionRepo.save(entity);
    }

    const totalQuestions = Object.values(QUESTION_DISTRIBUTION).reduce((a, b) => a + b, 0);

    const templates = [
      {
        template_code: `${isoCode.toUpperCase()}-PLACEMENT-01`,
        quiz_type:     QuizType.PLACEMENT,
        title:         `${language.name} Placement Quiz`,
        description:   `Assess your current ${language.name} level with translation, grammar, vocabulary, reading, and listening questions.`,
      },
      {
        template_code: `${isoCode.toUpperCase()}-PROGRESS-01`,
        quiz_type:     QuizType.PROGRESS_CHECK,
        title:         `${language.name} Progress Check`,
        description:   `Check how your ${language.name} skills are improving across all areas.`,
      },
    ];

    for (const t of templates) {
      await templateRepo.save({
        template_code:            t.template_code,
        language_id:              language.id,
        quiz_type:                t.quiz_type,
        title:                    t.title,
        description:              t.description,
        target_cefr_levels:       ['A1', 'A2', 'B1'],
        total_questions:          totalQuestions,
        question_distribution:    QUESTION_DISTRIBUTION,
        time_limit_minutes:       20,
        passing_score_percentage: 60,
        is_currently_active:      true,
        xp_reward_base:           50,
        xp_reward_perfect:        150,
      });
    }
  }

  console.log('✅ Quiz content seeded successfully');
}
