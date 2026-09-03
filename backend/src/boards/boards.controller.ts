import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { BoardsService } from './boards.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { ShareBoardDto } from './dto/share-board.dto';

interface AuthedUser {
  id: string;
  email: string;
  name: string;
}

@Controller('boards')
@UseGuards(JwtAuthGuard)
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Post()
  create(@CurrentUser() user: AuthedUser, @Body() dto: CreateBoardDto) {
    return this.boardsService.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthedUser) {
    return this.boardsService.listForUser(user.id);
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    return this.boardsService.getOne(id, user.id);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthedUser, @Param('id') id: string, @Body() dto: UpdateBoardDto) {
    return this.boardsService.update(id, user.id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    return this.boardsService.remove(id, user.id);
  }

  @Post(':id/share')
  share(@CurrentUser() user: AuthedUser, @Param('id') id: string, @Body() dto: ShareBoardDto) {
    return this.boardsService.share(id, user.id, dto);
  }

  @Delete(':id/members/:userId')
  unshare(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.boardsService.unshare(id, user.id, targetUserId);
  }
}
