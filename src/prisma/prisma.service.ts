import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor(private config: ConfigService) {
    super({
      datasources: {
        db: {
          url: config.get('DATABASE_URL'),
        },
      },
    });
  }

  async cleanDB(sure = false, skipChecks = false) {
    if (sure && (skipChecks || process.env.NODE_ENV === 'test')) {
      await this.user.deleteMany();
      await this.bookmark.deleteMany();
    }
  }
}
