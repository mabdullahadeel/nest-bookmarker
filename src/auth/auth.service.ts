import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SigninDto, SignupDto } from './dto';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async signup(dto: SignupDto) {
    const hashedPassword = await argon.hash(dto.password);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password_hash: hashedPassword,
        },
        select: {
          email: true,
          id: true,
          firstName: true,
          lastName: true,
        },
      });

      return { user };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('Email already exists');
        }
        throw error;
      }
    }
  }

  async signin(dto: SigninDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!user) throw new ForbiddenException('Invalid credentials');

    const pwValid = await argon.verify(user.password_hash, dto.password);
    if (!pwValid) throw new ForbiddenException('Invalid credentials');

    return this.assignAccessToken(user.email, user.id);
  }

  async assignAccessToken(
    email: string,
    userId: number,
  ): Promise<{ access_token: string }> {
    const payload = { email, sub: userId };
    const accessTokenSecret = this.configService.get('ACCESS_TOKEN_SECRET');

    const token = await this.jwtService.signAsync(payload, {
      secret: accessTokenSecret,
      expiresIn: '10m',
    });

    return {
      access_token: token,
    };
  }
}
