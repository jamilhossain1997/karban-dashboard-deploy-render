import { Module } from '@nestjs/common';
import { ColumnsService } from './columns.service';
import { ColumnsController } from './columns.controller';
import { BoardsModule } from '../boards/boards.module';

@Module({
  imports: [BoardsModule],
  controllers: [ColumnsController],
  providers: [ColumnsService],
})
export class ColumnsModule {}
