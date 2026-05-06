// Product catalog used by checkout cart + receipts.
// `stripePriceId` left blank — set these once you create Stripe products in dashboard.

export type BillingType = 'one_time' | 'monthly';

export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  price: number;            // in dollars
  billing: BillingType;
  category: 'plan' | 'addon';
  features: string[];
  badge?: string;
  stripePriceId?: string;   // populate when going live
  recommended?: boolean;
}

export const CATALOG: CatalogItem[] = [
  // Subscription plans
  {
    id: 'solo', name: 'Solo Plan', description: '1 user · Essentials for solo producers',
    price: 200, billing: 'monthly', category: 'plan',
    features: ['Up to 100 active accounts', 'Unlimited DOT/SAFER lookups', 'Trucking application + custom apps', 'Unlimited MVR reports', 'Pre-underwriting engine'],
  },
  {
    id: 'agency', name: 'Agency Plan', description: '2–5 users · For growing teams',
    price: 500, billing: 'monthly', category: 'plan', recommended: true, badge: 'Most Popular',
    features: ['Up to 5 producers', 'Unlimited accounts', 'Unlimited MVR reports', 'Leaderboard & goals', 'Manager dashboard', 'Outlook integration', 'Priority support'],
  },
  {
    id: 'enterprise', name: 'Enterprise Plan', description: 'For larger agencies — contact sales',
    price: 0, billing: 'monthly', category: 'plan',
    features: ['Unlimited producers', 'Unlimited MVRs', 'SSO', 'Custom integrations', 'Dedicated success mgr'],
  },
  // Add-ons
  {
    id: 'broker-directory', name: 'Broker Directory Access', description: 'One-time fee to connect with our broker network',
    price: 1000, billing: 'one_time', category: 'addon',
    features: ['Curated broker network access', 'Direct introductions', 'Specialty markets — Lloyd\'s, MGAs, surplus', 'Lifetime directory access'],
  },
  {
    id: 'uw-consultation', name: 'Continuous UW Consultation', description: 'Senior underwriter on call',
    price: 300, billing: 'monthly', category: 'addon',
    features: ['Senior underwriter on call', 'Account-level appetite reviews', 'Pre-quote opinions on tough risks', 'Cancel anytime'],
  },
];

export function getCatalogItem(id: string): CatalogItem | undefined {
  return CATALOG.find(c => c.id === id);
}

export function fmtPrice(item: CatalogItem): string {
  if (item.price === 0) return 'Custom';
  const base = `$${item.price.toLocaleString()}`;
  return item.billing === 'monthly' ? `${base}/mo` : `${base} once`;
}

export interface CartTotals {
  oneTimeTotal: number;
  monthlyTotal: number;
  totalDueToday: number;       // first month for monthly + all one-time
}

export function computeTotals(items: CatalogItem[]): CartTotals {
  const oneTimeTotal = items.filter(i => i.billing === 'one_time').reduce((s, i) => s + i.price, 0);
  const monthlyTotal = items.filter(i => i.billing === 'monthly').reduce((s, i) => s + i.price, 0);
  return {
    oneTimeTotal, monthlyTotal,
    totalDueToday: oneTimeTotal + monthlyTotal,
  };
}
