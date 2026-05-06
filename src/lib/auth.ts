'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'admin' | 'manager' | 'producer';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  password: string;          // demo only — real impl would be hashed server-side
  role: UserRole;
  status: 'active' | 'suspended';
  createdDate: string;
  lastLogin?: string;
  tempPassword?: boolean;    // true when admin creates user with auto-pw
  plan?: string;             // solo / agency / enterprise
  phone?: string;
}

interface AuthState {
  users: AuthUser[];
  currentUser: AuthUser | null;
  // Auth flows
  signUp: (input: { email: string; password: string; name: string; plan?: string; role?: UserRole }) => { ok: true; user: AuthUser } | { ok: false; error: string };
  signIn: (email: string, password: string) => { ok: true; user: AuthUser } | { ok: false; error: string };
  signOut: () => void;
  // Admin actions
  createUser: (input: { email: string; name: string; role: UserRole; phone?: string }) => { user: AuthUser; tempPassword: string };
  updateUser: (id: string, updates: Partial<AuthUser>) => void;
  deleteUser: (id: string) => void;
  resetPassword: (id: string) => string;        // returns new temp password
  changePassword: (id: string, newPassword: string) => void;
  setRole: (id: string, role: UserRole) => void;
  setStatus: (id: string, status: 'active' | 'suspended') => void;
}

function genTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let p = '';
  for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

// Seed admin so the platform always has at least one admin login
const SEED_ADMIN: AuthUser = {
  id: 'u_admin', email: 'admin@carrierbase.app', name: 'Platform Admin',
  password: 'admin', role: 'admin', status: 'active', createdDate: '2025-01-01',
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      users: [SEED_ADMIN],
      currentUser: null,

      signUp: ({ email, password, name, plan, role }) => {
        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedEmail || !password || !name) return { ok: false as const, error: 'Email, password, and name are required.' };
        if (get().users.some(u => u.email === trimmedEmail)) return { ok: false as const, error: 'An account with that email already exists.' };
        const user: AuthUser = {
          id: 'u_' + Date.now(),
          email: trimmedEmail, name: name.trim(), password,
          role: role || 'producer', status: 'active',
          createdDate: new Date().toISOString().split('T')[0],
          plan, lastLogin: new Date().toISOString(),
        };
        set(s => ({ users: [...s.users, user], currentUser: user }));
        return { ok: true as const, user };
      },

      signIn: (email, password) => {
        const user = get().users.find(u => u.email === email.trim().toLowerCase() && u.password === password);
        if (!user) return { ok: false as const, error: 'Invalid email or password.' };
        if (user.status === 'suspended') return { ok: false as const, error: 'This account is suspended. Contact your admin.' };
        const updated: AuthUser = { ...user, lastLogin: new Date().toISOString() };
        set(s => ({
          currentUser: updated,
          users: s.users.map(u => u.id === user.id ? updated : u),
        }));
        return { ok: true as const, user: updated };
      },

      signOut: () => set({ currentUser: null }),

      createUser: ({ email, name, role, phone }) => {
        const tempPassword = genTempPassword();
        const user: AuthUser = {
          id: 'u_' + Date.now(),
          email: email.trim().toLowerCase(), name: name.trim(), phone,
          password: tempPassword, role, status: 'active',
          createdDate: new Date().toISOString().split('T')[0],
          tempPassword: true,
        };
        set(s => ({ users: [...s.users, user] }));
        // Backend integration target: send email containing tempPassword + reset link
        return { user, tempPassword };
      },

      updateUser: (id, updates) => set(s => ({
        users: s.users.map(u => u.id === id ? { ...u, ...updates } : u),
        currentUser: s.currentUser?.id === id ? { ...s.currentUser, ...updates } : s.currentUser,
      })),

      deleteUser: (id) => set(s => ({
        users: s.users.filter(u => u.id !== id),
        currentUser: s.currentUser?.id === id ? null : s.currentUser,
      })),

      resetPassword: (id) => {
        const tempPassword = genTempPassword();
        set(s => ({
          users: s.users.map(u => u.id === id ? { ...u, password: tempPassword, tempPassword: true } : u),
        }));
        return tempPassword;
      },

      changePassword: (id, newPassword) => set(s => ({
        users: s.users.map(u => u.id === id ? { ...u, password: newPassword, tempPassword: false } : u),
        currentUser: s.currentUser?.id === id ? { ...s.currentUser, password: newPassword, tempPassword: false } : s.currentUser,
      })),

      setRole: (id, role) => set(s => ({
        users: s.users.map(u => u.id === id ? { ...u, role } : u),
        currentUser: s.currentUser?.id === id ? { ...s.currentUser, role } : s.currentUser,
      })),

      setStatus: (id, status) => set(s => ({
        users: s.users.map(u => u.id === id ? { ...u, status } : u),
        currentUser: s.currentUser?.id === id && status === 'suspended' ? null : s.currentUser,
      })),
    }),
    { name: 'carrier-base-auth' }
  )
);

// Helper: check if user has access to a feature
export function canAccess(user: AuthUser | null, feature: 'admin' | 'manager' | 'all'): boolean {
  if (!user) return false;
  if (feature === 'admin') return user.role === 'admin';
  if (feature === 'manager') return user.role === 'admin' || user.role === 'manager';
  return true;
}
