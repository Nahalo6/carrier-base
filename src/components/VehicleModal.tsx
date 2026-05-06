'use client';
import { useState } from 'react';
import { useCRMStore } from '@/lib/store';
import type { Vehicle, Lead } from '@/lib/types';
import Modal from './ui/Modal';

const VEH_TYPES = ['Tractor', 'Straight Truck', 'Trailer', 'Van', 'Pickup', 'Reefer', 'Flatbed', 'Tanker', 'Other'];

export default function VehicleModal({ lead, vehicle, idx, onClose }: { lead: Lead; vehicle?: Vehicle; idx?: number; onClose: () => void }) {
  const addVehicle = useCRMStore(s => s.addVehicle);
  const updateVehicle = useCRMStore(s => s.updateVehicle);

  const [v, setV] = useState<Vehicle>(vehicle ?? {
    unitNumber: '', type: 'Tractor', year: '', make: '', model: '', vin: '', value: 0, gvw: 0,
  });
  const f = <K extends keyof Vehicle>(k: K, val: Vehicle[K]) => setV(p => ({ ...p, [k]: val }));

  const save = () => {
    if (!v.vin && !v.unitNumber) return alert('VIN or Unit Number required.');
    if (vehicle != null && idx != null) updateVehicle(lead.id, idx, v);
    else addVehicle(lead.id, v);
    onClose();
  };

  return (
    <Modal title={vehicle ? 'Edit Vehicle' : 'Add Vehicle'} onClose={onClose} width={680}>
      <div className="grid grid-2" style={{ gap: 12 }}>
        <div><label className="lbl">Unit Number</label><input className="inp" value={v.unitNumber} onChange={e => f('unitNumber', e.target.value)} /></div>
        <div><label className="lbl">Type</label>
          <select className="sel" style={{ width: '100%' }} value={v.type} onChange={e => f('type', e.target.value)}>
            {VEH_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div><label className="lbl">Year</label><input className="inp" value={v.year} onChange={e => f('year', e.target.value)} /></div>
        <div><label className="lbl">Make</label><input className="inp" value={v.make} onChange={e => f('make', e.target.value)} /></div>
        <div><label className="lbl">Model</label><input className="inp" value={v.model} onChange={e => f('model', e.target.value)} /></div>
        <div><label className="lbl">VIN</label><input className="inp" value={v.vin} onChange={e => f('vin', e.target.value)} /></div>
        <div><label className="lbl">Stated Value ($)</label><input className="inp" type="number" min="0" value={v.value} onChange={e => f('value', Number(e.target.value))} /></div>
        <div><label className="lbl">GVW (lbs)</label><input className="inp" type="number" min="0" value={v.gvw} onChange={e => f('gvw', Number(e.target.value))} /></div>
      </div>
      <div className="flex" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
        <button className="btn-s" onClick={onClose}>Cancel</button>
        <button className="btn-p" onClick={save}>{vehicle ? 'Save' : 'Add Vehicle'}</button>
      </div>
    </Modal>
  );
}
