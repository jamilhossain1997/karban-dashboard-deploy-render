import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BoardAccessService } from '../boards/board-access.service';
import { computePosition } from '../common/position.util';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BoardAccessService,
  ) {}

  async create(columnId: string, userId: string, dto: CreateTaskDto) {
    const boardId = await this.access.boardIdForColumn(columnId);
    await this.access.requireEditAccess(boardId, userId);

    const last = await this.prisma.task.findFirst({
      where: { columnId },
      orderBy: { position: 'desc' },
    });

    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        columnId,
        position: computePosition(last?.position, null),
      },
    });
  }

  async update(taskId: string, userId: string, dto: UpdateTaskDto) {
    const boardId = await this.access.boardIdForTask(taskId);
    await this.access.requireEditAccess(boardId, userId);
    return this.prisma.task.update({ where: { id: taskId }, data: dto });
  }

  async remove(taskId: string, userId: string) {
    const boardId = await this.access.boardIdForTask(taskId);
    await this.access.requireEditAccess(boardId, userId);
    await this.prisma.task.delete({ where: { id: taskId } });
    return { success: true };
  }

  /**
   * Handles both "reorder within the same column" and "move to a different
   * column at a specific index" with a single code path.
   *
   * We compute the new position as the midpoint between the two tasks that
   * will become this task's new neighbors, using fractional indexing
   * (see common/position.util.ts). That means:
   *  - Only the moved task's row is ever written - no renumbering of siblings,
   *    so two people moving different tasks at the same time can't collide.
   *  - The whole read-siblings + write-new-position step runs inside a
   *    transaction, so a concurrent move can't read stale neighbor positions.
   */
  async move(taskId: string, userId: string, dto: MoveTaskDto) {
    const sourceBoardId = await this.access.boardIdForTask(taskId);
    await this.access.requireEditAccess(sourceBoardId, userId);

    const targetBoardId = await this.access.boardIdForColumn(dto.targetColumnId);
    // Guard against moving a task into a column that belongs to a different board
    // (e.g. a stale client sending an id it no longer has access to).
    if (targetBoardId !== sourceBoardId) {
      await this.access.requireEditAccess(targetBoardId, userId);
    }

    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.findUnique({ where: { id: taskId } });
      if (!task) throw new NotFoundException('Task not found');

      // Siblings in the destination column, excluding the task being moved,
      // in their current order.
      const siblings = await tx.task.findMany({
        where: { columnId: dto.targetColumnId, id: { not: taskId } },
        orderBy: { position: 'asc' },
      });

      const index = Math.max(0, Math.min(dto.targetIndex, siblings.length));
      const prev = siblings[index - 1];
      const next = siblings[index];
      const position = computePosition(prev?.position, next?.position);

      return tx.task.update({
        where: { id: taskId },
        data: { columnId: dto.targetColumnId, position },
      });
    });
  }
}
