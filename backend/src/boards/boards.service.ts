import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BoardRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BoardAccessService } from './board-access.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { ShareBoardDto } from './dto/share-board.dto';

@Injectable()
export class BoardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BoardAccessService,
  ) {}

  async create(userId: string, dto: CreateBoardDto) {
    return this.prisma.board.create({
      data: {
        title: dto.title,
        description: dto.description,
        ownerId: userId,
        members: {
          create: { userId, role: BoardRole.OWNER },
        },
      },
      include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
    });
  }

  // Every board this user owns or has been shared into.
  async listForUser(userId: string) {
    return this.prisma.board.findMany({
      where: { members: { some: { userId } } },
      orderBy: { updatedAt: 'desc' },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        _count: { select: { columns: true } },
      },
    });
  }

  async getOne(boardId: string, userId: string) {
    await this.access.requireViewAccess(boardId, userId);
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        columns: {
          orderBy: { position: 'asc' },
          include: { tasks: { orderBy: { position: 'asc' } } },
        },
      },
    });
    if (!board) throw new NotFoundException('Board not found');
    return board;
  }

  async update(boardId: string, userId: string, dto: UpdateBoardDto) {
    await this.access.requireEditAccess(boardId, userId);
    return this.prisma.board.update({ where: { id: boardId }, data: dto });
  }

  async remove(boardId: string, userId: string) {
    await this.access.requireOwnerAccess(boardId, userId);
    await this.prisma.board.delete({ where: { id: boardId } });
    return { success: true };
  }

  async share(boardId: string, userId: string, dto: ShareBoardDto) {
    await this.access.requireOwnerAccess(boardId, userId);

    const targetUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!targetUser) {
      throw new NotFoundException('No registered user with that email');
    }

    const role = dto.role && dto.role !== BoardRole.OWNER ? dto.role : BoardRole.EDITOR;

    return this.prisma.boardMember.upsert({
      where: { boardId_userId: { boardId, userId: targetUser.id } },
      update: { role },
      create: { boardId, userId: targetUser.id, role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async unshare(boardId: string, userId: string, targetUserId: string) {
    const membership = await this.access.requireOwnerAccess(boardId, userId);
    if (targetUserId === membership.userId) {
      throw new BadRequestException('The board owner cannot be removed');
    }
    await this.prisma.boardMember.delete({
      where: { boardId_userId: { boardId, userId: targetUserId } },
    });
    return { success: true };
  }
}
