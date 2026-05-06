'use client';
import { useState } from 'react';
import { useCRMStore } from '@/lib/store';
import { US_STATES } from '@/lib/constants';
import type { Driver, Lead } from '@/lib/types';
import Modal from './ui/Modal';

export default function DriverModal({ lead, driver, idx, onClose }: { lead: Lead; driver?: Driver; idx?: number; onClose: () => void }) {
  const addDriver = useCRMStore(s => s.addDriver);
  const updateDriver = useCRMStore(s => s.updateDriver);

  const [d, setD] = useState<Driver>(driver ?? {
    firstName: '', lastName: '', dob: '', state: 'TX',
    dlNumber: '', cdlNumber: '', experience: 0, accidents: 0, violations: 0,
    mvrStatus: 'Pending', mvrDate: '',
  });
  const f = <K extends keyof Driver>(k: K, v: Driver[K]) => setD(p => ({ ...p, [k]: v }));

  const save = () => {
    if (!d.firstName || !d.lastName) return alert('Driver name required.');
    if (driver != null && idx != null) updateDriver(lead.id, idx, d);
    else addDriver(lead.id, d);
    onClose();
  };

  return (
    <Modal title={driver ? 'Edit Driver' : 'Add Driver'} onClose={onClose} width={680}>
      <div className="grid grid-2" style={{ gap: 12 }}>
        <div><label className="lbl">First Name *</label><input className="inp" value={d.firstName} onChange={e => f('firstName', e.target.value)} /></div>
        <div><label className="lbl">Last Name *</label><input className="inp" value={d.lastName} onChange={e => f('lastName', e.target.value)} /></div>
        <div><label className="lbl">DOB</label><input className="inp" type="date" value={d.dob} onChange={e => f('dob', e.target.value)} /></div>
        <div><label className="lbl">License State</label>
          <select className="sel" style={{ width: '100%' }} value={d.state} onChange={e => f('state', e.target.value)}>
            {US_STATES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div><label className="lbl">DL Number</label><input className="inp" value={d.dlNumber} onChange={e => f('dlNumber', e.target.value)} /></div>
        <div><label className="lbl">CDL Number</label><input className="inp" value={d.cdlNumber} onChange={e => f('cdlNumber', e.target.value)} /></div>
        <div><label className="lbl">Years Experience</label><input className="inp" type="number" min="0" value={d.experience} onChange={e => f('experience', Number(e.target.value))} /></div>
        <div><label className="lbl">Accidents (3 yr)</label><input className="inp" type="number" min="0" value={d.accidents} onChange={e => f('accidents', Number(e.target.value))} /></div>
        <div><label className="lbl">Violations (3 yr)</label><input className="inp" type="number" min="0" value={d.violations} onChange={e => f('violations', Number(e.target.value))} /></div>
        <div><label className="lbl">MVR Status</label>
          <select className="sel" style={{ width: '100%' }} value={d.mvrStatus} onChange={e => f('mvrStatus', e.target.value as Driver['mvrStatus'])}>
            <option>Pending</option><option>Clean</option><option>Issues Found</option>
          </select>
        </div>
        <div><label className="lbl">MVR Date</label><input className="inp" type="date" value={d.mvrDate} onChange={e => f('mvrDate', e.target.value)} /></div>
      </div>
      <div className="flex" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
        <button className="btn-s" onClick={onClose}>Cancel</button>
        <button className="btn-p" onClick={save}>{driver ? 'Save' : 'Add Driver'}</button>
      </div>
    </Modal>
  );
}
