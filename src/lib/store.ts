'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Lead, Market, Producer, Contact, Application, LeadStatus, Policy, Driver, Vehicle, MVROrder } from './types';
import type { TruckingApplication } from './trucking-app';
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

  // Policy actions
  addPolicy: (leadId: string, policy: Policy) => void;
  updatePolicy: (leadId: string, policyId: string, updates: Partial<Policy>) => void;
  deletePolicy: (leadId: string, policyId: string) => void;

  // Driver / Vehicle actions
  addDriver: (leadId: string, driver: Driver) => void;
  addDriversBulk: (leadId: string, drivers: Driver[]) => void;
  updateDriver: (leadId: string, idx: number, updates: Partial<Driver>) => void;
  deleteDriver: (leadId: string, idx: number) => void;
  addVehicle: (leadId: string, vehicle: Vehicle) => void;
  addVehiclesBulk: (leadId: string, vehicles: Vehicle[]) => void;
  updateVehicle: (leadId: string, idx: number, updates: Partial<Vehicle>) => void;
  deleteVehicle: (leadId: string, idx: number) => void;

  // MVR actions
  addMVROrder: (leadId: string, order: MVROrder) => void;
  updateMVROrder: (leadId: string, orderId: string, updates: Partial<MVROrder>) => void;

  // Trucking application actions
  truckingApps: TruckingApplication[];
  saveTruckingApp: (app: TruckingApplication) => void;
  deleteTruckingApp: (appId: string) => void;
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

      // ── Policies ──
      addPolicy: (leadId, policy) => set(s => ({
        leads: s.leads.map(l => l.id === leadId ? { ...l, policies: [...(l.policies || []), policy] } : l),
      })),
      updatePolicy: (leadId, policyId, updates) => set(s => ({
        leads: s.leads.map(l => {
          if (l.id !== leadId) return l;
          const policies = (l.policies || []).map(p => p.id === policyId ? { ...p, ...updates } : p);
          return { ...l, policies };
        }),
      })),
      deletePolicy: (leadId, policyId) => set(s => ({
        leads: s.leads.map(l => l.id === leadId
          ? { ...l, policies: (l.policies || []).filter(p => p.id !== policyId) }
          : l),
      })),

      // ── Drivers ──
      addDriver: (leadId, driver) => set(s => ({
        leads: s.leads.map(l => l.id === leadId ? { ...l, drivers: [...(l.drivers || []), driver] } : l),
      })),
      addDriversBulk: (leadId, drivers) => set(s => ({
        leads: s.leads.map(l => l.id === leadId ? { ...l, drivers: [...(l.drivers || []), ...drivers] } : l),
      })),
      updateDriver: (leadId, idx, updates) => set(s => ({
        leads: s.leads.map(l => {
          if (l.id !== leadId) return l;
          const drivers = [...(l.drivers || [])];
          if (drivers[idx]) drivers[idx] = { ...drivers[idx], ...updates };
          return { ...l, drivers };
        }),
      })),
      deleteDriver: (leadId, idx) => set(s => ({
        leads: s.leads.map(l => {
          if (l.id !== leadId) return l;
          const drivers = [...(l.drivers || [])];
          drivers.splice(idx, 1);
          return { ...l, drivers };
        }),
      })),

      // ── Vehicles ──
      addVehicle: (leadId, vehicle) => set(s => ({
        leads: s.leads.map(l => l.id === leadId ? { ...l, vehicleList: [...(l.vehicleList || []), vehicle] } : l),
      })),
      addVehiclesBulk: (leadId, vehicles) => set(s => ({
        leads: s.leads.map(l => l.id === leadId ? { ...l, vehicleList: [...(l.vehicleList || []), ...vehicles] } : l),
      })),
      updateVehicle: (leadId, idx, updates) => set(s => ({
        leads: s.leads.map(l => {
          if (l.id !== leadId) return l;
          const vehicleList = [...(l.vehicleList || [])];
          if (vehicleList[idx]) vehicleList[idx] = { ...vehicleList[idx], ...updates };
          return { ...l, vehicleList };
        }),
      })),
      deleteVehicle: (leadId, idx) => set(s => ({
        leads: s.leads.map(l => {
          if (l.id !== leadId) return l;
          const vehicleList = [...(l.vehicleList || [])];
          vehicleList.splice(idx, 1);
          return { ...l, vehicleList };
        }),
      })),

      // ── MVR ──
      addMVROrder: (leadId, order) => set(s => ({
        leads: s.leads.map(l => l.id === leadId ? { ...l, mvrOrders: [...(l.mvrOrders || []), order] } : l),
      })),
      updateMVROrder: (leadId, orderId, updates) => set(s => ({
        leads: s.leads.map(l => {
          if (l.id !== leadId) return l;
          const mvrOrders = (l.mvrOrders || []).map(o => o.id === orderId ? { ...o, ...updates } : o);
          return { ...l, mvrOrders };
        }),
      })),

      // ── Trucking applications ──
      truckingApps: [],
      saveTruckingApp: (app) => set(s => {
        const existing = s.truckingApps.find(a => a.id === app.id);
        const next = { ...app, updatedAt: new Date().toISOString() };
        return {
          truckingApps: existing
            ? s.truckingApps.map(a => a.id === app.id ? next : a)
            : [next, ...s.truckingApps],
        };
      }),
      deleteTruckingApp: (appId) => set(s => ({
        truckingApps: s.truckingApps.filter(a => a.id !== appId),
      })),
    }),
    { name: 'carrier-base-crm' }
  )
);
