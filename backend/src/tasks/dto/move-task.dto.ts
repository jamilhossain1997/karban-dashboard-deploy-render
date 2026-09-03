import { IsInt, IsString, Min } from 'class-validator';

export class MoveTaskDto {
  // Column the task should end up in - may be the same column it's already in.
  @IsString()
  targetColumnId: string;

  // Zero-based index the task should occupy within the target column's task list,
  // counting *after* the task has been removed from its source position.
  @IsInt()
  @Min(0)
  targetIndex: number;
}
