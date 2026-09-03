'use client';

import { useState } from 'react';
import { api, Board, BoardMember } from '@/lib/api';

interface Props {
  board: Board;
  onClose: () => void;
  onMemberAdded: (member: BoardMember) => void;
  onMemberRemoved: (userId: string) => void;
  isOwner: boolean;
}

export function ShareBoardModal({ board, onClose, onMemberAdded, onMemberRemoved, isOwner }: Props) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { data } = await api.post(`/boards/${board.id}/share`, { email, role });
      onMemberAdded(data);
      setEmail('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not share board');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (userId: string) => {
    await api.delete(`/boards/${board.id}/members/${userId}`);
    onMemberRemoved(userId);
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Share "{board.title}"</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>

        {isOwner && (
          <form onSubmit={submit} className="flex gap-2 mb-4">
            <input
              type="email"
              required
              placeholder="Collaborator's email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'EDITOR' | 'VIEWER')}
              className="rounded-lg border border-gray-300 px-2 text-sm"
            >
              <option value="EDITOR">Editor</option>
              <option value="VIEWER">Viewer</option>
            </select>
            <button
              disabled={submitting}
              className="bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-60"
            >
              Invite
            </button>
          </form>
        )}
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {board.members.map((member) => (
            <li key={member.id} className="flex items-center justify-between text-sm">
              <div>
                <span className="text-gray-800">{member.user.name}</span>{' '}
                <span className="text-gray-400">({member.user.email})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase text-gray-400">{member.role}</span>
                {isOwner && member.role !== 'OWNER' && (
                  <button
                    onClick={() => remove(member.userId)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
