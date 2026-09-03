'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Column, Task } from '@/lib/api';
import { TaskCard } from './task-card';

interface Props {
  column: Column;
  onAddTask: (columnId: string, title: string) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteColumn: (columnId: string) => void;
  onRenameColumn: (columnId: string, title: string) => void;
}

export function BoardColumn({
  column,
  onAddTask,
  onDeleteTask,
  onEditTask,
  onDeleteColumn,
  onRenameColumn,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState(column.title);

  // The column itself is a sortable item (for horizontal column reordering)...
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id, data: { type: 'column', column } });

  // ...and separately a droppable zone for tasks dragged in from other columns
  // (this also needs to work when the column has zero tasks).
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `column-drop-${column.id}`,
    data: { type: 'column', columnId: column.id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const taskIds = column.tasks.map((t) => t.id);

  const submitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddTask(column.id, newTitle.trim());
    setNewTitle('');
    setAdding(false);
  };

  const submitRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (titleDraft.trim() && titleDraft !== column.title) {
      onRenameColumn(column.id, titleDraft.trim());
    }
    setRenaming(false);
  };

  return (
    <div
      ref={setSortableRef}
      style={style}
      className="w-72 shrink-0 bg-gray-100 rounded-xl p-3 flex flex-col max-h-full"
    >
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-between mb-3 cursor-grab active:cursor-grabbing"
      >
        {renaming ? (
          <form onSubmit={submitRename} className="flex-1">
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={submitRename}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-full text-sm font-semibold bg-white rounded px-2 py-1 border border-brand-300"
            />
          </form>
        ) : (
          <h3
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setRenaming(true)}
            className="text-sm font-semibold text-gray-700 px-1"
          >
            {column.title}{' '}
            <span className="text-gray-400 font-normal">({column.tasks.length})</span>
          </h3>
        )}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onDeleteColumn(column.id)}
          className="text-gray-400 hover:text-red-600 text-xs px-1"
        >
          ✕
        </button>
      </div>

      <div ref={setDroppableRef} className="flex-1 min-h-[40px] overflow-y-auto">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {column.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onDelete={() => onDeleteTask(task.id)}
                onEdit={() => onEditTask(task)}
              />
            ))}
          </div>
        </SortableContext>
      </div>

      {adding ? (
        <form onSubmit={submitAdd} className="mt-2">
          <textarea
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitAdd(e as unknown as React.FormEvent);
              }
              if (e.key === 'Escape') setAdding(false);
            }}
            placeholder="Task title"
            className="w-full text-sm rounded-lg border border-gray-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
            rows={2}
          />
          <div className="flex gap-2 mt-1">
            <button
              type="submit"
              className="text-xs bg-brand-600 text-white rounded px-2 py-1 font-medium"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="text-xs text-gray-500"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-2 text-sm text-gray-500 hover:text-brand-600 text-left px-1"
        >
          + Add task
        </button>
      )}
    </div>
  );
}
