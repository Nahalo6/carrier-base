'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Lead, Market, Producer, Contact, Application, LeadStatus } from './types';
import {
  INITIAL_LEADS, INITIAL_MARKETS, INITIAL_PRODUCERS,
  INITIAL_APPLICATIONS, INITIAL_TEAM_GOAL,
} from './data';
import { todayISO } from './utils';

interface CRMState {
  leads: Lead[];
  markets: Market[];
  producers: Producer[];
  contacts: Contact[];
  apps: Application[];
  teamGoal: typeof INITIAL_TEAM_GOAL;
  expandedEmails: Record<string, boolean>;
  currentUserId: string;

  // Lead actions
  addLead: (lead: Lead) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  setLeadStatus: (id: string, status: LeadStatus) => void;
  addEmail: (leadId: string, email: Lead['emails'][number]) => void;
  deleteEmail: (leadId: string, emailIdx: number) => void;
  updateEmailTag: (leadId: string, emailIdx: number, tag: string) => void;
  markEmailRead: (leadId: string, emailIdx: number) => void;
  addDoc: (leadId: string, doc: Lead['docs'][number]) => void;
  deleteDoc: (leadId: string, docId: string) => void;
  toggleEmailExpand: (leadId: string, emailIdx: number) => void;
  updateMarketStatus: (leadId: string, mid: string, status: string) => void;
  addMarketToLead: (leadId: string, mid: string) => void;

  // Market actions
  addMarket: (market: Market) => void;
  updateMarket: (id: string, updates: Partial<Market>) => void;
  deleteMarket: (id: string) => void;

  // Producer actions
  addProducer: (producer: Producer) => void;
  updateProducer: (id: string, updates: Partial<Producer>) => void;
  deleteProducer: (id: string) => void;
  updateTeamGoal: (goal: Partial<typeof INITIAL_TEAM_GOAL>) => void;

  // Contact actions
  addContact: (contact: Contact) => void;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  deleteContact: (id: string) => void;

  // App actions
  addApp: (app: Application) => void;
  updateApp: (id: string, updates: Partial<Application>) => void;
  deleteApp: (id: string) => void;
}

export const useCRMStore = create<CRMState>()(
  persist(
    (set, get) => ({
      leads: INITIAL_LEADS,
      markets: INITIAL_MARKETS,
      producers: INITIAL_PRODUCERS,
      contacts: [],
      apps: INITIAL_APPLICATIONS,
      teamGoal: INITIAL_TEAM_GOAL,
      expandedEmails: {},
      currentUserId: 'p1',

      addLead: (lead) => set(s => ({ leads: [...s.leads, lead] })),
      updateLead: (id, updates) => set(s => ({
        leads: s.leads.map(l => l.id === id ? { ...l, ...updates } : l),
      })),
      deleteLead: (id) => set(s => ({ leads: s.leads.filter(l => l.id !== id) })),
      setLeadStatus: (id, status) => set(s => ({
        leads: s.leads.map(l => {
          if (l.id !== id) return l;
          const hist = l.statusHistory || [];
          return {
            ...l,
            status,
            boundDate: status === 'Bound' ? (l.boundDate || todayISO()) : null,
            statusHistory: [...hist, { status, date: todayISO(), from: l.status, changedBy: s.currentUserId }],
          };
        }),
      })),

      addEmail: (leadId, email) => set(s => ({
        leads: s.leads.map(l => l.id === leadId ? { ...l, emails: [...l.emails, email] } : l),
      })),
      deleteEmail: (leadId, emailIdx) => set(s => ({
        leads: s.leads.map(l => {
          if (l.id !== leadId) return l;
          const emails = [...l.emails];
          emails.splice(emailIdx, 1);
          return { ...l, emails };
        }),
      })),
      updateEmailTag: (leadId, emailIdx, tag) => set(s => ({
        leads: s.leads.map(l => {
          if (l.id !== leadId) return l;
          const emails = l.emails.map((e, i) => i === emailIdx ? { ...e, tag } : e);
          return { ...l, emails };
        }),
      })),
      markEmailRead: (leadId, emailIdx) => set(s => ({
        leads: s.leads.map(l => {
          if (l.id !== leadId) return l;
          const emails = l.emails.map((e, i) => i === emailIdx ? { ...e, read: true } : e);
          return { ...l, emails };
        }),
      })),
      toggleEmailExpand: (leadId, emailIdx) => {
        const key = `${leadId}_${emailIdx}`;
        const current = get().expandedEmails[key];
        set(s => ({ expandedEmails: { ...s.expandedEmails, [key]: !current } }));
        if (!current) {
          // mark as read when expanding
          const lead = get().leads.find(l => l.id === leadId);
          if (lead?.emails[emailIdx]?.dir === 'in') {
            get().markEmailRead(leadId, emailIdx);
          }
        }
      },

      addDoc: (leadId, doc) => set(s => ({
        leads: s.leads.map(l => l.id === leadId ? { ...l, docs: [...l.docs, doc] } : l),
      })),
      deleteDoc: (leadId, docId) => set(s => ({
        leads: s.leads.map(l => l.id === leadId ? { ...l, docs: l.docs.filter(d => d.id !== docId) } : l),
      })),

      updateMarketStatus: (leadId, mid, status) => set(s => ({
        leads: s.leads.map(l => {
          if (l.id !== leadId) return l;
          const markets = l.markets.map(m => m.mid === mid ? { ...m, status: status as Lead['markets'][number]['status'] } : m);
          return { ...l, markets };
        }),
      })),
      addMarketToLead: (leadId, mid) => set(s => ({
        leads: s.leads.map(l => {
          if (l.id !== leadId) return l;
          if (l.markets.find(m => m.mid === mid)) return l;
          return { ...l, markets: [...l.markets, { mid, status: 'Pending' }] };
        }),
      })),

      addMarket: (market) => set(s => ({ markets: [...s.markets, market] })),
      updateMarket: (id, updates) => set(s => ({ markets: s.markets.map(m => m.id === id ? { ...m, ...updates } : m) })),
      deleteMarket: (id) => set(s => ({ markets: s.markets.filter(m => m.id !== id) })),

      addProducer: (producer) => set(s => ({ producers: [...s.producers, producer] })),
      updateProducer: (id, updates) => set(s => ({ producers: s.producers.map(p => p.id === id ? { ...p, ...updates } : p) })),
      deleteProducer: (id) => set(s => ({ producers: s.producers.filter(p => p.id !== id) })),
      updateTeamGoal: (goal) => set(s => ({ teamGoal: { ...s.teamGoal, ...goal } })),

      addContact: (contact) => set(s => ({ contacts: [...s.contacts, contact] })),
      updateContact: (id, updates) => set(s => ({ contacts: s.contacts.map(c => c.id === id ? { ...c, ...updates } : c) })),
      deleteContact: (id) => set(s => ({ contacts: s.contacts.filter(c => c.id !== id) })),

      addApp: (app) => set(s => ({ apps: [...s.apps, app] })),
      updateApp: (id, updates) => set(s => ({ apps: s.apps.map(a => a.id === id ? { ...a, ...updates } : a) })),
      deleteApp: (id) => set(s => ({ apps: s.apps.filter(a => a.id !== id) })),
    }),
    { name: 'carrier-base-crm' }
  )
);
