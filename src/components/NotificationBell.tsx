'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import { usePlatformStore, notificationColor } from '@/lib/platform';
import { Bell } from 'lucide-react';

export default function NotificationBell() {
  const currentUser = useAuthStore(s => s.currentUser);
  const notifications = usePlatformStore(s => s.notifications);
  const markRead = usePlatformStore(s => s.markRead);
  const markAllRead = usePlatformStore(s => s.markAllRead);
  const deleteNotification = usePlatformStore(s => s.deleteNotification);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (open && wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!currentUser) return null;

  const myNotifs = notifications.filter(n => n.userId === currentUser.id || n.userId === '');
  const unread = myNotifs.filter(n => !n.read).length;

  const handleClick = (id: string, href?: string) => {
    markRead(id);
    setOpen(false);
    if (href) router.push(href);
  };

  const timeAgo = (iso: string): string => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diffMs / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString();
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        title="Notifications"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36, borderRadius: 8,
          background: 'rgba(255,255,255,0.1)', color: '#fff',
          border: 'none', cursor: 'pointer', position: 'relative',
        }}>
        <Bell size={16} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            minWidth: 16, height: 16, padding: '0 4px',
            borderRadius: 100, background: '#ef4444',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 800, color: '#fff',
            border: '2px solid #1b2a4a',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, marginBottom: 8,
          width: 380, maxHeight: 480, background: '#fff',
          borderRadius: 12, boxShadow: '0 16px 40px -8px rgba(15,23,42,0.3)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          zIndex: 1000,
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, color: '#1b2a4a', fontSize: 14 }}>
              Notifications {unread > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: '#ef4444', marginLeft: 6 }}>{unread} new</span>}
            </div>
            {unread > 0 && (
              <button onClick={() => markAllRead(currentUser.id)} style={{ fontSize: 11, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Mark all read
              </button>
            )}
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {myNotifs.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                No notifications yet.
                <div style={{ fontSize: 11, marginTop: 4 }}>Email replies, renewal alerts, and MVR completions will appear here.</div>
              </div>
            ) : myNotifs.slice(0, 50).map(n => {
              const c = notificationColor(n.type);
              return (
                <div key={n.id}
                  onClick={() => handleClick(n.id, n.href)}
                  style={{
                    display: 'flex', gap: 10, padding: '12px 14px',
                    borderBottom: '1px solid #f1f5f9',
                    background: !n.read ? '#fafeff' : '#fff',
                    cursor: n.href ? 'pointer' : 'default',
                  }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: c.bg, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800, fontSize: 11 }}>
                    {n.type.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                      <div style={{ fontWeight: 600, fontSize: 12, color: '#1b2a4a' }}>{n.title}</div>
                      {!n.read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2563eb', flexShrink: 0, marginTop: 5 }} />}
                    </div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 2, lineHeight: 1.5 }}>{n.message}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>{timeAgo(n.createdAt)}</span>
                      <button onClick={e => { e.stopPropagation(); deleteNotification(n.id); }}
                        style={{ fontSize: 10, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
