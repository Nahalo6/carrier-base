'use client';
// Platform store: notifications + wallet, both per-user.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppNotification, NotificationType, Wallet, WalletTransaction } from './types';

interface PlatformState {
  notifications: AppNotification[];
  wallets: Record<string, Wallet>;          // keyed by userId

  // ── Notifications ──
  pushNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: (userId: string) => void;
  clearAll: (userId: string) => void;
  deleteNotification: (id: string) => void;

  // ── Wallet ──
  ensureWallet: (userId: string) => Wallet;
  topUp: (userId: string, amount: number, reference?: string) => Wallet;
  charge: (userId: string, amount: number, type: WalletTransaction['type'], description: string, reference?: string) => { ok: boolean; wallet: Wallet };
  setAutoRecharge: (userId: string, autoRecharge: boolean, threshold?: number, amount?: number) => void;
}

const newWallet = (userId: string): Wallet => ({
  userId, balance: 0, autoRecharge: false,
  autoRechargeThreshold: 50, autoRechargeAmount: 250,
  transactions: [],
});

export const usePlatformStore = create<PlatformState>()(
  persist(
    (set, get) => ({
      notifications: [],
      wallets: {},

      pushNotification: (n) => set(s => ({
        notifications: [
          { ...n, id: 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            createdAt: new Date().toISOString(), read: false },
          ...s.notifications,
        ].slice(0, 200),  // cap to 200 most recent
      })),
      markRead: (id) => set(s => ({ notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n) })),
      markAllRead: (userId) => set(s => ({
        notifications: s.notifications.map(n => (n.userId === userId || n.userId === '') ? { ...n, read: true } : n),
      })),
      clearAll: (userId) => set(s => ({
        notifications: s.notifications.filter(n => n.userId !== userId && n.userId !== ''),
      })),
      deleteNotification: (id) => set(s => ({ notifications: s.notifications.filter(n => n.id !== id) })),

      ensureWallet: (userId) => {
        let w = get().wallets[userId];
        if (!w) {
          w = newWallet(userId);
          set(s => ({ wallets: { ...s.wallets, [userId]: w } }));
        }
        return w;
      },
      topUp: (userId, amount, reference) => {
        const wallets = get().wallets;
        const cur = wallets[userId] || newWallet(userId);
        const tx: WalletTransaction = {
          id: 'wt_' + Date.now(), date: new Date().toISOString(),
          type: 'topup', description: `Wallet top-up`,
          amount, balanceAfter: cur.balance + amount, reference,
        };
        const next: Wallet = { ...cur, balance: cur.balance + amount, transactions: [tx, ...cur.transactions] };
        set(s => ({ wallets: { ...s.wallets, [userId]: next } }));
        return next;
      },
      charge: (userId, amount, type, description, reference) => {
        const wallets = get().wallets;
        const cur = wallets[userId] || newWallet(userId);
        if (cur.balance < amount && !cur.autoRecharge) {
          return { ok: false, wallet: cur };
        }
        let working = cur;
        // Auto-recharge if low
        if (working.balance - amount < working.autoRechargeThreshold && working.autoRecharge) {
          const topupTx: WalletTransaction = {
            id: 'wt_' + Date.now() + '_auto', date: new Date().toISOString(),
            type: 'topup', description: 'Auto-recharge',
            amount: working.autoRechargeAmount, balanceAfter: working.balance + working.autoRechargeAmount,
            reference: 'auto',
          };
          working = { ...working, balance: working.balance + working.autoRechargeAmount, transactions: [topupTx, ...working.transactions] };
        }
        const tx: WalletTransaction = {
          id: 'wt_' + Date.now() + '_chg', date: new Date().toISOString(),
          type, description, amount: -amount, balanceAfter: working.balance - amount, reference,
        };
        const next: Wallet = { ...working, balance: working.balance - amount, transactions: [tx, ...working.transactions] };
        set(s => ({ wallets: { ...s.wallets, [userId]: next } }));
        return { ok: true, wallet: next };
      },
      setAutoRecharge: (userId, autoRecharge, threshold, amount) => {
        const wallets = get().wallets;
        const cur = wallets[userId] || newWallet(userId);
        const next: Wallet = { ...cur, autoRecharge,
          autoRechargeThreshold: threshold ?? cur.autoRechargeThreshold,
          autoRechargeAmount: amount ?? cur.autoRechargeAmount };
        set(s => ({ wallets: { ...s.wallets, [userId]: next } }));
      },
    }),
    { name: 'carrier-base-platform' }
  )
);

// Convenience helpers
export function notificationIcon(type: NotificationType): string {
  switch (type) {
    case 'email_reply': return 'M';      // Mail
    case 'renewal_due': return 'R';      // Renewal
    case 'mvr_complete': return 'D';     // Driver
    case 'lead_assigned': return 'L';    // Lead
    case 'policy_bound': return 'B';     // Bound
    case 'wallet_low': return 'W';       // Wallet
    default: return 'i';
  }
}

export function notificationColor(type: NotificationType): { bg: string; color: string } {
  switch (type) {
    case 'email_reply':   return { bg: '#eff6ff', color: '#2563eb' };
    case 'renewal_due':   return { bg: '#fef3c7', color: '#92400e' };
    case 'mvr_complete':  return { bg: '#f0fdfa', color: '#0f766e' };
    case 'lead_assigned': return { bg: '#faf5ff', color: '#6b21a8' };
    case 'policy_bound':  return { bg: '#f0fdfa', color: '#0f766e' };
    case 'wallet_low':    return { bg: '#fff1f2', color: '#9f1239' };
    default:              return { bg: '#f1f5f9', color: '#475569' };
  }
}
