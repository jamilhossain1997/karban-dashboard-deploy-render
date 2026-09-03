import { IsInt, Min } from 'class-validator';

export class ReorderColumnDto {
  // Target zero-based index among the board's columns.
  @IsInt()
  @Min(0)
  index: number;
}
