import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller('health')
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getHealth() {
    let dbStatus = 'disconnected';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'unreachable (configure DATABASE_URL in .env)';
    }

    return {
      status: 'ok',
      service: 'GroceReal REST API',
      version: '1.0.0',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    };
  }
}
