import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BoardAccessService } from '../boards/board-access.service';
import { computePosition } from '../common/position.util';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { ReorderColumnDto } from './dto/reorder-column.dto';

@Injectable()
export class ColumnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BoardAccessService,
  ) {}

  async create(boardId: string, userId: string, dto: CreateColumnDto) {
    await this.access.requireEditAccess(boardId, userId);

    const last = await this.prisma.column.findFirst({
      where: { boardId },
      orderBy: { position: 'desc' },
    });

    return this.prisma.column.create({
      data: {
        title: dto.title,
        boardId,
        position: computePosition(last?.position, null),
      },
    });
  }

  async update(columnId: string, userId: string, dto: UpdateColumnDto) {
    const boardId = await this.access.boardIdForColumn(columnId);
    await this.access.requireEditAccess(boardId, userId);
    return this.prisma.column.update({ where: { id: columnId }, data: dto });
  }

  async remove(columnId: string, userId: string) {
    const boardId = await this.access.boardIdForColumn(columnId);
    await this.access.requireEditAccess(boardId, userId);
    await this.prisma.column.delete({ where: { id: columnId } });
    return { success: true };
  }

  // Moves a column to a new zero-based index among its board's columns.
  async reorder(columnId: string, userId: string, dto: ReorderColumnDto) {
    const boardId = await this.access.boardIdForColumn(columnId);
    await this.access.requireEditAccess(boardId, userId);

    const siblings = await this.prisma.column.findMany({
      where: { boardId, id: { not: columnId } },
      orderBy: { position: 'asc' },
    });

    const index = Math.max(0, Math.min(dto.index, siblings.length));
    const prev = siblings[index - 1];
    const next = siblings[index];
    const position = computePosition(prev?.position, next?.position);

    const column = await this.prisma.column.findUnique({ where: { id: columnId } });
    if (!column) throw new NotFoundException('Column not found');

    return this.prisma.column.update({ where: { id: columnId }, data: { position } });
  }
}
