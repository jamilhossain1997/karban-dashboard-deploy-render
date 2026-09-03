import { Column, Task } from './api';

// Pure helper (kept out of the component so it's easy to reason about/tests):
// removes `taskId` from wherever it currently lives and re-inserts it into
// `destColumnId` at `destIndex`, returning a brand-new columns array.
export function moveTaskLocally(
  columns: Column[],
  taskId: string,
  destColumnId: string,
  destIndex: number,
): Column[] {
  let movedTask: Task | undefined;

  const withoutTask = columns.map((col) => {
    const idx = col.tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return col;
    movedTask = col.tasks[idx];
    const tasks = [...col.tasks];
    tasks.splice(idx, 1);
    return { ...col, tasks };
  });

  if (!movedTask) return columns;

  return withoutTask.map((col) => {
    if (col.id !== destColumnId) return col;
    const tasks = [...col.tasks];
    const clampedIndex = Math.max(0, Math.min(destIndex, tasks.length));
    tasks.splice(clampedIndex, 0, { ...movedTask!, columnId: destColumnId });
    return { ...col, tasks };
  });
}
