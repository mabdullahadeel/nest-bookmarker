import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EditUserDto, UpdatePasswordDto } from './dto';
import * as argon from 'argon2';

@Injectable()
export class UserService {
  constructor(private prismaService: PrismaService) {}

  async editUser(userId: number, dto: EditUserDto) {
    const user = await this.prismaService.user.update({
      where: { id: userId },
      data: {
        ...dto,
      },
    });

    delete user.password_hash;

    return user;
  }

  async updatePassword(userId: number, dto: UpdatePasswordDto) {
    if (!dto.old_password) {
      throw new ForbiddenException('old_password is required.');
    }

    const oldUser = await this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
    });
    const pwValid = await argon.verify(oldUser.password_hash, dto.old_password);

    if (!pwValid) throw new ForbiddenException('Invalid credentials');

    const new_password = await argon.hash(dto.password);

    const user = await this.prismaService.user.update({
      where: { id: userId },
      data: {
        password_hash: new_password,
      },
    });

    delete user.password_hash;

    return user;
  }
}
