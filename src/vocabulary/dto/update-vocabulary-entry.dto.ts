import { PartialType } from '@nestjs/mapped-types';
import { CreateVocabularyEntryDto } from './create-vocabulary-entry.dto';

export class UpdateVocabularyEntryDto extends PartialType(CreateVocabularyEntryDto) {}
