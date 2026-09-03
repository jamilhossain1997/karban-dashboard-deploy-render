import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';

interface AuthedUser {
  id: string;
}

@Controller()
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('columns/:columnId/tasks')
  create(
    @CurrentUser() user: AuthedUser,
    @Param('columnId') columnId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(columnId, user.id, dto);
  }

  @Patch('tasks/:id')
  update(@CurrentUser() user: AuthedUser, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(id, user.id, dto);
  }

  @Delete('tasks/:id')
  remove(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    return this.tasksService.remove(id, user.id);
  }

  // Single endpoint for both same-column reordering and cross-column moves:
  // the caller always supplies the destination column + target index.
  @Patch('tasks/:id/move')
  move(@CurrentUser() user: AuthedUser, @Param('id') id: string, @Body() dto: MoveTaskDto) {
    return this.tasksService.move(id, user.id, dto);
  }
}
