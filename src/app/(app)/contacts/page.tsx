'use client';
import { useState, useMemo } from 'react';
import { useCRMStore } from '@/lib/store';
import type { Contact, ContactType } from '@/lib/types';
import Modal from '@/components/ui/Modal';
import { todayISO } from '@/lib/utils';

const CONTACT_TYPES: ContactType[] = ['Underwriter', 'Market', 'Broker', 'Producer', 'Insured', 'Carrier', 'Vendor', 'Other'];

const TYPE_COLORS: Record<ContactType, { bg: string; color: string; border: string }> = {
  Underwriter: { bg: '#eff6ff', color: '#1e40af', border: '#93c5fd' },
  Market:      { bg: '#f0fdfa', color: '#0f766e', border: '#5eead4' },
  Broker:      { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
  Producer:    { bg: '#faf5ff', color: '#6b21a8', border: '#d8b4fe' },
  Insured:     { bg: '#fff1f2', color: '#9f1239', border: '#fda4af' },
  Carrier:     { bg: '#ecfdf5', color: '#065f46', border: '#6ee7b7' },
  Vendor:      { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
  Other:       { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
};

function ContactForm({ contact, onClose }: { contact?: Contact; onClose: () => void }) {
  const addContact = useCRMStore(s => s.addContact);
  const updateContact = useCRMStore(s => s.updateContact);
  const [form, setForm] = useState({
    name: contact?.name || '', company: contact?.company || '', role: contact?.role || '',
    email: contact?.email || '', phone: contact?.phone || '',
    type: (contact?.type || 'Underwriter') as ContactType,
    notes: contact?.notes || '',
  });
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const save = () => {
    if (!form.name) return alert('Name required');
    if (contact) updateContact(contact.id, form);
    else addContact({ id: 'c' + Date.now(), created: todayISO(), ...form });
    onClose();
  };
  return (
    <Modal title={contact ? 'Edit Contact' : 'New Contact'} onClose={onClose} width={700}>
      <div style={{ maxWidth: 540, margin: '0 auto' }}>
        <div className="grid grid-2" style={{ gap: 12, marginBottom: 12 }}>
          <div>
            <label className="lbl">Contact Type *</label>
            <select className="sel" style={{ width: '100%' }} value={form.type} onChange={e => f('type', e.target.value)}>
              {CONTACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div><label className="lbl">Name *</label><input className="inp" value={form.name} onChange={e => f('name', e.target.value)} /></div>
          <div><label className="lbl">Company</label><input className="inp" value={form.company} onChange={e => f('company', e.target.value)} /></div>
          <div><label className="lbl">Role / Title</label><input className="inp" value={form.role} onChange={e => f('role', e.target.value)} /></div>
          <div><label className="lbl">Email</label><input className="inp" type="email" value={form.email} onChange={e => f('email', e.target.value)} /></div>
          <div><label className="lbl">Phone</label><input className="inp" value={form.phone} onChange={e => f('phone', e.target.value)} /></div>
        </div>
        <div><label className="lbl">Notes</label><textarea className="inp" rows={3} value={form.notes} onChange={e => f('notes', e.target.value)} /></div>
        <div className="flex" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <button className="btn-s" onClick={onClose}>Cancel</button>
          <button className="btn-p" onClick={save}>{contact ? 'Save' : 'Add Contact'}</button>
        </div>
      </div>
    </Modal>
  );
}

export default function ContactsPage() {
  const contacts = useCRMStore(s => s.contacts);
  const deleteContact = useCRMStore(s => s.deleteContact);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ContactType | 'All'>('All');
  const [showForm, setShowForm] = useState(false);
  const [editContact, setEditContact] = useState<Contact | undefined>(undefined);

  const filtered = useMemo(() => contacts.filter(c => {
    if (typeFilter !== 'All' && (c.type || 'Other') !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
    }
    return true;
  }), [contacts, typeFilter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: contacts.length };
    CONTACT_TYPES.forEach(t => { c[t] = contacts.filter(ct => (ct.type || 'Other') === t).length; });
    return c;
  }, [contacts]);

  return (
    <>
      <div className="app-header">
        <h1>Contacts</h1>
        <div className="header-actions">
          <input className="inp" style={{ width: 220 }} placeholder="Search contacts…" value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn-p" onClick={() => { setEditContact(undefined); setShowForm(true); }}>+ New Contact</button>
        </div>
      </div>
      <div className="content">
        {/* Type filter chips */}
        <div className="panel" style={{ marginBottom: 14, padding: 14 }}>
          <div className="flex" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => setTypeFilter('All')}
              style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, borderRadius: 100, border: `1.5px solid ${typeFilter === 'All' ? '#1b2a4a' : '#cbd5e1'}`, background: typeFilter === 'All' ? '#1b2a4a' : '#fff', color: typeFilter === 'All' ? '#fff' : '#475569', cursor: 'pointer' }}>
              All · {counts.All}
            </button>
            {CONTACT_TYPES.map(t => {
              const tc = TYPE_COLORS[t];
              const active = typeFilter === t;
              return (
                <button key={t} onClick={() => setTypeFilter(t)}
                  style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, borderRadius: 100,
                    border: `1.5px solid ${active ? tc.color : tc.border}`,
                    background: active ? tc.color : tc.bg,
                    color: active ? '#fff' : tc.color, cursor: 'pointer' }}>
                  {t} · {counts[t] || 0}
                </button>
              );
            })}
          </div>
        </div>

        {contacts.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 14, background: '#f1f5f9', color: '#94a3b8', marginBottom: 14 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div style={{ fontSize: 14 }}>No contacts yet. Add your first contact.</div>
          </div>
        )}

        {filtered.length === 0 && contacts.length > 0 && (
          <div className="panel" style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: 13 }}>No contacts match your filters.</div>
        )}

        <div className="grid grid-3" style={{ gap: 14 }}>
          {filtered.map(c => {
            const type = c.type || 'Other';
            const tc = TYPE_COLORS[type];
            return (
              <div key={c.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div className="flex flex-between" style={{ marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: tc.color, border: `1.5px solid ${tc.border}` }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex" style={{ gap: 6 }}>
                    <button className="btn-s btn-sm" onClick={() => { setEditContact(c); setShowForm(true); }}>Edit</button>
                    <button className="btn-s btn-sm btn-danger" onClick={() => { if (confirm(`Delete ${c.name}?`)) deleteContact(c.id); }}>Delete</button>
                  </div>
                </div>
                <div style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{type}</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1b2a4a' }}>{c.name}</div>
                {c.company && <div style={{ fontSize: 12, color: '#64748b' }}>{c.company}</div>}
                {c.role && <div style={{ fontSize: 11, color: '#94a3b8' }}>{c.role}</div>}
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {c.email && <a href={`mailto:${c.email}`} style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none' }}>{c.email}</a>}
                  {c.phone && <div style={{ fontSize: 12, color: '#64748b' }}>{c.phone}</div>}
                </div>
                {c.notes && <div style={{ marginTop: 8, fontSize: 11, color: '#475569', padding: 6, background: '#f8fafc', borderRadius: 6 }}>{c.notes}</div>}
              </div>
            );
          })}
        </div>
      </div>
      {showForm && <ContactForm contact={editContact} onClose={() => { setShowForm(false); setEditContact(undefined); }} />}
    </>
  );
}
