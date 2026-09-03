import { Module } from '@nestjs/common';
import { BoardsService } from './boards.service';
import { BoardsController } from './boards.controller';
import { BoardAccessService } from './board-access.service';

@Module({
  controllers: [BoardsController],
  providers: [BoardsService, BoardAccessService],
  exports: [BoardAccessService],
})
export class BoardsModule {}
