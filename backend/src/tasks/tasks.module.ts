import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { BoardsModule } from '../boards/boards.module';

@Module({
  imports: [BoardsModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
