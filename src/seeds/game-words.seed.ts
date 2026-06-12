// seeds/game-words.seed.ts
import { DataSource } from 'typeorm';
import { Language } from 'src/languages/entities/language.entity';
import { GameWord } from 'src/games/entities/game-word.entity';
import { CEFRLevel } from 'src/quiz/entities/quiz-questions-bank.entity';

interface SeedWord {
  term: string;
  translation: string;
  hint?: string;
  cefr_level: CEFRLevel;
  category: string;
}

// English term → translation, grouped by the language the learner is studying.
const WORDS_BY_LANGUAGE: Record<string, SeedWord[]> = {
  fr: [
    { term: 'bonjour',   translation: 'hello',     hint: 'a greeting',        cefr_level: CEFRLevel.A1, category: 'greetings' },
    { term: 'merci',     translation: 'thank you', hint: 'showing gratitude', cefr_level: CEFRLevel.A1, category: 'greetings' },
    { term: 'au revoir', translation: 'goodbye',   hint: 'said when leaving', cefr_level: CEFRLevel.A1, category: 'greetings' },
    { term: 'eau',       translation: 'water',     hint: 'you drink it',      cefr_level: CEFRLevel.A1, category: 'food' },
    { term: 'pain',      translation: 'bread',     hint: 'baked food',        cefr_level: CEFRLevel.A1, category: 'food' },
    { term: 'maison',    translation: 'house',     hint: 'where you live',    cefr_level: CEFRLevel.A1, category: 'places' },
    { term: 'chat',      translation: 'cat',       hint: 'a small pet',       cefr_level: CEFRLevel.A1, category: 'animals' },
    { term: 'chien',     translation: 'dog',       hint: 'a loyal pet',       cefr_level: CEFRLevel.A1, category: 'animals' },
    { term: 'livre',     translation: 'book',      hint: 'you read it',       cefr_level: CEFRLevel.A1, category: 'objects' },
    { term: 'ami',       translation: 'friend',    hint: 'someone you like',  cefr_level: CEFRLevel.A1, category: 'people' },
    { term: 'travail',   translation: 'work',      hint: 'what you do for a living', cefr_level: CEFRLevel.A2, category: 'daily life' },
    { term: 'voyage',    translation: 'trip',      hint: 'a journey',         cefr_level: CEFRLevel.A2, category: 'travel' },
    { term: 'famille',   translation: 'family',    hint: 'parents and siblings', cefr_level: CEFRLevel.A2, category: 'people' },
    { term: 'cuisine',   translation: 'kitchen',   hint: 'where you cook',    cefr_level: CEFRLevel.A2, category: 'places' },
    { term: 'soleil',    translation: 'sun',       hint: 'shines in the sky', cefr_level: CEFRLevel.A2, category: 'nature' },
    { term: 'argent',    translation: 'money',     hint: 'used to buy things', cefr_level: CEFRLevel.A2, category: 'daily life' },
  ],
  es: [
    { term: 'hola',      translation: 'hello',     hint: 'a greeting',        cefr_level: CEFRLevel.A1, category: 'greetings' },
    { term: 'gracias',   translation: 'thank you', hint: 'showing gratitude', cefr_level: CEFRLevel.A1, category: 'greetings' },
    { term: 'adiós',     translation: 'goodbye',   hint: 'said when leaving', cefr_level: CEFRLevel.A1, category: 'greetings' },
    { term: 'agua',      translation: 'water',     hint: 'you drink it',      cefr_level: CEFRLevel.A1, category: 'food' },
    { term: 'pan',       translation: 'bread',     hint: 'baked food',        cefr_level: CEFRLevel.A1, category: 'food' },
    { term: 'casa',      translation: 'house',     hint: 'where you live',    cefr_level: CEFRLevel.A1, category: 'places' },
    { term: 'gato',      translation: 'cat',       hint: 'a small pet',       cefr_level: CEFRLevel.A1, category: 'animals' },
    { term: 'perro',     translation: 'dog',       hint: 'a loyal pet',       cefr_level: CEFRLevel.A1, category: 'animals' },
    { term: 'libro',     translation: 'book',      hint: 'you read it',       cefr_level: CEFRLevel.A1, category: 'objects' },
    { term: 'amigo',     translation: 'friend',    hint: 'someone you like',  cefr_level: CEFRLevel.A1, category: 'people' },
    { term: 'trabajo',   translation: 'work',      hint: 'what you do for a living', cefr_level: CEFRLevel.A2, category: 'daily life' },
    { term: 'viaje',     translation: 'trip',      hint: 'a journey',         cefr_level: CEFRLevel.A2, category: 'travel' },
    { term: 'familia',   translation: 'family',    hint: 'parents and siblings', cefr_level: CEFRLevel.A2, category: 'people' },
    { term: 'cocina',    translation: 'kitchen',   hint: 'where you cook',    cefr_level: CEFRLevel.A2, category: 'places' },
    { term: 'sol',       translation: 'sun',       hint: 'shines in the sky', cefr_level: CEFRLevel.A2, category: 'nature' },
    { term: 'dinero',    translation: 'money',     hint: 'used to buy things', cefr_level: CEFRLevel.A2, category: 'daily life' },
  ],
  en: [
    { term: 'hello',     translation: 'bonjour',   hint: 'a greeting',        cefr_level: CEFRLevel.A1, category: 'greetings' },
    { term: 'thanks',    translation: 'merci',     hint: 'showing gratitude', cefr_level: CEFRLevel.A1, category: 'greetings' },
    { term: 'goodbye',   translation: 'au revoir', hint: 'said when leaving', cefr_level: CEFRLevel.A1, category: 'greetings' },
    { term: 'water',     translation: 'eau',       hint: 'you drink it',      cefr_level: CEFRLevel.A1, category: 'food' },
    { term: 'bread',     translation: 'pain',      hint: 'baked food',        cefr_level: CEFRLevel.A1, category: 'food' },
    { term: 'house',     translation: 'maison',    hint: 'where you live',    cefr_level: CEFRLevel.A1, category: 'places' },
    { term: 'cat',       translation: 'chat',      hint: 'a small pet',       cefr_level: CEFRLevel.A1, category: 'animals' },
    { term: 'dog',       translation: 'chien',     hint: 'a loyal pet',       cefr_level: CEFRLevel.A1, category: 'animals' },
    { term: 'book',      translation: 'livre',     hint: 'you read it',       cefr_level: CEFRLevel.A1, category: 'objects' },
    { term: 'friend',    translation: 'ami',       hint: 'someone you like',  cefr_level: CEFRLevel.A1, category: 'people' },
    { term: 'work',      translation: 'travail',   hint: 'what you do for a living', cefr_level: CEFRLevel.A2, category: 'daily life' },
    { term: 'trip',      translation: 'voyage',    hint: 'a journey',         cefr_level: CEFRLevel.A2, category: 'travel' },
    { term: 'family',    translation: 'famille',   hint: 'parents and siblings', cefr_level: CEFRLevel.A2, category: 'people' },
    { term: 'kitchen',   translation: 'cuisine',   hint: 'where you cook',    cefr_level: CEFRLevel.A2, category: 'places' },
    { term: 'sun',       translation: 'soleil',    hint: 'shines in the sky', cefr_level: CEFRLevel.A2, category: 'nature' },
    { term: 'money',     translation: 'argent',    hint: 'used to buy things', cefr_level: CEFRLevel.A2, category: 'daily life' },
  ],
};

export async function seedGameWords(dataSource: DataSource) {
  const languageRepository = dataSource.getRepository(Language);
  const gameWordRepository = dataSource.getRepository(GameWord);

  for (const [isoCode, words] of Object.entries(WORDS_BY_LANGUAGE)) {
    const language = await languageRepository.findOne({ where: { iso_code: isoCode } });
    if (!language) continue;

    for (const word of words) {
      const exists = await gameWordRepository.findOne({
        where: { language_id: language.id, term: word.term, translation: word.translation },
      });

      if (!exists) {
        await gameWordRepository.save({ ...word, language_id: language.id });
      }
    }
  }

  console.log('✅ Game words seeded successfully');
}
