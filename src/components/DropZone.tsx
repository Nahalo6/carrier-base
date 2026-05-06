'use client';
import { useState, useRef, type DragEvent } from 'react';

export default function DropZone({
  onFile, label, helperText, onTemplate,
}: {
  onFile: (file: File) => void;
  label: string;
  helperText: string;
  onTemplate?: () => void;
}) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={handle}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${over ? '#2563eb' : '#cbd5e1'}`,
        borderRadius: 12,
        padding: '24px 18px',
        background: over ? '#eff6ff' : '#f8fafc',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.15s',
      }}
    >
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={over ? '#2563eb' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8 }}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#1b2a4a', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{helperText}</div>
      <div style={{ fontSize: 11, color: '#94a3b8' }}>Click to browse · Accepts .xlsx, .xls, .csv</div>
      {onTemplate && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onTemplate(); }}
          style={{ marginTop: 10, fontSize: 11, padding: '4px 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, color: '#475569', cursor: 'pointer', fontWeight: 600 }}
        >
          Download template
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </div>
  );
}
