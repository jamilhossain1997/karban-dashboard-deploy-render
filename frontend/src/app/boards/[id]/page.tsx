'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { api, Board, Column, Task } from '@/lib/api';
import { moveTaskLocally } from '@/lib/move-task';
import { RequireAuth } from '@/components/require-auth';
import { TopBar } from '@/components/topbar';
import { BoardColumn } from '@/components/board-column';
import { TaskCard } from '@/components/task-card';
import { ShareBoardModal } from '@/components/share-board-modal';
import { useAuth } from '@/lib/auth-context';

function BoardDetailInner() {
  const params = useParams<{ id: string }>();
  const boardId = params.id;
  const { user } = useAuth();

  const [board, setBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumn, setActiveColumn] = useState<Column | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editDraft, setEditDraft] = useState({ title: '', description: '' });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const isOwner = board?.ownerId === user?.id;
  const myRole = board?.members.find((m) => m.userId === user?.id)?.role;
  const canEdit = myRole === 'OWNER' || myRole === 'EDITOR';

  const loadBoard = async () => {
    setError(null);
    try {
      const { data } = await api.get<Board>(`/boards/${boardId}`);
      setBoard(data);
      setColumns(data.columns ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not load this board');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  const columnIds = useMemo(() => columns.map((c) => c.id), [columns]);

  const onDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'task') setActiveTask(data.task as Task);
    if (data?.type === 'column') setActiveColumn(data.column as Column);
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setActiveColumn(null);
    if (!over || !canEdit) return;

    const activeData = active.data.current;

    // --- Column reordering ---
    if (activeData?.type === 'column') {
      if (active.id === over.id) return;
      const oldIndex = columns.findIndex((c) => c.id === active.id);
      const newIndex = columns.findIndex((c) => c.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(columns, oldIndex, newIndex);
      setColumns(reordered);
      try {
        await api.patch(`/columns/${active.id}/reorder`, { index: newIndex });
      } catch {
        await loadBoard();
      }
      return;
    }

    // --- Task moving (same column reorder, or cross-column move) ---
    const taskId = active.id as string;
    const sourceColumn = columns.find((c) => c.tasks.some((t) => t.id === taskId));
    if (!sourceColumn) return;

    let destColumnId: string;
    let destIndex: number;

    if (over.data.current?.type === 'column') {
      destColumnId = (over.data.current.columnId as string) ?? (over.id as string);
      const destColumn = columns.find((c) => c.id === destColumnId);
      destIndex = destColumn ? destColumn.tasks.filter((t) => t.id !== taskId).length : 0;
    } else {
      const overTaskId = over.id as string;
      const destColumn = columns.find((c) => c.tasks.some((t) => t.id === overTaskId));
      if (!destColumn) return;
      destColumnId = destColumn.id;
      destIndex = destColumn.tasks.findIndex((t) => t.id === overTaskId);
    }

    if (destColumnId === sourceColumn.id) {
      const currentIndex = sourceColumn.tasks.findIndex((t) => t.id === taskId);
      if (currentIndex === destIndex) return;
    }

    const previousColumns = columns;
    setColumns((prev) => moveTaskLocally(prev, taskId, destColumnId, destIndex));

    try {
      await api.patch(`/tasks/${taskId}/move`, {
        targetColumnId: destColumnId,
        targetIndex: destIndex,
      });
    } catch {
      setColumns(previousColumns);
      await loadBoard();
    }
  };

  const addColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;
    const { data } = await api.post<Column>(`/boards/${boardId}/columns`, {
      title: newColumnTitle.trim(),
    });
    setColumns((prev) => [...prev, { ...data, tasks: [] }]);
    setNewColumnTitle('');
    setAddingColumn(false);
  };

  const deleteColumn = async (columnId: string) => {
    if (!confirm('Delete this column and all its tasks?')) return;
    setColumns((prev) => prev.filter((c) => c.id !== columnId));
    await api.delete(`/columns/${columnId}`);
  };

  const renameColumn = async (columnId: string, title: string) => {
    setColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, title } : c)));
    await api.patch(`/columns/${columnId}`, { title });
  };

  const addTask = async (columnId: string, title: string) => {
    const { data } = await api.post<Task>(`/columns/${columnId}/tasks`, { title });
    setColumns((prev) =>
      prev.map((c) => (c.id === columnId ? { ...c, tasks: [...c.tasks, data] } : c)),
    );
  };

  const deleteTask = async (taskId: string) => {
    setColumns((prev) =>
      prev.map((c) => ({ ...c, tasks: c.tasks.filter((t) => t.id !== taskId) })),
    );
    await api.delete(`/tasks/${taskId}`);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setEditDraft({ title: task.title, description: task.description || '' });
  };

  const saveEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    const { title, description } = editDraft;
    setColumns((prev) =>
      prev.map((c) => ({
        ...c,
        tasks: c.tasks.map((t) => (t.id === editingTask.id ? { ...t, title, description } : t)),
      })),
    );
    await api.patch(`/tasks/${editingTask.id}`, { title, description });
    setEditingTask(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">
        Loading board…
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-red-500">
        {error || 'Board not found'}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar backHref="/boards" />
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{board.title}</h1>
            {board.description && <p className="text-sm text-gray-500">{board.description}</p>}
          </div>
          <button
            onClick={() => setShareOpen(true)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700 hover:bg-gray-50"
          >
            Share ({board.members.length})
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-x-auto px-6 py-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-4 h-full items-start">
              {columns.map((column) => (
                <BoardColumn
                  key={column.id}
                  column={column}
                  onAddTask={addTask}
                  onDeleteTask={deleteTask}
                  onEditTask={openEditTask}
                  onDeleteColumn={deleteColumn}
                  onRenameColumn={renameColumn}
                />
              ))}

              {canEdit &&
                (addingColumn ? (
                  <form onSubmit={addColumn} className="w-72 shrink-0">
                    <input
                      autoFocus
                      value={newColumnTitle}
                      onChange={(e) => setNewColumnTitle(e.target.value)}
                      onBlur={() => !newColumnTitle && setAddingColumn(false)}
                      placeholder="Column title"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </form>
                ) : (
                  <button
                    onClick={() => setAddingColumn(true)}
                    className="w-72 shrink-0 h-11 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-400 hover:text-brand-600 hover:border-brand-300"
                  >
                    + Add column
                  </button>
                ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeTask && (
              <TaskCard task={activeTask} onDelete={() => {}} onEdit={() => {}} />
            )}
            {activeColumn && (
              <div className="w-72 bg-gray-100 rounded-xl p-3 shadow-lg">
                <h3 className="text-sm font-semibold text-gray-700">{activeColumn.title}</h3>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </main>

      {shareOpen && (
        <ShareBoardModal
          board={board}
          isOwner={isOwner}
          onClose={() => setShareOpen(false)}
          onMemberAdded={(member) =>
            setBoard((prev) => (prev ? { ...prev, members: [...prev.members, member] } : prev))
          }
          onMemberRemoved={(userId) =>
            setBoard((prev) =>
              prev ? { ...prev, members: prev.members.filter((m) => m.userId !== userId) } : prev,
            )
          }
        />
      )}

      {editingTask && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <form
            onSubmit={saveEditTask}
            className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 space-y-3"
          >
            <h2 className="font-semibold text-gray-900">Edit task</h2>
            <input
              value={editDraft.title}
              onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Title"
            />
            <textarea
              value={editDraft.description}
              onChange={(e) => setEditDraft((d) => ({ ...d, description: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Description (optional)"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="text-sm text-gray-500 px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-3 py-1.5 font-medium"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function BoardDetailPage() {
  return (
    <RequireAuth>
      <BoardDetailInner />
    </RequireAuth>
  );
}
