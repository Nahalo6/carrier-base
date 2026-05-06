'use client';
import { useState } from 'react';
import { useAuthStore, type EmailIntegration, type EmailProvider } from '@/lib/auth';
import Modal from '@/components/ui/Modal';

const TABS = ['Email Integration', 'Profile', 'Notifications', 'Security'] as const;
type TabKey = typeof TABS[number];

interface ProviderInfo {
  id: EmailProvider;
  name: string;
  description: string;
  badge: string;
  color: { bg: string; color: string; border: string };
}

const PROVIDERS: ProviderInfo[] = [
  { id: 'gmail',   name: 'Google Workspace / Gmail', description: 'OAuth 2.0 — recommended for most agencies', badge: 'Most popular', color: { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' } },
  { id: 'outlook', name: 'Microsoft 365 / Outlook',  description: 'OAuth 2.0 — best for enterprise agencies',   badge: 'Enterprise', color: { bg: '#eff6ff', color: '#1e40af', border: '#93c5fd' } },
  { id: 'smtp',    name: 'IMAP / SMTP',              description: 'Connect any email provider manually',          badge: 'Universal',  color: { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' } },
  { id: 'resend',  name: 'Transactional API',        description: 'Send only — for receipts and notifications',  badge: 'API',        color: { bg: '#f0fdfa', color: '#0f766e', border: '#5eead4' } },
];

export default function SettingsPage() {
  const currentUser = useAuthStore(s => s.currentUser);
  const connectEmail = useAuthStore(s => s.connectEmail);
  const disconnectEmail = useAuthStore(s => s.disconnectEmail);
  const updateProfile = useAuthStore(s => s.updateProfile);
  const changePassword = useAuthStore(s => s.changePassword);
  const [tab, setTab] = useState<TabKey>('Email Integration');
  const [connectModal, setConnectModal] = useState<EmailProvider | null>(null);

  if (!currentUser) return null;

  return (
    <>
      <div className="app-header">
        <h1>Settings</h1>
        <div style={{ fontSize: 13, color: '#64748b' }}>Personal preferences for {currentUser.email}</div>
      </div>
      <div className="content">
        {/* Tab strip */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: '10px 16px', fontSize: 13, fontWeight: 600, background: 'none', border: 'none',
                cursor: 'pointer', borderBottom: `2px solid ${tab === t ? '#2563eb' : 'transparent'}`,
                color: tab === t ? '#2563eb' : '#64748b', marginBottom: -1,
              }}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'Email Integration' && (
          <EmailIntegrationTab
            user={currentUser}
            onConnect={p => setConnectModal(p)}
            onDisconnect={() => disconnectEmail(currentUser.id)}
          />
        )}

        {tab === 'Profile' && (
          <ProfileTab user={currentUser} updateProfile={updateProfile} />
        )}

        {tab === 'Notifications' && (
          <NotificationsTab user={currentUser} updateProfile={updateProfile} />
        )}

        {tab === 'Security' && (
          <SecurityTab user={currentUser} changePassword={changePassword} />
        )}
      </div>

      {connectModal && (
        <ConnectEmailModal
          provider={connectModal}
          userId={currentUser.id}
          userName={currentUser.name}
          onClose={() => setConnectModal(null)}
          onConnect={(integration) => { connectEmail(currentUser.id, integration); setConnectModal(null); }}
        />
      )}
    </>
  );
}

// ─── Email Integration Tab ───────────────────────────────────────────────────
function EmailIntegrationTab({ user, onConnect, onDisconnect }: {
  user: ReturnType<typeof useAuthStore.getState>['currentUser'];
  onConnect: (p: EmailProvider) => void;
  onDisconnect: () => void;
}) {
  const ei = user?.emailIntegration;

  return (
    <div>
      {/* Connection status */}
      {ei && ei.status === 'connected' ? (
        <div className="panel" style={{ marginBottom: 18, background: '#f0fdfa', border: '2px solid #5eead4' }}>
          <div className="flex flex-between" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div className="flex" style={{ gap: 14, alignItems: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fff', color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #5eead4' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M22 6l-10 7L2 6"/><rect x="2" y="4" width="20" height="16" rx="2"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Connected</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1b2a4a' }}>{ei.fromAddress}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  via {ei.provider === 'gmail' ? 'Google Workspace' : ei.provider === 'outlook' ? 'Microsoft 365' : ei.provider === 'smtp' ? 'IMAP/SMTP' : 'Transactional API'}
                  · since {new Date(ei.connectedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="flex" style={{ gap: 8 }}>
              <button className="btn-s" onClick={() => onConnect(ei.provider)}>Reconfigure</button>
              <button className="btn-s btn-danger" onClick={() => { if (confirm('Disconnect this email account? Future emails will fall back to the platform default address until you reconnect.')) onDisconnect(); }}>Disconnect</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="panel" style={{ marginBottom: 18, background: '#eff6ff', border: '1px solid #93c5fd' }}>
          <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: 4 }}>No email account connected</div>
          <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
            Connect your work email below so emails you compose from any account go out from <b>your address</b>. Brokers and underwriters reply directly to you, and replies sync back into the matching lead.
          </div>
        </div>
      )}

      {/* Provider grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 22 }}>
        {PROVIDERS.map(p => {
          const isConnected = ei?.provider === p.id && ei.status === 'connected';
          return (
            <div key={p.id} style={{
              background: '#fff', border: `2px solid ${isConnected ? '#5eead4' : '#e2e8f0'}`,
              borderRadius: 14, padding: 18, position: 'relative',
            }}>
              <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 100, background: p.color.bg, color: p.color.color, border: `1px solid ${p.color.border}`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {p.badge}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1b2a4a', marginBottom: 4, paddingRight: 80 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14, lineHeight: 1.5 }}>{p.description}</div>

              {isConnected ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#0f766e', fontWeight: 700 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Connected as {ei.fromAddress}
                </div>
              ) : (
                <button className="btn-p btn-sm" onClick={() => onConnect(p.id)}>
                  Connect {p.id === 'gmail' ? 'Gmail' : p.id === 'outlook' ? 'Outlook' : p.id === 'smtp' ? 'SMTP' : 'API'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* What this enables */}
      <div className="panel">
        <div style={{ fontSize: 12, fontWeight: 700, color: '#1b2a4a', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>What email integration unlocks</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {[
            { title: 'Send from your address', desc: 'Brokers and underwriters see emails coming from you, not from a generic CRM bot.' },
            { title: 'Automatic reply sync', desc: 'Inbound replies show up in the matching lead’s Emails tab automatically.' },
            { title: 'Send tracking', desc: 'See open and click events on submissions and follow-ups.' },
            { title: 'Templated submissions', desc: 'Build reusable email templates for new business and renewals.' },
          ].map(item => (
            <div key={item.title} style={{ padding: 14, background: '#f8fafc', borderRadius: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1b2a4a', marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Connect Email Modal ─────────────────────────────────────────────────────
function ConnectEmailModal({ provider, userId, userName, onClose, onConnect }: {
  provider: EmailProvider;
  userId: string;
  userName: string;
  onClose: () => void;
  onConnect: (integration: EmailIntegration) => void;
}) {
  const [step, setStep] = useState<'authorize' | 'manual' | 'success'>(provider === 'smtp' ? 'manual' : 'authorize');
  const [authorizing, setAuthorizing] = useState(false);
  const [smtp, setSmtp] = useState({
    fromAddress: '', smtpHost: '', smtpPort: 587, smtpUsername: '', smtpUseTLS: true,
  });
  const [signature, setSignature] = useState('');

  const providerName = provider === 'gmail' ? 'Google' : provider === 'outlook' ? 'Microsoft' : provider === 'smtp' ? 'SMTP server' : 'Transactional API';

  const handleAuthorize = () => {
    setAuthorizing(true);
    // In production, this redirects to OAuth provider. Here we simulate.
    setTimeout(() => {
      const mockEmail = `${userName.toLowerCase().replace(/\s+/g, '.')}@${provider === 'gmail' ? 'gmail.com' : 'outlook.com'}`;
      onConnect({
        provider, fromAddress: mockEmail, fromName: userName,
        connectedAt: new Date().toISOString(), status: 'connected',
        signature,
      });
    }, 1200);
  };

  const handleSmtpConnect = () => {
    if (!smtp.fromAddress || !smtp.smtpHost) { alert('From address and SMTP host required.'); return; }
    onConnect({
      provider: 'smtp', fromAddress: smtp.fromAddress, fromName: userName,
      smtpHost: smtp.smtpHost, smtpPort: smtp.smtpPort, smtpUsername: smtp.smtpUsername || smtp.fromAddress,
      smtpUseTLS: smtp.smtpUseTLS, connectedAt: new Date().toISOString(), status: 'connected',
      signature,
    });
  };

  if (step === 'authorize' && (provider === 'gmail' || provider === 'outlook' || provider === 'resend')) {
    return (
      <Modal title={`Connect ${providerName}`} onClose={onClose} width={520}>
        <div style={{ padding: '6px 0' }}>
          {/* Mock OAuth screen */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 22, marginBottom: 16, boxShadow: '0 8px 24px -8px rgba(15,23,42,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: '#1b2a4a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>CB</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1b2a4a' }}>Carrier Base</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>wants to access your {providerName} account</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#475569', marginBottom: 12 }}>This will allow Carrier Base to:</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13 }}>
              {[
                'Send emails on your behalf',
                'Read replies to emails sent through Carrier Base',
                'See your name and email address',
              ].map(item => (
                <li key={item} style={{ display: 'flex', gap: 10, padding: '6px 0', color: '#475569' }}>
                  <span style={{ color: '#0f766e', fontWeight: 700, marginTop: 2 }}>·</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="lbl">Email signature (optional)</label>
            <textarea className="inp" rows={3} value={signature} onChange={e => setSignature(e.target.value)}
              placeholder={`${userName}\nProducer · Carrier Base\nyour-phone · your-email`} />
          </div>

          <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 12px', fontSize: 11, color: '#92400e', marginBottom: 14, lineHeight: 1.5 }}>
            <b>Demo note:</b> In production, this redirects to {providerName}’s real OAuth consent screen. For now, clicking <b>Allow & Connect</b> simulates a successful connection.
          </div>

          <div className="flex" style={{ gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn-s" onClick={onClose} disabled={authorizing}>Cancel</button>
            <button className="btn-p" onClick={handleAuthorize} disabled={authorizing} style={{ minWidth: 160 }}>
              {authorizing ? 'Connecting…' : `Allow & Connect`}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // SMTP manual flow
  return (
    <Modal title="Connect SMTP / IMAP" onClose={onClose} width={580}>
      <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 8, padding: '10px 12px', fontSize: 11, color: '#1e40af', marginBottom: 14, lineHeight: 1.5 }}>
        Find these settings in your email provider’s SMTP/IMAP section. For Gmail, use an app password.
      </div>
      <div className="grid grid-2" style={{ gap: 12 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="lbl">Email Address (From)</label>
          <input className="inp" type="email" value={smtp.fromAddress} onChange={e => setSmtp({ ...smtp, fromAddress: e.target.value })} placeholder="you@yourdomain.com" />
        </div>
        <div>
          <label className="lbl">SMTP Host</label>
          <input className="inp" value={smtp.smtpHost} onChange={e => setSmtp({ ...smtp, smtpHost: e.target.value })} placeholder="smtp.gmail.com" />
        </div>
        <div>
          <label className="lbl">Port</label>
          <input className="inp" type="number" value={smtp.smtpPort} onChange={e => setSmtp({ ...smtp, smtpPort: Number(e.target.value) })} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="lbl">Username (usually your email)</label>
          <input className="inp" value={smtp.smtpUsername} onChange={e => setSmtp({ ...smtp, smtpUsername: e.target.value })} placeholder="(defaults to From address)" />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="lbl">Password / App Password</label>
          <input className="inp" type="password" placeholder="••••••••" />
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>Stored encrypted — never visible to other users.</div>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#475569', cursor: 'pointer' }}>
            <input type="checkbox" checked={smtp.smtpUseTLS} onChange={e => setSmtp({ ...smtp, smtpUseTLS: e.target.checked })} style={{ accentColor: '#2563eb', width: 14, height: 14 }} />
            Use TLS encryption (recommended)
          </label>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="lbl">Email signature (optional)</label>
          <textarea className="inp" rows={3} value={signature} onChange={e => setSignature(e.target.value)} />
        </div>
      </div>
      <div className="flex" style={{ gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn-s" onClick={onClose}>Cancel</button>
        <button className="btn-p" onClick={handleSmtpConnect}>Connect</button>
      </div>
    </Modal>
  );
}

// ─── Profile Tab ─────────────────────────────────────────────────────────────
function ProfileTab({ user, updateProfile }: { user: NonNullable<ReturnType<typeof useAuthStore.getState>['currentUser']>; updateProfile: (id: string, u: Record<string, unknown>) => void }) {
  const [form, setForm] = useState({
    name: user.name, phone: user.phone || '',
    emailSignature: user.emailSignature || '',
  });
  const [saved, setSaved] = useState(false);
  const save = () => {
    updateProfile(user.id, form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  return (
    <div className="panel">
      <div style={{ fontWeight: 700, fontSize: 15, color: '#1b2a4a', marginBottom: 14 }}>Profile</div>
      <div className="grid grid-2" style={{ gap: 12 }}>
        <div><label className="lbl">Full Name</label><input className="inp" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="lbl">Email</label><input className="inp" value={user.email} disabled /></div>
        <div><label className="lbl">Phone</label><input className="inp" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
        <div><label className="lbl">Role</label><input className="inp" value={user.role} disabled style={{ textTransform: 'capitalize' }} /></div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="lbl">Default Email Signature</label>
          <textarea className="inp" rows={4} value={form.emailSignature} onChange={e => setForm({ ...form, emailSignature: e.target.value })}
            placeholder={`${user.name}\nProducer · Carrier Base\n555-555-5555`} />
        </div>
      </div>
      <div className="flex" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 16, alignItems: 'center' }}>
        {saved && <span style={{ fontSize: 12, color: '#0f766e', fontWeight: 600 }}>Profile saved</span>}
        <button className="btn-p" onClick={save}>Save Changes</button>
      </div>
    </div>
  );
}

function NotificationsTab({ user, updateProfile }: { user: NonNullable<ReturnType<typeof useAuthStore.getState>['currentUser']>; updateProfile: (id: string, u: Record<string, unknown>) => void }) {
  const prefs = user.notificationPrefs || {};
  const [form, setForm] = useState({
    emailAlerts: prefs.emailAlerts ?? true,
    renewalReminders: prefs.renewalReminders ?? true,
    weeklyDigest: prefs.weeklyDigest ?? false,
  });
  const save = () => updateProfile(user.id, { notificationPrefs: form });
  return (
    <div className="panel">
      <div style={{ fontWeight: 700, fontSize: 15, color: '#1b2a4a', marginBottom: 14 }}>Email Notifications</div>
      {[
        { key: 'emailAlerts', title: 'Inbound email alerts', desc: 'Get notified when a broker, underwriter, or insured replies to one of your accounts.' },
        { key: 'renewalReminders', title: 'Renewal reminders', desc: 'Daily digest of policies renewing in the next 30/60/90 days.' },
        { key: 'weeklyDigest', title: 'Weekly performance digest', desc: 'Summary of pipeline movement, bound premium, and top opportunities each Monday.' },
      ].map(o => (
        <label key={o.key} style={{ display: 'flex', gap: 12, padding: 14, marginBottom: 8, background: '#f8fafc', borderRadius: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={(form as Record<string, boolean>)[o.key]} onChange={e => setForm(p => ({ ...p, [o.key]: e.target.checked }))} style={{ accentColor: '#2563eb', width: 16, height: 16, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1b2a4a' }}>{o.title}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{o.desc}</div>
          </div>
        </label>
      ))}
      <div className="flex" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
        <button className="btn-p" onClick={save}>Save Preferences</button>
      </div>
    </div>
  );
}

function SecurityTab({ user, changePassword }: { user: NonNullable<ReturnType<typeof useAuthStore.getState>['currentUser']>; changePassword: (id: string, pw: string) => void }) {
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = () => {
    if (oldPw !== user.password) { setMsg({ ok: false, text: 'Current password is incorrect.' }); return; }
    if (newPw.length < 6) { setMsg({ ok: false, text: 'New password must be at least 6 characters.' }); return; }
    if (newPw !== confirm) { setMsg({ ok: false, text: 'New passwords do not match.' }); return; }
    changePassword(user.id, newPw);
    setMsg({ ok: true, text: 'Password changed successfully.' });
    setOldPw(''); setNewPw(''); setConfirm('');
  };

  return (
    <div className="panel">
      <div style={{ fontWeight: 700, fontSize: 15, color: '#1b2a4a', marginBottom: 14 }}>Change Password</div>
      <div style={{ maxWidth: 400 }}>
        <div style={{ marginBottom: 12 }}><label className="lbl">Current Password</label><input className="inp" type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} /></div>
        <div style={{ marginBottom: 12 }}><label className="lbl">New Password</label><input className="inp" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} /></div>
        <div style={{ marginBottom: 14 }}><label className="lbl">Confirm New Password</label><input className="inp" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} /></div>
        {msg && (
          <div style={{ background: msg.ok ? '#f0fdfa' : '#fff1f2', border: `1px solid ${msg.ok ? '#5eead4' : '#fda4af'}`, color: msg.ok ? '#0f766e' : '#9f1239', padding: '10px 12px', borderRadius: 8, fontSize: 12, marginBottom: 12 }}>
            {msg.text}
          </div>
        )}
        <button className="btn-p" onClick={submit}>Update Password</button>
      </div>
    </div>
  );
}
