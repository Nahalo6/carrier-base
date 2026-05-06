'use client';
import { useState } from 'react';
import { useCRMStore } from '@/lib/store';
import type { Contact } from '@/lib/types';
import Modal from '@/components/ui/Modal';
import { todayISO } from '@/lib/utils';

function ContactForm({ contact, onClose }: { contact?: Contact; onClose: () => void }) {
  const addContact = useCRMStore(s => s.addContact);
  const updateContact = useCRMStore(s => s.updateContact);
  const [form, setForm] = useState({
    name: contact?.name || '', company: contact?.company || '', role: contact?.role || '',
    email: contact?.email || '', phone: contact?.phone || '', notes: contact?.notes || '',
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
      <div style={{ maxWidth: 500, margin: '0 auto' }}>
        <div className="grid grid-2" style={{ gap: 12, marginBottom: 12 }}>
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
  const [showForm, setShowForm] = useState(false);
  const [editContact, setEditContact] = useState<Contact | undefined>(undefined);

  const filtered = contacts.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.company.toLowerCase().includes(search.toLowerCase()));

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
        {contacts.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
            <div style={{ fontSize: 14 }}>No contacts yet. Add your first contact.</div>
          </div>
        )}
        <div className="grid grid-3" style={{ gap: 14 }}>
          {filtered.map(c => (
            <div key={c.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div className="flex flex-between" style={{ marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, color: '#2563eb' }}>
                  {c.name.charAt(0)}
                </div>
                <div className="flex" style={{ gap: 6 }}>
                  <button className="btn-s btn-sm" onClick={() => { setEditContact(c); setShowForm(true); }}>Edit</button>
                  <button className="btn-s btn-sm btn-danger" onClick={() => { if (confirm(`Delete ${c.name}?`)) deleteContact(c.id); }}>Delete</button>
                </div>
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#1b2a4a' }}>{c.name}</div>
              {c.company && <div style={{ fontSize: 12, color: '#64748b' }}>{c.company}</div>}
              {c.role && <div style={{ fontSize: 11, color: '#94a3b8' }}>{c.role}</div>}
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {c.email && <a href={`mailto:${c.email}`} style={{ fontSize: 12, color: '#2563eb' }}>{c.email}</a>}
                {c.phone && <div style={{ fontSize: 12, color: '#64748b' }}>{c.phone}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
      {showForm && <ContactForm contact={editContact} onClose={() => { setShowForm(false); setEditContact(undefined); }} />}
    </>
  );
}
