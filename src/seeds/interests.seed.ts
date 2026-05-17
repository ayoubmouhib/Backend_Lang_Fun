// seeds/interests.seed.ts
import { DataSource } from 'typeorm';
import { Interest } from 'src/auth/entities/interest.entity';

export async function seedInterests(dataSource: DataSource) {
  const interestRepository = dataSource.getRepository(Interest);

  const interests = [
    { name: 'Travel', icon: 'flight' },
    { name: 'Food', icon: 'restaurant' },
    { name: 'Music', icon: 'music_note' },
    { name: 'Sports', icon: 'sports_soccer' },
    { name: 'Technology', icon: 'computer' },
    { name: 'Art', icon: 'palette' },
    { name: 'Reading', icon: 'book' },
    { name: 'Movies', icon: 'movie' },
    { name: 'Gaming', icon: 'sports_esports' },
    { name: 'Photography', icon: 'camera_alt' },
    { name: 'Cooking', icon: 'restaurant_menu' },
    { name: 'Fitness', icon: 'fitness_center' },
    { name: 'Nature', icon: 'nature' },
    { name: 'Fashion', icon: 'checkroom' },
    { name: 'Science', icon: 'science' },
  ];

  for (const interest of interests) {
    const exists = await interestRepository.findOne({ 
      where: { name: interest.name } 
    });
    
    if (!exists) {
      await interestRepository.save(interest);
    }
  }

  console.log('✅ Interests seeded successfully');
}