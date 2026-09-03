import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BoardsModule } from './boards/boards.module';
import { ColumnsModule } from './columns/columns.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    BoardsModule,
    ColumnsModule,
    TasksModule,
  ],
})
export class AppModule {}
