import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { seedInterests } from './seeds/interests.seed';
import { seedLanguages } from './seeds/languages.seed';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  )
  const dataSource = app.get(DataSource);
  await seedInterests(dataSource);
  await seedLanguages(dataSource);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
