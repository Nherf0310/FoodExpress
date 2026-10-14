import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix for all API routes
  app.setGlobalPrefix('api/v1');

  // Enable CORS for frontend clients (e.g. Next.js on port 3000 / Vercel deployment)
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 GroceReal API running on: http://localhost:${port}/api/v1`);
  console.log(`🩺 Health check at: http://localhost:${port}/api/v1/health`);
}

bootstrap();
