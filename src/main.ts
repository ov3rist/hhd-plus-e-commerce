import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // SECTION Swagger Setup
  if (process.env.NODE_ENV !== 'production') {
    const swagger = await import('@nestjs/swagger');
    const DocumentBuilder = swagger.DocumentBuilder;
    const SwaggerModule = swagger.SwaggerModule;

    const swaggerConfig = new DocumentBuilder()
      .setTitle('Points API')
      .setDescription('The points API description')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api', app, document);
  }
  // !SECTION Swagger Setup

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
