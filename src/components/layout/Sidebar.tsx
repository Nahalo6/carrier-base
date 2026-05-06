'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Trophy, Users, Kanban, Building2, Search,
  FileText, Contact, CheckCircle, BarChart2,
} from 'lucide-react';
import { useCRMStore } from '@/lib/store';

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, Trophy, Users, Kanban, Building2, Search,
  FileText, Contact, CheckCircle, BarChart2,
};

const TABS = [
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
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const leads = useCRMStore(s => s.leads);
  const boundCount = leads.filter(l => l.status === 'Bound').length;

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
          const t = tab as { key: string; label: string; icon: string; href: string };
          const Icon = ICON_MAP[t.icon];
          const isActive = pathname === t.href || (pathname === '/' && t.href === '/dashboard');
          return (
            <Link
              key={t.key}
              href={t.href}
              className={`nav-btn ${isActive ? 'active' : ''}`}
            >
              {Icon && <Icon size={15} />}
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {leads.length} leads · {boundCount} bound
      </div>
    </div>
  );
}
