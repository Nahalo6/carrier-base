'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const signIn = useAuthStore(s => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setTimeout(() => {
      const res = signIn(email, password);
      if (res.ok) {
        router.push('/dashboard');
      } else {
        setError(res.error);
        setLoading(false);
      }
    }, 200);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440, background: '#fff', padding: 36, borderRadius: 18, boxShadow: '0 20px 50px -16px rgba(15, 23, 42, 0.2)' }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#1b2a4a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>CB</div>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#1b2a4a' }}>Carrier Base</span>
        </Link>

        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1b2a4a', marginBottom: 6 }}>Sign in</h1>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>Welcome back. Enter your credentials to access your dashboard.</p>

        <form onSubmit={submit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#1b2a4a', display: 'block', marginBottom: 6 }}>Email</label>
            <input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@agency.com" autoFocus />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#1b2a4a', display: 'block', marginBottom: 6 }}>Password</label>
            <input className="inp" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          {error && (
            <div style={{ background: '#fff1f2', border: '1px solid #fda4af', color: '#9f1239', padding: '10px 12px', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: 12, background: '#1b2a4a', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div style={{ marginTop: 22, paddingTop: 22, borderTop: '1px solid #f1f5f9', textAlign: 'center', fontSize: 13, color: '#64748b' }}>
          Don&rsquo;t have an account? <Link href="/signup" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>Sign up</Link>
        </div>

        <div style={{ marginTop: 20, padding: 12, background: '#eff6ff', borderRadius: 10, fontSize: 11, color: '#1e40af' }}>
          <b>Demo accounts:</b><br/>
          Admin: <code>admin@carrierbase.app</code> / <code>admin</code>
        </div>
      </div>
    </div>
  );
}
