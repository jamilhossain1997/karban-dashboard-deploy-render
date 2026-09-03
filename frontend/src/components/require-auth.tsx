'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

// Wrap any page's content in this to redirect anonymous visitors to /login.
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, initializing } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!initializing && !user) {
      router.replace('/login');
    }
  }, [user, initializing, router]);

  if (initializing || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
