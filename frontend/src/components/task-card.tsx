'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/lib/api';

interface Props {
  task: Task;
  onDelete: () => void;
  onEdit: () => void;
}

export function TaskCard({ task, onDelete, onEdit }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group bg-white border border-gray-200 rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-brand-300"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-gray-800 whitespace-pre-wrap">{task.title}</p>
        <div className="opacity-0 group-hover:opacity-100 flex gap-1 shrink-0">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="text-xs text-gray-400 hover:text-brand-600"
          >
            edit
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-xs text-gray-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      </div>
      {task.description && (
        <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">{task.description}</p>
      )}
    </div>
  );
}
