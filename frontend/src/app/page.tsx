'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

// Root just redirects to the boards list (if logged in) or the login page.
export default function Home() {
  const router = useRouter();
  const { user, initializing } = useAuth();

  useEffect(() => {
    if (initializing) return;
    router.replace(user ? '/boards' : '/login');
  }, [user, initializing, router]);

  return null;
}
