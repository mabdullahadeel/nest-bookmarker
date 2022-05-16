import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import * as argon from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { SigninDto, SignupDto } from './dto';

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
          throw new BadRequestException('Email already exists');
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

    if (!user) throw new BadRequestException('Invalid credentials');

    const pwValid = await argon.verify(user.password_hash, dto.password);
    if (!pwValid) throw new BadRequestException('Invalid credentials');
    delete user.password_hash;

    const accessToken = await this.assignAccessToken(user.id);
    const refreshToken = await this.assignRefreshToken(user.id);

    return {
      user,
      tokens: { access: accessToken, refresh: refreshToken },
    };
  }

  async assignAccessToken(userId: number): Promise<string> {
    const payload = { sub: userId };
    const accessTokenSecret = this.configService.get('ACCESS_TOKEN_SECRET');

    const token = await this.jwtService.signAsync(payload, {
      secret: accessTokenSecret,
      expiresIn: '10m',
    });

    return token;
  }

  async assignRefreshToken(userId: number): Promise<string> {
    const payload = { sub: userId };
    const accessTokenSecret = this.configService.get('REFRESH_TOKEN_SECRET');

    const token = await this.jwtService.signAsync(payload, {
      secret: accessTokenSecret,
      expiresIn: '7d',
    });

    return token;
  }
}
