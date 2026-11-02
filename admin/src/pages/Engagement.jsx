import { useState, useEffect, useCallback } from 'react';
import apiClient, { queryGet, queryCache } from '../services/apiClient';
import PaginationControls from '../components/PaginationControls';
import { toast } from 'sonner';

export default function Engagement({ kind }) {
  const leads = kind === 'leads';
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async signal => {
    setLoading(true); setError('');
    try {
      const { data } = await queryGet(`/api/admin/${kind}`, { page, limit: 20, status }, signal);
      if (!signal.aborted) { setRows(data[kind]); setPagination(data.pagination); }
    } catch (err) { if (!signal.aborted) setError(err.response?.data?.message || 'Unable to load records. Please retry.'); }
    finally { if (!signal.aborted) setLoading(false); }
  }, [kind, page, status]);
  useEffect(() => { const controller = new AbortController(); load(controller.signal); return () => controller.abort(); }, [load, revision]);
  async function save(event, row) {
    event.preventDefault(); if (busy) return; setBusy(true);
    try {
      if (leads) {
        const form = new FormData(event.currentTarget);
        await apiClient.put(`/api/admin/leads/${row._id}`, { status: form.get('status'), adminNote: form.get('adminNote'), expectedVersion: row.version });
      } else await apiClient.put(`/api/admin/subscribers/${row._id}/suppress`, {});
      toast.success(leads ? 'Inquiry updated' : 'Subscriber suppressed'); setRevision(value => value + 1);
    } catch (err) { toast.error(err.response?.data?.message || 'Update failed. Please retry.'); }
    finally { setBusy(false); }
  }
  return <main className="p-6 lg:p-10 space-y-6">
    <h1 className="text-3xl font-bold">{leads ? 'Contact inbox' : 'Newsletter subscribers'}</h1>
    {!leads && <p>Only confirmed addresses have recorded email consent. Suppressed addresses cannot be reactivated by administrators.</p>}
    <label>Filter by status <select className="border rounded p-2" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}>
      {['all', ...(leads ? ['new', 'in_progress', 'resolved'] : ['pending', 'confirmed', 'unsubscribed'])].map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
    </select></label>
    {loading ? <p role="status">Loading…</p> : error ? <div role="alert"><p>{error}</p><button onClick={() => { queryCache.clear(); setRevision(value => value + 1); }} className="underline">Retry</button></div> : <>
      <p role="status">{pagination?.total ?? 0} records</p>
      {!rows.length && <p>No {leads ? 'inquiries' : 'subscribers'} match this filter.</p>}
      {rows.map(row => <article key={`${row._id}-${row.version}-${revision}`} className="bg-white border rounded-xl p-5 space-y-3">
        <h2 className="font-semibold">{row.name || row.email}</h2>
        <p className="break-all">{row.email}{row.phone ? ` · ${row.phone}` : ''}</p>
        {leads && <p className="whitespace-pre-wrap break-words">{row.message}</p>}
        <p>Status: {row.status.replaceAll('_', ' ')}</p>
        <form onSubmit={event => save(event, row)} className="space-y-3">
          {leads ? <>
            <label className="block">Status <select name="status" defaultValue={row.status} className="border rounded p-2">{['new', 'in_progress', 'resolved'].map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>
            <label className="block">Internal note<textarea name="adminNote" defaultValue={row.adminNote || ''} maxLength={2000} className="block border rounded p-2 w-full" /></label>
          </> : null}
          {(leads || row.status !== 'unsubscribed') && <button disabled={busy} className="border rounded px-4 py-2 disabled:opacity-50">{busy ? 'Saving…' : leads ? 'Save inquiry' : 'Suppress address'}</button>}
        </form>
      </article>)}
      <PaginationControls pagination={pagination} onPageChange={setPage} />
    </>}
  </main>;
}
