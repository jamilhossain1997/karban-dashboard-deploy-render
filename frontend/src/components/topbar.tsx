'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export function TopBar({ backHref }: { backHref?: string }) {
  const { user, logout } = useAuth();
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {backHref ? (
            <Link href={backHref} className="text-sm text-gray-500 hover:text-gray-800">
              ← Boards
            </Link>
          ) : (
            <span className="font-semibold text-gray-900">Mini Kanban</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>{user?.name}</span>
          <button onClick={logout} className="text-gray-400 hover:text-gray-700">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
