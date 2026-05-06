import Sidebar from '@/components/layout/Sidebar';
import AuthGuard from '@/components/AuthGuard';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar />
        <div className="main">
          {children}
        </div>
      </div>
    </AuthGuard>
  );
}
