import { STATUS_COLORS } from '@/lib/constants';
import type { LeadStatus } from '@/lib/types';

export default function StatusBadge({ status, small }: { status: LeadStatus; small?: boolean }) {
  const c = STATUS_COLORS[status] || { bg: '#f1f5f9', b: '#94a3b8', t: '#64748b' };
  return (
    <span
      className="badge"
      style={{
        padding: small ? '2px 8px' : '4px 12px',
        fontSize: small ? '10px' : '11px',
        background: c.bg,
        border: `1.5px solid ${c.b}`,
        color: c.t,
      }}
    >
      {status}
    </span>
  );
}
