'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Board } from '@/lib/api';
import { RequireAuth } from '@/components/require-auth';
import { TopBar } from '@/components/topbar';

function BoardsPageInner() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get<Board[]>('/boards');
    setBoards(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const createBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      await api.post('/boards', { title });
      setTitle('');
      await load();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Your boards</h1>

        <form onSubmit={createBoard} className="flex gap-2 mb-8 max-w-md">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New board title"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            disabled={creating}
            className="bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            Create
          </button>
        </form>

        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : boards.length === 0 ? (
          <p className="text-sm text-gray-400">No boards yet — create your first one above.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board) => (
              <Link
                key={board.id}
                href={`/boards/${board.id}`}
                className="block bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <h2 className="font-medium text-gray-900 mb-1">{board.title}</h2>
                {board.description && (
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">{board.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{board._count?.columns ?? 0} columns</span>
                  <span>{board.members.length} member{board.members.length === 1 ? '' : 's'}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function BoardsPage() {
  return (
    <RequireAuth>
      <BoardsPageInner />
    </RequireAuth>
  );
}
