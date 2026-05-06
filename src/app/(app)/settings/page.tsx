'use client';
import { useState } from 'react';
import { useAuthStore, type EmailIntegration, type EmailProvider, type CalendarIntegration, type CalendarProvider, type ESignIntegration, type ESignProvider } from '@/lib/auth';
import { usePlatformStore } from '@/lib/platform';
import { fmt$ } from '@/lib/utils';
import Modal from '@/components/ui/Modal';

const TABS = ['Email Integration', 'Calendar', 'E-Signature', 'MVR Wallet', 'Profile', 'Notifications', 'Security'] as const;
type TabKey = typeof TABS[number];

// ─── Email providers ─────────────────────────────────────────────────────────
interface EmailProviderInfo {
  id: EmailProvider;
  name: string;
  description: string;
  badge: string;
  color: { bg: string; color: string; border: string };
  adminOnly?: boolean;
}

const EMAIL_PROVIDERS: EmailProviderInfo[] = [
  { id: 'gmail',   name: 'Google Workspace / Gmail', description: 'OAuth 2.0 — recommended for most agencies', badge: 'Most popular', color: { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' } },
  { id: 'outlook', name: 'Microsoft 365 / Outlook',  description: 'OAuth 2.0 — best for enterprise agencies',   badge: 'Enterprise', color: { bg: '#eff6ff', color: '#1e40af', border: '#93c5fd' } },
  { id: 'yahoo',   name: 'Yahoo Mail',               description: 'Connect via app password (SMTP)',              badge: 'Personal',   color: { bg: '#faf5ff', color: '#6b21a8', border: '#d8b4fe' } },
  { id: 'smtp',    name: 'IMAP / SMTP',              description: 'Any provider — manual configuration',          badge: 'Universal',  color: { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' } },
  { id: 'resend',  name: 'Transactional API',        description: 'Resend / SendGrid for receipts & automation', badge: 'Admin only', color: { bg: '#f0fdfa', color: '#0f766e', border: '#5eead4' }, adminOnly: true },
];

const CALENDAR_PROVIDERS: { id: CalendarProvider; name: string; description: string; badge: string; color: { bg: string; color: string; border: string } }[] = [
  { id: 'google',  name: 'Google Calendar',     description: 'Two-way sync with Google Calendar',  badge: 'Most popular', color: { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' } },
  { id: 'outlook', name: 'Outlook Calendar',    description: 'Two-way sync with Microsoft 365',    badge: 'Enterprise',   color: { bg: '#eff6ff', color: '#1e40af', border: '#93c5fd' } },
  { id: 'apple',   name: 'iCal / Apple',        description: 'iCal feed export — read-only',        badge: 'Read-only',    color: { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' } },
];

const ESIGN_PROVIDERS: { id: ESignProvider; name: string; description: string; badge: string; color: { bg: string; color: string; border: string } }[] = [
  { id: 'docusign',  name: 'DocuSign',     description: 'Industry-standard e-signature',           badge: 'Enterprise',   color: { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' } },
  { id: 'hellosign', name: 'HelloSign / Dropbox Sign', description: 'Affordable e-signature integrated with Dropbox', badge: 'Popular', color: { bg: '#eff6ff', color: '#1e40af', border: '#93c5fd' } },
  { id: 'adobesign', name: 'Adobe Acrobat Sign', description: 'Pairs with Adobe Acrobat workflows', badge: 'Adobe',  color: { bg: '#fff1f2', color: '#9f1239', border: '#fda4af' } },
];

// ─── Main page ───────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const currentUser = useAuthStore(s => s.currentUser);
  const connectEmail = useAuthStore(s => s.connectEmail);
  const disconnectEmail = useAuthStore(s => s.disconnectEmail);
  const connectCalendar = useAuthStore(s => s.connectCalendar);
  const disconnectCalendar = useAuthStore(s => s.disconnectCalendar);
  const connectESign = useAuthStore(s => s.connectESign);
  const disconnectESign = useAuthStore(s => s.disconnectESign);
  const updateProfile = useAuthStore(s => s.updateProfile);
  const changePassword = useAuthStore(s => s.changePassword);
  const [tab, setTab] = useState<TabKey>('Email Integration');
  const [emailModal, setEmailModal] = useState<EmailProvider | null>(null);
  const [calModal, setCalModal] = useState<CalendarProvider | null>(null);
  const [eSignModal, setESignModal] = useState<ESignProvider | null>(null);

  if (!currentUser) return null;

  return (
    <>
      <div className="app-header">
        <h1>Settings</h1>
        <div style={{ fontSize: 13, color: '#64748b' }}>Personal preferences for {currentUser.email}</div>
      </div>
      <div className="content">
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
          <EmailIntegrationTab user={currentUser} onConnect={p => setEmailModal(p)} onDisconnect={() => disconnectEmail(currentUser.id)} />
        )}
        {tab === 'Calendar' && (
          <CalendarTab user={currentUser} onConnect={p => setCalModal(p)} onDisconnect={() => disconnectCalendar(currentUser.id)} />
        )}
        {tab === 'E-Signature' && (
          <ESignTab user={currentUser} onConnect={p => setESignModal(p)} onDisconnect={() => disconnectESign(currentUser.id)} />
        )}
        {tab === 'MVR Wallet' && (
          <WalletTab userId={currentUser.id} />
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

      {emailModal && (
        <ConnectEmailModal provider={emailModal} userName={currentUser.name}
          onClose={() => setEmailModal(null)}
          onConnect={(integration) => { connectEmail(currentUser.id, integration); setEmailModal(null); }} />
      )}
      {calModal && (
        <ConnectCalendarModal provider={calModal} userName={currentUser.name}
          onClose={() => setCalModal(null)}
          onConnect={(integration) => { connectCalendar(currentUser.id, integration); setCalModal(null); }} />
      )}
      {eSignModal && (
        <ConnectESignModal provider={eSignModal} userName={currentUser.name}
          onClose={() => setESignModal(null)}
          onConnect={(integration) => { connectESign(currentUser.id, integration); setESignModal(null); }} />
      )}
    </>
  );
}

// ─── Email Integration Tab ───────────────────────────────────────────────────
function EmailIntegrationTab({ user, onConnect, onDisconnect }: {
  user: NonNullable<ReturnType<typeof useAuthStore.getState>['currentUser']>;
  onConnect: (p: EmailProvider) => void;
  onDisconnect: () => void;
}) {
  const ei = user.emailIntegration;
  const isAdmin = user.role === 'admin';
  const visibleProviders = EMAIL_PROVIDERS.filter(p => !p.adminOnly || isAdmin);

  return (
    <div>
      {ei && ei.status === 'connected' ? (
        <ConnectedBanner
          label="Connected" address={ei.fromAddress}
          providerLabel={ei.provider === 'gmail' ? 'Google Workspace' : ei.provider === 'outlook' ? 'Microsoft 365' : ei.provider === 'yahoo' ? 'Yahoo' : ei.provider === 'smtp' ? 'IMAP/SMTP' : 'Transactional API'}
          connectedAt={ei.connectedAt}
          onReconfigure={() => onConnect(ei.provider)} onDisconnect={onDisconnect} />
      ) : (
        <UnconnectedBanner
          title="No email account connected"
          description="Connect your work email below so emails you compose go out from your address. Brokers and underwriters reply directly to you, and replies sync back into the matching lead." />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 22 }}>
        {visibleProviders.map(p => {
          const isConnected = ei?.provider === p.id && ei.status === 'connected';
          return (
            <ProviderCard key={p.id} title={p.name} description={p.description} badge={p.badge} badgeColor={p.color}
              isConnected={isConnected} connectedAddress={isConnected ? ei.fromAddress : undefined}
              connectLabel={`Connect ${p.id === 'gmail' ? 'Gmail' : p.id === 'outlook' ? 'Outlook' : p.id === 'yahoo' ? 'Yahoo' : p.id === 'smtp' ? 'SMTP' : 'API'}`}
              onConnect={() => onConnect(p.id)} />
          );
        })}
      </div>

      <FeatureList title="What email integration unlocks" items={[
        { title: 'Send from your address',   desc: 'Brokers and underwriters see emails coming from you, not from a generic CRM bot.' },
        { title: 'Automatic reply sync',     desc: 'Inbound replies show up in the matching lead’s Emails tab automatically.' },
        { title: 'Send tracking',             desc: 'See open and click events on submissions and follow-ups.' },
        { title: 'Templated submissions',    desc: 'Build reusable email templates for new business and renewals.' },
      ]} />
    </div>
  );
}

// ─── Calendar Tab ────────────────────────────────────────────────────────────
function CalendarTab({ user, onConnect, onDisconnect }: {
  user: NonNullable<ReturnType<typeof useAuthStore.getState>['currentUser']>;
  onConnect: (p: CalendarProvider) => void;
  onDisconnect: () => void;
}) {
  const ci = user.calendarIntegration;

  return (
    <div>
      {ci && ci.status === 'connected' ? (
        <ConnectedBanner
          label="Calendar Connected" address={ci.accountEmail}
          providerLabel={ci.provider === 'google' ? 'Google Calendar' : ci.provider === 'outlook' ? 'Outlook Calendar' : 'Apple iCal'}
          connectedAt={ci.connectedAt}
          onReconfigure={() => onConnect(ci.provider)} onDisconnect={onDisconnect} />
      ) : (
        <UnconnectedBanner
          title="No calendar connected"
          description="Connect your calendar so renewal dates, follow-ups, and quote deadlines are automatically created as events. Stay on top of every renewal cycle." />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 22 }}>
        {CALENDAR_PROVIDERS.map(p => {
          const isConnected = ci?.provider === p.id && ci.status === 'connected';
          return (
            <ProviderCard key={p.id} title={p.name} description={p.description} badge={p.badge} badgeColor={p.color}
              isConnected={isConnected} connectedAddress={isConnected ? ci.accountEmail : undefined}
              connectLabel={`Connect ${p.id === 'google' ? 'Google Cal' : p.id === 'outlook' ? 'Outlook Cal' : 'iCal'}`}
              onConnect={() => onConnect(p.id)} />
          );
        })}
      </div>

      <FeatureList title="What calendar integration unlocks" items={[
        { title: 'Auto-renewal events',     desc: 'Every bound policy creates a renewal-due event 60 and 30 days before expiration.' },
        { title: 'Follow-up reminders',     desc: 'Quote deadlines and follow-up tasks appear on your calendar.' },
        { title: 'Two-way sync',             desc: 'Mark events done in your calendar — they update in CRM. (Google + Outlook).' },
        { title: 'Meeting scheduling',       desc: 'Send meeting invites for client renewals directly from a lead.' },
      ]} />
    </div>
  );
}

// ─── E-Sign Tab ──────────────────────────────────────────────────────────────
function ESignTab({ user, onConnect, onDisconnect }: {
  user: NonNullable<ReturnType<typeof useAuthStore.getState>['currentUser']>;
  onConnect: (p: ESignProvider) => void;
  onDisconnect: () => void;
}) {
  const ei = user.eSignIntegration;

  return (
    <div>
      {ei && ei.status === 'connected' ? (
        <ConnectedBanner
          label="E-Signature Connected" address={ei.accountEmail}
          providerLabel={ei.provider === 'docusign' ? 'DocuSign' : ei.provider === 'hellosign' ? 'Dropbox Sign' : 'Adobe Acrobat Sign'}
          connectedAt={ei.connectedAt}
          onReconfigure={() => onConnect(ei.provider)} onDisconnect={onDisconnect} />
      ) : (
        <UnconnectedBanner
          title="No e-signature provider connected"
          description="Send applications, finance agreements, and other documents for electronic signature directly from a lead. Signed copies are filed back into the account's Documents." />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 22 }}>
        {ESIGN_PROVIDERS.map(p => {
          const isConnected = ei?.provider === p.id && ei.status === 'connected';
          return (
            <ProviderCard key={p.id} title={p.name} description={p.description} badge={p.badge} badgeColor={p.color}
              isConnected={isConnected} connectedAddress={isConnected ? ei.accountEmail : undefined}
              connectLabel={`Connect ${p.name}`}
              onConnect={() => onConnect(p.id)} />
          );
        })}
      </div>

      <FeatureList title="What e-signature unlocks" items={[
        { title: 'Send for signature',     desc: 'Right-click any document on a lead to send via your provider.' },
        { title: 'Auto-status tracking',   desc: 'See which signers have completed and which are pending in the lead’s Documents tab.' },
        { title: 'Auto-file signed copies', desc: 'When all signers complete, the signed PDF is filed back into Documents.' },
        { title: 'Audit trail',             desc: 'Full audit history attached to every signed document for compliance.' },
      ]} />
    </div>
  );
}

// ─── Wallet Tab ──────────────────────────────────────────────────────────────
function WalletTab({ userId }: { userId: string }) {
  const ensureWallet = usePlatformStore(s => s.ensureWallet);
  const topUp = usePlatformStore(s => s.topUp);
  const setAutoRecharge = usePlatformStore(s => s.setAutoRecharge);
  const wallet = usePlatformStore(s => s.wallets[userId]) || ensureWallet(userId);
  const [topupAmount, setTopupAmount] = useState(100);
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupSuccess, setTopupSuccess] = useState<number | null>(null);
  const [autoSettings, setAutoSettings] = useState({
    enabled: wallet.autoRecharge,
    threshold: wallet.autoRechargeThreshold,
    amount: wallet.autoRechargeAmount,
  });

  const balanceColor = wallet.balance < 50 ? '#9f1239' : wallet.balance < 100 ? '#b45309' : '#0f766e';
  const balanceBg = wallet.balance < 50 ? '#fff1f2' : wallet.balance < 100 ? '#fef3c7' : '#f0fdfa';

  const submitTopup = async () => {
    setTopupLoading(true);
    // Real impl: call /api/stripe/checkout for one-time charge
    setTimeout(() => {
      topUp(userId, topupAmount, 'manual');
      setTopupSuccess(topupAmount);
      setTopupLoading(false);
      setTimeout(() => { setTopupOpen(false); setTopupSuccess(null); }, 1500);
    }, 800);
  };

  const saveAutoRecharge = () => {
    setAutoRecharge(userId, autoSettings.enabled, autoSettings.threshold, autoSettings.amount);
  };

  return (
    <div>
      {/* Balance card */}
      <div style={{ background: balanceBg, border: `2px solid ${balanceColor}30`, borderRadius: 14, padding: 24, marginBottom: 18 }}>
        <div className="flex flex-between" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current Balance</div>
            <div style={{ fontSize: 40, fontWeight: 800, color: balanceColor, lineHeight: 1.1, marginTop: 4 }}>
              {fmt$(wallet.balance)}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              MVR cost: {fmt$(19.50)} per driver · approx <b>{Math.floor(wallet.balance / 19.50)} MVRs</b> remaining
            </div>
          </div>
          <button className="btn-p" onClick={() => setTopupOpen(true)} style={{ minWidth: 140 }}>+ Top Up</button>
        </div>
      </div>

      {/* Auto-recharge */}
      <div className="panel" style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#1b2a4a', marginBottom: 10 }}>Auto-Recharge</div>
        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
          Automatically refill your wallet when balance drops below a threshold. Avoids interrupted MVR runs and consultation charges.
        </p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, cursor: 'pointer' }}>
          <input type="checkbox" checked={autoSettings.enabled} onChange={e => setAutoSettings({ ...autoSettings, enabled: e.target.checked })} style={{ accentColor: '#2563eb', width: 16, height: 16 }} />
          <span style={{ fontWeight: 600, color: '#1b2a4a', fontSize: 13 }}>Enable auto-recharge</span>
        </label>
        <div className="grid grid-2" style={{ gap: 12, opacity: autoSettings.enabled ? 1 : 0.5 }}>
          <div>
            <label className="lbl">When balance drops below</label>
            <input className="inp" type="number" min="10" value={autoSettings.threshold} onChange={e => setAutoSettings({ ...autoSettings, threshold: Number(e.target.value) })} disabled={!autoSettings.enabled} />
          </div>
          <div>
            <label className="lbl">Recharge amount</label>
            <input className="inp" type="number" min="50" value={autoSettings.amount} onChange={e => setAutoSettings({ ...autoSettings, amount: Number(e.target.value) })} disabled={!autoSettings.enabled} />
          </div>
        </div>
        <div className="flex" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
          <button className="btn-p" onClick={saveAutoRecharge}>Save</button>
        </div>
      </div>

      {/* Transaction history */}
      <div className="panel">
        <div className="flex flex-between" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1b2a4a' }}>Transaction History</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>{wallet.transactions.length} transactions</div>
        </div>
        {wallet.transactions.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No transactions yet — top up to get started.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: 10, textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: 10, textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Description</th>
                <th style={{ padding: 10, textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Amount</th>
                <th style={{ padding: 10, textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {wallet.transactions.slice(0, 50).map(tx => (
                <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 10, color: '#64748b', fontSize: 12 }}>{new Date(tx.date).toLocaleDateString()}</td>
                  <td style={{ padding: 10 }}>
                    <div style={{ fontWeight: 600, color: '#1b2a4a' }}>{tx.description}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'capitalize' }}>{tx.type}{tx.reference ? ` · ${tx.reference}` : ''}</div>
                  </td>
                  <td style={{ padding: 10, textAlign: 'right', fontWeight: 700, color: tx.amount >= 0 ? '#0f766e' : '#1b2a4a' }}>
                    {tx.amount >= 0 ? '+' : ''}{fmt$(tx.amount)}
                  </td>
                  <td style={{ padding: 10, textAlign: 'right', color: '#64748b' }}>{fmt$(tx.balanceAfter)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Top-up modal */}
      {topupOpen && (
        <Modal title="Top Up MVR Wallet" onClose={() => { if (!topupLoading) setTopupOpen(false); }} width={460}>
          {topupSuccess != null ? (
            <div style={{ textAlign: 'center', padding: '20px 12px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 14, background: '#f0fdfa', color: '#0f766e', marginBottom: 12 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div style={{ fontWeight: 700, fontSize: 17, color: '#1b2a4a', marginBottom: 4 }}>{fmt$(topupSuccess)} added</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>New balance: {fmt$(wallet.balance)}</div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
                Add funds to your wallet for MVR runs and other à la carte services. Charged to your card on file via Stripe.
              </p>
              <div style={{ marginBottom: 14 }}>
                <label className="lbl">Amount</label>
                <div className="flex" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {[50, 100, 250, 500, 1000].map(v => (
                    <button key={v} onClick={() => setTopupAmount(v)}
                      style={{ padding: '6px 14px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: `1.5px solid ${topupAmount === v ? '#2563eb' : '#cbd5e1'}`, background: topupAmount === v ? '#2563eb' : '#fff', color: topupAmount === v ? '#fff' : '#475569', cursor: 'pointer' }}>
                      {fmt$(v)}
                    </button>
                  ))}
                </div>
                <input className="inp" type="number" min="20" value={topupAmount} onChange={e => setTopupAmount(Number(e.target.value))} />
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, fontSize: 11, color: '#475569', marginBottom: 14 }}>
                <div className="flex flex-between"><span>Top-up amount</span><span>{fmt$(topupAmount)}</span></div>
                <div className="flex flex-between"><span>Card on file</span><span style={{ color: '#0f766e', fontWeight: 600 }}>•••• 4242</span></div>
                <div className="flex flex-between" style={{ borderTop: '1px solid #e2e8f0', paddingTop: 6, marginTop: 6, fontWeight: 700, color: '#1b2a4a' }}>
                  <span>Total charge</span><span>{fmt$(topupAmount)}</span>
                </div>
              </div>
              <div className="flex" style={{ gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn-s" onClick={() => setTopupOpen(false)} disabled={topupLoading}>Cancel</button>
                <button className="btn-p" onClick={submitTopup} disabled={topupLoading || topupAmount < 20}>
                  {topupLoading ? 'Processing…' : `Charge ${fmt$(topupAmount)}`}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ─── Reusable building blocks ────────────────────────────────────────────────
function ConnectedBanner({ label, address, providerLabel, connectedAt, onReconfigure, onDisconnect }: {
  label: string; address: string; providerLabel: string; connectedAt: string;
  onReconfigure: () => void; onDisconnect: () => void;
}) {
  return (
    <div className="panel" style={{ marginBottom: 18, background: '#f0fdfa', border: '2px solid #5eead4' }}>
      <div className="flex flex-between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="flex" style={{ gap: 14, alignItems: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fff', color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #5eead4' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1b2a4a' }}>{address}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>via {providerLabel} · since {new Date(connectedAt).toLocaleDateString()}</div>
          </div>
        </div>
        <div className="flex" style={{ gap: 8 }}>
          <button className="btn-s" onClick={onReconfigure}>Reconfigure</button>
          <button className="btn-s btn-danger" onClick={() => { if (confirm('Disconnect this account?')) onDisconnect(); }}>Disconnect</button>
        </div>
      </div>
    </div>
  );
}

function UnconnectedBanner({ title, description }: { title: string; description: string }) {
  return (
    <div className="panel" style={{ marginBottom: 18, background: '#eff6ff', border: '1px solid #93c5fd' }}>
      <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>{description}</div>
    </div>
  );
}

function ProviderCard({ title, description, badge, badgeColor, isConnected, connectedAddress, connectLabel, onConnect }: {
  title: string; description: string; badge: string;
  badgeColor: { bg: string; color: string; border: string };
  isConnected: boolean; connectedAddress?: string;
  connectLabel: string; onConnect: () => void;
}) {
  return (
    <div style={{
      background: '#fff', border: `2px solid ${isConnected ? '#5eead4' : '#e2e8f0'}`,
      borderRadius: 14, padding: 18, position: 'relative',
    }}>
      <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 100, background: badgeColor.bg, color: badgeColor.color, border: `1px solid ${badgeColor.border}`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {badge}
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#1b2a4a', marginBottom: 4, paddingRight: 100 }}>{title}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14, lineHeight: 1.5 }}>{description}</div>
      {isConnected ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#0f766e', fontWeight: 700 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Connected{connectedAddress ? ` as ${connectedAddress}` : ''}
        </div>
      ) : (
        <button className="btn-p btn-sm" onClick={onConnect}>{connectLabel}</button>
      )}
    </div>
  );
}

function FeatureList({ title, items }: { title: string; items: { title: string; desc: string }[] }) {
  return (
    <div className="panel">
      <div style={{ fontSize: 12, fontWeight: 700, color: '#1b2a4a', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {items.map(item => (
          <div key={item.title} style={{ padding: 14, background: '#f8fafc', borderRadius: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1b2a4a', marginBottom: 4 }}>{item.title}</div>
            <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Connect Modals (Email / Calendar / E-Sign) ──────────────────────────────
function ConnectEmailModal({ provider, userName, onClose, onConnect }: {
  provider: EmailProvider; userName: string;
  onClose: () => void; onConnect: (i: EmailIntegration) => void;
}) {
  const [step, setStep] = useState<'authorize' | 'manual'>(provider === 'smtp' || provider === 'yahoo' ? 'manual' : 'authorize');
  const [authorizing, setAuthorizing] = useState(false);
  const yahooDefault = provider === 'yahoo';
  const [smtp, setSmtp] = useState({
    fromAddress: '',
    smtpHost: yahooDefault ? 'smtp.mail.yahoo.com' : '',
    smtpPort: yahooDefault ? 465 : 587,
    smtpUsername: '', smtpUseTLS: true,
  });
  const [signature, setSignature] = useState('');

  const providerName = provider === 'gmail' ? 'Google' : provider === 'outlook' ? 'Microsoft' : provider === 'yahoo' ? 'Yahoo' : provider === 'smtp' ? 'SMTP server' : 'Transactional API';

  const handleAuthorize = () => {
    setAuthorizing(true);
    setTimeout(() => {
      const mockEmail = `${userName.toLowerCase().replace(/\s+/g, '.')}@${provider === 'gmail' ? 'gmail.com' : 'outlook.com'}`;
      onConnect({
        provider, fromAddress: mockEmail, fromName: userName,
        connectedAt: new Date().toISOString(), status: 'connected', signature,
      });
    }, 1200);
  };

  const handleSmtpConnect = () => {
    if (!smtp.fromAddress || !smtp.smtpHost) { alert('From address and SMTP host required.'); return; }
    onConnect({
      provider: provider === 'yahoo' ? 'yahoo' : 'smtp',
      fromAddress: smtp.fromAddress, fromName: userName,
      smtpHost: smtp.smtpHost, smtpPort: smtp.smtpPort, smtpUsername: smtp.smtpUsername || smtp.fromAddress,
      smtpUseTLS: smtp.smtpUseTLS, connectedAt: new Date().toISOString(), status: 'connected', signature,
    });
  };

  if (step === 'authorize') {
    return (
      <Modal title={`Connect ${providerName}`} onClose={onClose} width={520}>
        <OAuthMockScreen providerName={providerName} userName={userName}
          permissions={[
            'Send emails on your behalf',
            'Read replies to emails sent through Carrier Base',
            'See your name and email address',
          ]}
          signature={signature} setSignature={setSignature}
          authorizing={authorizing} onCancel={onClose} onAuthorize={handleAuthorize} />
      </Modal>
    );
  }

  return (
    <Modal title={`Connect ${providerName}`} onClose={onClose} width={580}>
      <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 8, padding: '10px 12px', fontSize: 11, color: '#1e40af', marginBottom: 14, lineHeight: 1.5 }}>
        {provider === 'yahoo' ? <>For Yahoo, generate an <b>App Password</b> from your account security settings, then enter it below. SMTP host pre-filled.</> : <>Find these settings in your email provider&apos;s SMTP/IMAP section. For Gmail, use an app password.</>}
      </div>
      <div className="grid grid-2" style={{ gap: 12 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="lbl">Email Address (From)</label>
          <input className="inp" type="email" value={smtp.fromAddress} onChange={e => setSmtp({ ...smtp, fromAddress: e.target.value })} placeholder={provider === 'yahoo' ? 'you@yahoo.com' : 'you@yourdomain.com'} />
        </div>
        <div>
          <label className="lbl">SMTP Host</label>
          <input className="inp" value={smtp.smtpHost} onChange={e => setSmtp({ ...smtp, smtpHost: e.target.value })} />
        </div>
        <div>
          <label className="lbl">Port</label>
          <input className="inp" type="number" value={smtp.smtpPort} onChange={e => setSmtp({ ...smtp, smtpPort: Number(e.target.value) })} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="lbl">Username</label>
          <input className="inp" value={smtp.smtpUsername} onChange={e => setSmtp({ ...smtp, smtpUsername: e.target.value })} placeholder="(defaults to From address)" />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="lbl">Password / App Password</label>
          <input className="inp" type="password" placeholder="••••••••" />
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

function ConnectCalendarModal({ provider, userName, onClose, onConnect }: {
  provider: CalendarProvider; userName: string;
  onClose: () => void; onConnect: (i: CalendarIntegration) => void;
}) {
  const [authorizing, setAuthorizing] = useState(false);
  const providerName = provider === 'google' ? 'Google Calendar' : provider === 'outlook' ? 'Outlook Calendar' : 'Apple iCal';

  const handleAuthorize = () => {
    setAuthorizing(true);
    setTimeout(() => {
      const mockEmail = `${userName.toLowerCase().replace(/\s+/g, '.')}@${provider === 'google' ? 'gmail.com' : provider === 'outlook' ? 'outlook.com' : 'icloud.com'}`;
      onConnect({
        provider, accountEmail: mockEmail,
        connectedAt: new Date().toISOString(), status: 'connected',
        syncRenewals: true, syncFollowUps: true,
      });
    }, 1000);
  };

  return (
    <Modal title={`Connect ${providerName}`} onClose={onClose} width={520}>
      <OAuthMockScreen providerName={providerName} userName={userName}
        permissions={[
          'Read your calendar events',
          'Create renewal and follow-up events',
          'Update events you create through Carrier Base',
        ]}
        authorizing={authorizing} onCancel={onClose} onAuthorize={handleAuthorize} />
    </Modal>
  );
}

function ConnectESignModal({ provider, userName, onClose, onConnect }: {
  provider: ESignProvider; userName: string;
  onClose: () => void; onConnect: (i: ESignIntegration) => void;
}) {
  const [authorizing, setAuthorizing] = useState(false);
  const providerName = provider === 'docusign' ? 'DocuSign' : provider === 'hellosign' ? 'Dropbox Sign' : 'Adobe Acrobat Sign';

  const handleAuthorize = () => {
    setAuthorizing(true);
    setTimeout(() => {
      const mockEmail = `${userName.toLowerCase().replace(/\s+/g, '.')}@${provider}.com`;
      onConnect({ provider, accountEmail: mockEmail, connectedAt: new Date().toISOString(), status: 'connected' });
    }, 1000);
  };

  return (
    <Modal title={`Connect ${providerName}`} onClose={onClose} width={520}>
      <OAuthMockScreen providerName={providerName} userName={userName}
        permissions={[
          'Send envelopes for signature on your behalf',
          'Receive signed document webhooks',
          'See envelope and signer status',
        ]}
        authorizing={authorizing} onCancel={onClose} onAuthorize={handleAuthorize} />
    </Modal>
  );
}

function OAuthMockScreen({ providerName, userName, permissions, signature, setSignature, authorizing, onCancel, onAuthorize }: {
  providerName: string; userName: string; permissions: string[];
  signature?: string; setSignature?: (v: string) => void;
  authorizing: boolean; onCancel: () => void; onAuthorize: () => void;
}) {
  return (
    <div style={{ padding: '6px 0' }}>
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
          {permissions.map(item => (
            <li key={item} style={{ display: 'flex', gap: 10, padding: '6px 0', color: '#475569' }}>
              <span style={{ color: '#0f766e', fontWeight: 700, marginTop: 2 }}>·</span>{item}
            </li>
          ))}
        </ul>
      </div>

      {setSignature && (
        <div style={{ marginBottom: 12 }}>
          <label className="lbl">Email signature (optional)</label>
          <textarea className="inp" rows={3} value={signature || ''} onChange={e => setSignature(e.target.value)}
            placeholder={`${userName}\nProducer · Carrier Base\nyour-phone · your-email`} />
        </div>
      )}

      <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 12px', fontSize: 11, color: '#92400e', marginBottom: 14, lineHeight: 1.5 }}>
        <b>Demo note:</b> In production, this redirects to {providerName}&apos;s real OAuth consent screen. Add the provider&apos;s client ID and secret to env vars to go live.
      </div>

      <div className="flex" style={{ gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn-s" onClick={onCancel} disabled={authorizing}>Cancel</button>
        <button className="btn-p" onClick={onAuthorize} disabled={authorizing} style={{ minWidth: 160 }}>
          {authorizing ? 'Connecting…' : 'Allow & Connect'}
        </button>
      </div>
    </div>
  );
}

// ─── Profile / Notifications / Security tabs ─────────────────────────────────
function ProfileTab({ user, updateProfile }: { user: NonNullable<ReturnType<typeof useAuthStore.getState>['currentUser']>; updateProfile: (id: string, u: Record<string, unknown>) => void }) {
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '', emailSignature: user.emailSignature || '' });
  const [saved, setSaved] = useState(false);
  const save = () => { updateProfile(user.id, form); setSaved(true); setTimeout(() => setSaved(false), 2000); };
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
          <textarea className="inp" rows={4} value={form.emailSignature} onChange={e => setForm({ ...form, emailSignature: e.target.value })} placeholder={`${user.name}\nProducer · Carrier Base\n555-555-5555`} />
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
    walletLowBalance: prefs.walletLowBalance ?? true,
    mvrCompletions: prefs.mvrCompletions ?? true,
  });
  const save = () => updateProfile(user.id, { notificationPrefs: form });
  return (
    <div className="panel">
      <div style={{ fontWeight: 700, fontSize: 15, color: '#1b2a4a', marginBottom: 14 }}>Notifications</div>
      {[
        { key: 'emailAlerts',      title: 'Inbound email alerts',     desc: 'When a broker, underwriter, or insured replies to one of your accounts.' },
        { key: 'renewalReminders', title: 'Renewal reminders',         desc: 'Daily digest of policies renewing in the next 30/60/90 days.' },
        { key: 'mvrCompletions',   title: 'MVR completions',           desc: 'When a Samba Safety MVR order finishes and the report is filed.' },
        { key: 'walletLowBalance', title: 'Low wallet balance',        desc: 'When your MVR wallet drops below your auto-recharge threshold.' },
        { key: 'weeklyDigest',     title: 'Weekly performance digest', desc: 'Summary of pipeline movement, bound premium, and top opportunities each Monday.' },
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
        {msg && (<div style={{ background: msg.ok ? '#f0fdfa' : '#fff1f2', border: `1px solid ${msg.ok ? '#5eead4' : '#fda4af'}`, color: msg.ok ? '#0f766e' : '#9f1239', padding: '10px 12px', borderRadius: 8, fontSize: 12, marginBottom: 12 }}>{msg.text}</div>)}
        <button className="btn-p" onClick={submit}>Update Password</button>
      </div>
    </div>
  );
}
