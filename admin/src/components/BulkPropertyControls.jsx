import { useState } from 'react';
import { toast } from 'sonner';
import apiClient from '../services/apiClient';
import AccessibleDialog from './AccessibleDialog';

export default function BulkPropertyControls({ records, onUpdated, reviewOnly = false }) {
  const [selected, setSelected] = useState([]);
  const [action, setAction] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const chosen = records.filter(row => selected.includes(row._id));
  const canReview = chosen.length > 0 && chosen.every(row => row.status === 'pending');
  async function submit(event) {
    event.preventDefault(); if (busy) return; setBusy(true);
    try {
      const { data } = await apiClient.post(`/api/admin/properties/bulk-${action}`, {
        propertyIds: chosen.map(row => row._id),
        expectedVersions: Object.fromEntries(chosen.map(row => [row._id, row.version ?? row.__v ?? 0])),
        ...(action === 'reject' ? { reason: reason.trim() } : {}),
      });
      toast.success(`${data.count} listings ${action === 'delete' ? 'archived' : 'updated'}`);
      setAction(''); setSelected([]); setReason(''); await onUpdated();
    } catch (err) { toast.error(err.response?.data?.message || 'No listings changed. Refresh and try again.'); }
    finally { setBusy(false); }
  }
  if (!records.length) return null;
  return <section aria-label="Bulk property actions" className="border rounded-lg p-4 my-5 space-y-3">
    <details><summary className="cursor-pointer">Select listings on this page ({chosen.length} selected)</summary>
      <label className="block p-2"><input type="checkbox" checked={chosen.length === records.length} onChange={event => setSelected(event.target.checked ? records.map(row => row._id) : [])} /> Select this page</label>
      {records.map(row => <label key={row._id} className="block p-2"><input type="checkbox" checked={selected.includes(row._id)} onChange={event => setSelected(previous => event.target.checked ? [...previous, row._id] : previous.filter(id => id !== row._id))} /> {row.title} ({row.status})</label>)}
    </details>
    <div className="flex flex-wrap gap-3">
      <button disabled={!canReview || busy} onClick={() => setAction('approve')} className="border p-2 rounded disabled:opacity-40">Approve selected</button>
      <button disabled={!canReview || busy} onClick={() => setAction('reject')} className="border p-2 rounded disabled:opacity-40">Reject selected</button>
      {!reviewOnly && <button disabled={!chosen.length || busy || chosen.some(row => row.status === 'archived')} onClick={() => setAction('delete')} className="border p-2 rounded disabled:opacity-40">Archive selected</button>}
    </div>
    <p className="text-sm">Approval and rejection require pending listings. Each batch succeeds together or changes nothing.</p>
    {action && <AccessibleDialog label="Confirm bulk property action" busy={busy} onClose={() => setAction('')}><form onSubmit={submit} className="p-6 space-y-4 max-w-md">
      <h2 className="text-xl font-bold">{action === 'delete' ? 'Archive' : action} {chosen.length} listings?</h2>
      {action === 'delete' && <p>Listings leave the public catalog and open appointments are cancelled. Booking history is retained.</p>}
      {action === 'reject' && <label className="block">Rejection reason<textarea required maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} className="border rounded p-2 block w-full" /></label>}
      <div className="flex gap-3"><button type="button" disabled={busy} onClick={() => setAction('')}>Cancel</button><button disabled={busy} className="border rounded p-2">{busy ? 'Saving…' : 'Confirm'}</button></div>
    </form></AccessibleDialog>}
  </section>;
}
