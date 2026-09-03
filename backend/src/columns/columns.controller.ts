import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { ColumnsService } from './columns.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { ReorderColumnDto } from './dto/reorder-column.dto';

interface AuthedUser {
  id: string;
}

@Controller()
@UseGuards(JwtAuthGuard)
export class ColumnsController {
  constructor(private readonly columnsService: ColumnsService) {}

  @Post('boards/:boardId/columns')
  create(
    @CurrentUser() user: AuthedUser,
    @Param('boardId') boardId: string,
    @Body() dto: CreateColumnDto,
  ) {
    return this.columnsService.create(boardId, user.id, dto);
  }

  @Patch('columns/:id')
  update(@CurrentUser() user: AuthedUser, @Param('id') id: string, @Body() dto: UpdateColumnDto) {
    return this.columnsService.update(id, user.id, dto);
  }

  @Delete('columns/:id')
  remove(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    return this.columnsService.remove(id, user.id);
  }

  @Patch('columns/:id/reorder')
  reorder(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Body() dto: ReorderColumnDto,
  ) {
    return this.columnsService.reorder(id, user.id, dto);
  }
}
