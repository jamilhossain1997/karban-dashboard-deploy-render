import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BoardRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Centralizes every authorization check for boards/columns/tasks so
// "who can see or mutate this board" lives in exactly one place.
@Injectable()
export class BoardAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the caller's membership row for a board, or throws.
   * - 404 (not 403) when the user has no access at all, so we never leak
   *   the existence of boards the user isn't a member of.
   */
  async requireMembership(boardId: string, userId: string) {
    const membership = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId } },
    });
    if (!membership) {
      throw new NotFoundException('Board not found');
    }
    return membership;
  }

  async requireViewAccess(boardId: string, userId: string) {
    // Any role (OWNER/EDITOR/VIEWER) can view.
    return this.requireMembership(boardId, userId);
  }

  async requireEditAccess(boardId: string, userId: string) {
    const membership = await this.requireMembership(boardId, userId);
    if (membership.role === BoardRole.VIEWER) {
      throw new ForbiddenException('You only have view access to this board');
    }
    return membership;
  }

  async requireOwnerAccess(boardId: string, userId: string) {
    const membership = await this.requireMembership(boardId, userId);
    if (membership.role !== BoardRole.OWNER) {
      throw new ForbiddenException('Only the board owner can perform this action');
    }
    return membership;
  }

  /** Resolves the boardId that a column belongs to, or throws 404. */
  async boardIdForColumn(columnId: string) {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      select: { boardId: true },
    });
    if (!column) throw new NotFoundException('Column not found');
    return column.boardId;
  }

  /** Resolves the boardId that a task belongs to (via its column), or throws 404. */
  async boardIdForTask(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { column: { select: { boardId: true } } },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task.column.boardId;
  }
}
