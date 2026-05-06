'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Trophy, Users, Kanban, Building2, Search,
  FileText, Contact, CheckCircle, BarChart2, Shield, LogOut,
} from 'lucide-react';
import { useCRMStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth';

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, Trophy, Users, Kanban, Building2, Search,
  FileText, Contact, CheckCircle, BarChart2, Shield,
};

interface NavTab {
  key: string;
  label: string;
  icon: string;
  href: string;
  adminOnly?: boolean;
}

const TABS: (NavTab | { sep: true })[] = [
  { key: 'dashboard',    label: 'Dashboard',           icon: 'LayoutDashboard', href: '/dashboard' },
  { key: 'leaderboard',  label: 'Leaderboard',          icon: 'Trophy',          href: '/leaderboard' },
  { key: 'leads',        label: 'Leads & Accounts',    icon: 'Users',           href: '/leads' },
  { key: 'pipeline',     label: 'Pipeline',             icon: 'Kanban',          href: '/pipeline' },
  { key: 'markets',      label: 'Markets',              icon: 'Building2',       href: '/markets' },
  { sep: true },
  { key: 'prospect',     label: 'DOT Leads',            icon: 'Search',          href: '/prospect' },
  { key: 'applications', label: 'Applications / Forms', icon: 'FileText',        href: '/applications' },
  { key: 'contacts',     label: 'Contacts',             icon: 'Contact',         href: '/contacts' },
  { key: 'policy',       label: 'Policies & Bound',     icon: 'CheckCircle',     href: '/policy' },
  { key: 'analytics',    label: 'Analytics',            icon: 'BarChart2',       href: '/analytics' },
  { sep: true },
  { key: 'admin',        label: 'Admin Panel',          icon: 'Shield',          href: '/admin', adminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const leads = useCRMStore(s => s.leads);
  const boundCount = leads.filter(l => l.status === 'Bound').length;
  const currentUser = useAuthStore(s => s.currentUser);
  const signOut = useAuthStore(s => s.signOut);

  const handleSignOut = () => {
    signOut();
    router.push('/login');
  };

  const roleColor = currentUser?.role === 'admin' ? '#9f1239'
    : currentUser?.role === 'manager' ? '#1e40af' : '#0f766e';

  return (
    <div className="sidebar">
      <div className="logo">
        <div className="logo-mark">
          <svg width="36" height="36" viewBox="0 0 48 48">
            <rect x="2" y="2" width="44" height="44" rx="11" fill="#0b1730"/>
            <path d="M12 14 L22 24 L12 34" stroke="#3b82f6" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 14 L32 24 L22 34" stroke="#3b82f6" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.75"/>
            <path d="M32 14 L42 24 L32 34" stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <div className="logo-name">Carrier Base</div>
          <div className="logo-sub">Insurance Platform</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {TABS.map((tab, i) => {
          if ('sep' in tab && tab.sep) {
            return <div key={`sep-${i}`} className="nav-sep" />;
          }
          const t = tab as NavTab;
          if (t.adminOnly && currentUser?.role !== 'admin') return null;
          const Icon = ICON_MAP[t.icon];
          const isActive = pathname === t.href || (pathname === '/' && t.href === '/dashboard');
          return (
            <Link key={t.key} href={t.href} className={`nav-btn ${isActive ? 'active' : ''}`}>
              {Icon && <Icon size={15} />}
              {t.label}
            </Link>
          );
        })}
      </nav>

      {currentUser ? (
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: roleColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
              {currentUser.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser.name}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>{currentUser.role}</div>
            </div>
          </div>
          <button onClick={handleSignOut}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
            <LogOut size={13} /> Sign out
          </button>
        </div>
      ) : (
        <div className="sidebar-footer">
          {leads.length} leads · {boundCount} bound
        </div>
      )}
    </div>
  );
}
