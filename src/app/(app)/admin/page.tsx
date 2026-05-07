'use client';
import { useState } from 'react';
import { useAuthStore, type AuthUser, type UserRole } from '@/lib/auth';
import AuthGuard from '@/components/AuthGuard';
import Modal from '@/components/ui/Modal';

const ROLE_COLORS: Record<UserRole, { bg: string; color: string; border: string }> = {
  admin:    { bg: '#fff1f2', color: '#9f1239', border: '#fda4af' },
  manager:  { bg: '#eff6ff', color: '#1e40af', border: '#93c5fd' },
  producer: { bg: '#f0fdfa', color: '#0f766e', border: '#5eead4' },
};

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: (email: string, tempPassword: string) => void }) {
  const createUser = useAuthStore(s => s.createUser);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('producer');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!name.trim() || !email.trim()) { setError('Name and email are required.'); return; }
    if (useAuthStore.getState().users.some(u => u.email === email.trim().toLowerCase())) { setError('A user with that email already exists.'); return; }
    const { tempPassword } = createUser({ name, email, role, phone });
    onCreated(email, tempPassword);
    onClose();
  };

  return (
    <Modal title="Create User" onClose={onClose} width={520}>
      <div className="grid grid-2" style={{ gap: 12 }}>
        <div>
          <label className="lbl">Full Name *</label>
          <input className="inp" value={name} onChange={e => setName(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="lbl">Email *</label>
          <input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="lbl">Phone</label>
          <input className="inp" value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="lbl">Role</label>
          <select className="sel" style={{ width: '100%' }} value={role} onChange={e => setRole(e.target.value as UserRole)}>
            <option value="producer">Producer (Agent)</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      <div style={{ marginTop: 12, padding: '10px 12px', background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 8, fontSize: 11, color: '#1e40af' }}>
        A temporary password will be generated and emailed to the user. They&rsquo;ll be prompted to reset it on first login.
      </div>
      {error && <div style={{ marginTop: 10, color: '#9f1239', fontSize: 12 }}>{error}</div>}
      <div className="flex" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button className="btn-s" onClick={onClose}>Cancel</button>
        <button className="btn-p" onClick={submit}>Create User</button>
      </div>
    </Modal>
  );
}

function EditUserModal({ user, onClose }: { user: AuthUser; onClose: () => void }) {
  const updateUser = useAuthStore(s => s.updateUser);
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [plan, setPlan] = useState(user.plan || '');

  const save = () => {
    updateUser(user.id, { name, phone, plan });
    onClose();
  };

  return (
    <Modal title={`Edit ${user.name}`} onClose={onClose} width={520}>
      <div className="grid grid-2" style={{ gap: 12 }}>
        <div>
          <label className="lbl">Name</label>
          <input className="inp" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className="lbl">Email</label>
          <input className="inp" value={user.email} disabled />
        </div>
        <div>
          <label className="lbl">Phone</label>
          <input className="inp" value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="lbl">Plan</label>
          <select className="sel" style={{ width: '100%' }} value={plan} onChange={e => setPlan(e.target.value)}>
            <option value="">— None —</option>
            <option value="solo">Solo</option>
            <option value="agency">Agency</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>
      <div className="flex" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button className="btn-s" onClick={onClose}>Cancel</button>
        <button className="btn-p" onClick={save}>Save</button>
      </div>
    </Modal>
  );
}

function AdminContent() {
  const users = useAuthStore(s => s.users);
  const currentUser = useAuthStore(s => s.currentUser);
  const setRole = useAuthStore(s => s.setRole);
  const setStatus = useAuthStore(s => s.setStatus);
  const resetPassword = useAuthStore(s => s.resetPassword);
  const deleteUser = useAuthStore(s => s.deleteUser);

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<AuthUser | null>(null);
  const [createdInfo, setCreatedInfo] = useState<{ email: string; tempPassword: string } | null>(null);
  const [resetInfo, setResetInfo] = useState<{ email: string; tempPassword: string } | null>(null);
  const [filter, setFilter] = useState<UserRole | 'all'>('all');
  const [search, setSearch] = useState('');

  const filteredUsers = users.filter(u => {
    if (filter !== 'all' && u.role !== filter) return false;
    if (search && !u.email.toLowerCase().includes(search.toLowerCase()) && !u.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    total: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    manager: users.filter(u => u.role === 'manager').length,
    producer: users.filter(u => u.role === 'producer').length,
    suspended: users.filter(u => u.status === 'suspended').length,
  };

  const handleResetPassword = (user: AuthUser) => {
    if (!confirm(`Reset password for ${user.email}? A new temporary password will be generated.`)) return;
    const tempPassword = resetPassword(user.id);
    setResetInfo({ email: user.email, tempPassword });
  };

  const handleDelete = (user: AuthUser) => {
    if (user.id === currentUser?.id) { alert('You cannot delete your own account.'); return; }
    if (!confirm(`Delete user ${user.email}? This cannot be undone.`)) return;
    deleteUser(user.id);
  };

  const toggleSuspend = (user: AuthUser) => {
    if (user.id === currentUser?.id) { alert('You cannot suspend your own account.'); return; }
    setStatus(user.id, user.status === 'active' ? 'suspended' : 'active');
  };

  return (
    <>
      <div className="app-header">
        <h1>Admin Panel</h1>
        <div style={{ fontSize: 13, color: '#64748b' }}>Manage users, roles, permissions, and access</div>
      </div>
      <div className="content">
        {/* Stats row */}
        <div className="grid grid-5" style={{ gap: 12, marginBottom: 18, gridTemplateColumns: 'repeat(5, 1fr)' }}>
          <div className="dash-card" style={{ cursor: 'pointer' }} onClick={() => setFilter('all')}>
            <div className="accent" style={{ background: '#1b2a4a' }} />
            <div className="label">Total Users</div>
            <div className="number" style={{ fontSize: 28 }}>{counts.total}</div>
          </div>
          <div className="dash-card" style={{ cursor: 'pointer' }} onClick={() => setFilter('admin')}>
            <div className="accent" style={{ background: '#9f1239' }} />
            <div className="label">Admins</div>
            <div className="number" style={{ fontSize: 28, color: '#9f1239' }}>{counts.admin}</div>
          </div>
          <div className="dash-card" style={{ cursor: 'pointer' }} onClick={() => setFilter('manager')}>
            <div className="accent" style={{ background: '#1e40af' }} />
            <div className="label">Managers</div>
            <div className="number" style={{ fontSize: 28, color: '#1e40af' }}>{counts.manager}</div>
          </div>
          <div className="dash-card" style={{ cursor: 'pointer' }} onClick={() => setFilter('producer')}>
            <div className="accent" style={{ background: '#0f766e' }} />
            <div className="label">Producers</div>
            <div className="number" style={{ fontSize: 28, color: '#0f766e' }}>{counts.producer}</div>
          </div>
          <div className="dash-card">
            <div className="accent" style={{ background: '#b45309' }} />
            <div className="label">Suspended</div>
            <div className="number" style={{ fontSize: 28, color: counts.suspended > 0 ? '#b45309' : '#1b2a4a' }}>{counts.suspended}</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="panel" style={{ marginBottom: 14 }}>
          <div className="flex flex-between" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div className="flex" style={{ gap: 8, flexWrap: 'wrap' }}>
              <input className="inp" style={{ width: 240 }} placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
              <select className="sel" style={{ width: 140 }} value={filter} onChange={e => setFilter(e.target.value as UserRole | 'all')}>
                <option value="all">All Roles</option>
                <option value="admin">Admins</option>
                <option value="manager">Managers</option>
                <option value="producer">Producers</option>
              </select>
            </div>
            <button className="btn-p" onClick={() => setShowCreate(true)}>+ Create User</button>
          </div>
        </div>

        {/* Users table */}
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase' }}>User</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase' }}>Role</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase' }}>Plan</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase' }}>Created</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase' }}>Last Login</th>
                <th style={{ padding: 12, textAlign: 'right', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => {
                const rc = ROLE_COLORS[u.role];
                const isMe = u.id === currentUser?.id;
                return (
                  <tr key={u.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: 12 }}>
                      <div style={{ fontWeight: 600, color: '#1b2a4a' }}>{u.name} {isMe && <span style={{ fontSize: 10, color: '#0f766e', fontWeight: 700 }}>(you)</span>}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{u.email}</div>
                      {u.tempPassword && <div style={{ fontSize: 10, color: '#b45309', fontStyle: 'italic' }}>Temp password — pending reset</div>}
                    </td>
                    <td style={{ padding: 12 }}>
                      <select value={u.role} disabled={isMe} onChange={e => setRole(u.id, e.target.value as UserRole)}
                        style={{ padding: '4px 8px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: `1px solid ${rc.border}`, background: rc.bg, color: rc.color, cursor: isMe ? 'not-allowed' : 'pointer', textTransform: 'capitalize' }}>
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="producer">Producer</option>
                      </select>
                    </td>
                    <td style={{ padding: 12 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                        background: u.status === 'active' ? '#f0fdfa' : '#fff1f2',
                        color: u.status === 'active' ? '#0f766e' : '#9f1239' }}>
                        {u.status === 'active' ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td style={{ padding: 12, textTransform: 'capitalize', color: '#475569' }}>{u.plan || '—'}</td>
                    <td style={{ padding: 12, color: '#64748b' }}>{u.createdDate}</td>
                    <td style={{ padding: 12, color: '#64748b', fontSize: 11 }}>{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}</td>
                    <td style={{ padding: 12, textAlign: 'right' }}>
                      <div className="flex" style={{ gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn-s btn-sm" onClick={() => setEditing(u)}>Edit</button>
                        <button className="btn-s btn-sm" onClick={() => handleResetPassword(u)}>Reset PW</button>
                        <button className="btn-s btn-sm" onClick={() => toggleSuspend(u)} disabled={isMe}>
                          {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                        </button>
                        <button className="btn-s btn-sm btn-danger" onClick={() => handleDelete(u)} disabled={isMe}>×</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>No users match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Roadmap download */}
        <div style={{ marginTop: 18, padding: 18, background: '#1b2a4a', borderRadius: 12, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Strategy</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>Product Roadmap & Gap Analysis</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              Branded PDF covering production readiness, must-haves, nice-to-haves, compliance, and 5-phase timeline.
            </div>
          </div>
          <a href="/carrier-base-roadmap.pdf" download
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: '#fff', color: '#1b2a4a', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 13 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download PDF
          </a>
        </div>

        {/* Audit reminder */}
        <div style={{ marginTop: 18, padding: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12, color: '#475569' }}>
          <div style={{ fontWeight: 700, color: '#1b2a4a', marginBottom: 4 }}>Role Permissions Reference</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 8 }}>
            <div style={{ padding: 10, background: '#fff', borderRadius: 8, border: '1px solid #fda4af' }}>
              <div style={{ fontWeight: 700, color: '#9f1239', marginBottom: 3 }}>Admin</div>
              <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>Full access · manage users · billing · all data · admin panel</div>
            </div>
            <div style={{ padding: 10, background: '#fff', borderRadius: 8, border: '1px solid #93c5fd' }}>
              <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: 3 }}>Manager</div>
              <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>All accounts · markets · analytics · team performance reports</div>
            </div>
            <div style={{ padding: 10, background: '#fff', borderRadius: 8, border: '1px solid #5eead4' }}>
              <div style={{ fontWeight: 700, color: '#0f766e', marginBottom: 3 }}>Producer</div>
              <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>Own leads &amp; policies · DOT search · MVR ordering · personal dashboard</div>
            </div>
          </div>
        </div>
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={(email, tempPassword) => setCreatedInfo({ email, tempPassword })} />}
      {editing && <EditUserModal user={editing} onClose={() => setEditing(null)} />}

      {createdInfo && (
        <Modal title="User Created" onClose={() => setCreatedInfo(null)} width={520}>
          <div style={{ padding: '10px 0' }}>
            <div style={{ marginBottom: 12, color: '#0f766e', fontWeight: 600 }}>Account created for {createdInfo.email}</div>
            <div style={{ background: '#1b2a4a', color: '#fff', padding: 16, borderRadius: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', marginBottom: 4 }}>Temporary Password</div>
              <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 700, letterSpacing: '0.05em' }}>{createdInfo.tempPassword}</div>
            </div>
            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
              Share this password with the user securely. Once email integration is enabled, this will be sent automatically with a password-reset link. The user will be prompted to set a new password on first login.
            </div>
          </div>
          <div className="flex" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
            <button className="btn-p" onClick={() => setCreatedInfo(null)}>Done</button>
          </div>
        </Modal>
      )}

      {resetInfo && (
        <Modal title="Password Reset" onClose={() => setResetInfo(null)} width={520}>
          <div style={{ padding: '10px 0' }}>
            <div style={{ marginBottom: 12, color: '#0f766e', fontWeight: 600 }}>Password reset for {resetInfo.email}</div>
            <div style={{ background: '#1b2a4a', color: '#fff', padding: 16, borderRadius: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', marginBottom: 4 }}>New Temporary Password</div>
              <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 700, letterSpacing: '0.05em' }}>{resetInfo.tempPassword}</div>
            </div>
          </div>
          <div className="flex" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
            <button className="btn-p" onClick={() => setResetInfo(null)}>Done</button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function AdminPage() {
  return <AuthGuard adminOnly><AdminContent /></AuthGuard>;
}
