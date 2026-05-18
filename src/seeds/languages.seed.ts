// seeds/languages.seed.ts
import { DataSource } from 'typeorm';
import { Language } from 'src/languages/entities/language.entity';

export async function seedLanguages(dataSource: DataSource) {
  const languageRepository = dataSource.getRepository(Language);

  const languages = [
    { name: 'English',           iso_code: 'en', native_name: 'English',    direction: 'LTR' },
    { name: 'French',            iso_code: 'fr', native_name: 'Français',   direction: 'LTR' },
    { name: 'Arabic',            iso_code: 'ar', native_name: 'العربية',     direction: 'RTL' },
    { name: 'Spanish',           iso_code: 'es', native_name: 'Español',    direction: 'LTR' },
    { name: 'German',            iso_code: 'de', native_name: 'Deutsch',    direction: 'LTR' },
    { name: 'Italian',           iso_code: 'it', native_name: 'Italiano',   direction: 'LTR' },
    { name: 'Portuguese',        iso_code: 'pt', native_name: 'Português',  direction: 'LTR' },
    { name: 'Chinese (Simplified)', iso_code: 'zh', native_name: '简体中文', direction: 'LTR' },
    { name: 'Japanese',          iso_code: 'ja', native_name: '日本語',      direction: 'LTR' },
    { name: 'Korean',            iso_code: 'ko', native_name: '한국어',      direction: 'LTR' },
    { name: 'Russian',           iso_code: 'ru', native_name: 'Русский',    direction: 'LTR' },
    { name: 'Turkish',           iso_code: 'tr', native_name: 'Türkçe',     direction: 'LTR' },
    { name: 'Hindi',             iso_code: 'hi', native_name: 'हिन्दी',      direction: 'LTR' },
  ];

  for (const lang of languages) {
    const exists = await languageRepository.findOne({ 
      where: { iso_code: lang.iso_code } 
    });
    
    if (!exists) {
      await languageRepository.save(lang);
    }
  }

  console.log('✅ Languages seeded successfully');
}