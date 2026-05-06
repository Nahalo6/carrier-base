'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';

export default function AuthGuard({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentUser = useAuthStore(s => s.currentUser);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!currentUser) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (adminOnly && currentUser.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [currentUser, hydrated, adminOnly, pathname, router]);

  // While hydrating or before redirect happens
  if (!hydrated || !currentUser || (adminOnly && currentUser.role !== 'admin')) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#94a3b8', fontSize: 13 }}>
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
