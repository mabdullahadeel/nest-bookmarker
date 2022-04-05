import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBookmarkDto, UpdateBookmarkDto } from './dto';

@Injectable()
export class BookmarksService {
  constructor(private prismaService: PrismaService) {}

  async getBookmarks(userId: number) {
    return await this.prismaService.bookmark.findMany({
      where: {
        userId,
      },
    });
  }

  async getBookmark(userId: number, bookmarkId: number) {
    return this.prismaService.bookmark.findFirst({
      where: {
        id: bookmarkId,
        userId,
      },
    });
  }

  async createBookmark(userId: number, dto: CreateBookmarkDto) {
    return await this.prismaService.bookmark.create({
      data: {
        ...dto,
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }

  async updateBookmarkById(
    userId: number,
    bookmarkId: number,
    dto: UpdateBookmarkDto,
  ) {
    const bookmark = await this.prismaService.bookmark.findFirst({
      where: {
        AND: [{ id: bookmarkId }, { userId }],
      },
      select: {
        id: true,
      },
    });

    if (!bookmark) throw new NotFoundException('Action not allowed');

    return await this.prismaService.bookmark.update({
      where: {
        id: bookmark.id,
      },
      data: { ...dto },
    });
  }

  async deleteBookmarkById(userId: number, bookmarkId: number) {
    const bookmark = await this.prismaService.bookmark.findFirst({
      where: {
        AND: [{ id: bookmarkId }, { userId }],
      },
    });

    if (!bookmark) throw new NotFoundException('Bookmark not found');

    await this.prismaService.bookmark.delete({
      where: {
        id: bookmarkId,
      },
    });
  }
}
