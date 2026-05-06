'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';

export default function SignOutPage() {
  const router = useRouter();
  const signOut = useAuthStore(s => s.signOut);
  const previousUser = useAuthStore(s => s.currentUser);
  const [done, setDone] = useState(false);
  const [name] = useState(previousUser?.name || '');

  useEffect(() => {
    signOut();
    setDone(true);
  }, [signOut]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 500, background: '#fff', padding: 40, borderRadius: 18, boxShadow: '0 20px 50px -16px rgba(15, 23, 42, 0.2)', textAlign: 'center' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#1b2a4a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>CB</div>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#1b2a4a' }}>Carrier Base</span>
        </Link>

        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 16, background: '#f0fdfa', color: '#0f766e', marginBottom: 18 }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1b2a4a', marginBottom: 6 }}>You&rsquo;re signed out</h1>
        <p style={{ color: '#64748b', marginBottom: 28, fontSize: 14 }}>
          {done && name ? <>Thanks for using Carrier Base, {name.split(' ')[0]}. Your session has ended.</> : 'Your session has ended.'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            onClick={() => router.push('/')}
            style={{ padding: 12, background: '#fff', color: '#1b2a4a', border: '1.5px solid #cbd5e1', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
            Back to Home
          </button>
          <button
            onClick={() => router.push('/login')}
            style={{ padding: 12, background: '#1b2a4a', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
            Sign In Again
          </button>
        </div>

        <div style={{ marginTop: 28, paddingTop: 22, borderTop: '1px solid #f1f5f9', fontSize: 12, color: '#64748b' }}>
          Need help? <a href="mailto:support@carrierbase.app" style={{ color: '#2563eb', fontWeight: 600 }}>support@carrierbase.app</a>
        </div>
      </div>
    </div>
  );
}
