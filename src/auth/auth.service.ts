import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SignupDto } from './dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  signup(dto: SignupDto) {
    return {
      message: 'signup',
    };
  }

  signin() {
    return {
      message: 'signin',
    };
  }
}
