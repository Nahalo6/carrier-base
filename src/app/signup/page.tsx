'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth';

function SignupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const planParam = params.get('plan') || '';
  const signUp = useAuthStore(s => s.signUp);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setTimeout(() => {
      const res = signUp({ email, password, name, plan: planParam });
      if (res.ok) router.push('/dashboard');
      else { setError(res.error); setLoading(false); }
    }, 200);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 460, background: '#fff', padding: 36, borderRadius: 18, boxShadow: '0 20px 50px -16px rgba(15, 23, 42, 0.2)' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#1b2a4a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>CB</div>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#1b2a4a' }}>Carrier Base</span>
        </Link>

        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1b2a4a', marginBottom: 6 }}>Create your account</h1>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 22 }}>
          {planParam ? <>You&rsquo;re signing up for the <b style={{ color: '#0f766e', textTransform: 'capitalize' }}>{planParam}</b> plan.</> : 'Get started with Carrier Base in 30 seconds.'}
        </p>

        <form onSubmit={submit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#1b2a4a', display: 'block', marginBottom: 6 }}>Full Name</label>
            <input className="inp" value={name} onChange={e => setName(e.target.value)} required autoFocus />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#1b2a4a', display: 'block', marginBottom: 6 }}>Email</label>
            <input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@agency.com" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#1b2a4a', display: 'block', marginBottom: 6 }}>Password</label>
            <input className="inp" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#1b2a4a', display: 'block', marginBottom: 6 }}>Confirm Password</label>
            <input className="inp" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6} />
          </div>

          {error && (
            <div style={{ background: '#fff1f2', border: '1px solid #fda4af', color: '#9f1239', padding: '10px 12px', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: 12, background: '#0f766e', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div style={{ marginTop: 22, paddingTop: 22, borderTop: '1px solid #f1f5f9', textAlign: 'center', fontSize: 13, color: '#64748b' }}>
          Already have an account? <Link href="/login" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading…</div>}>
      <SignupInner />
    </Suspense>
  );
}
