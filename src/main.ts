import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { seedInterests } from './seeds/interests.seed';
import { seedLanguages } from './seeds/languages.seed';
import { seedGameWords } from './seeds/game-words.seed';
import { seedQuizContent } from './seeds/quiz-content.seed';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads' });
  app.useWebSocketAdapter(new WsAdapter(app));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );
  const dataSource = app.get(DataSource);
  await seedInterests(dataSource);
  await seedLanguages(dataSource);
  await seedGameWords(dataSource);
  await seedQuizContent(dataSource);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
