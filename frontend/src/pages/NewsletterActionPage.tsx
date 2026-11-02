import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { newsAPI } from '../services/api';

export default function NewsletterActionPage({ action }: { action: 'confirm' | 'unsubscribe' }) {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('');
  async function submit() {
    if (!token || busy) return;
    setBusy(true); setMessage('');
    try { const { data } = await newsAPI[action](token); setMessage(data.message); setDone(true); }
    catch (error: any) { setMessage(error.response?.data?.message || 'Unable to process this request. Please try again.'); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen flex items-center justify-center p-6"><section className="max-w-lg space-y-5">
    <h1 className="text-2xl font-bold">{action === 'confirm' ? 'Confirm newsletter subscription' : 'Unsubscribe from newsletters'}</h1>
    <p>{action === 'confirm' ? 'Confirm to receive property news and updates from BuildEstate.' : 'You can stop marketing emails here. Your account and appointment emails are unaffected.'}</p>
    {!token && <p role="alert">This link is incomplete. Request a new email from the newsletter form.</p>}
    {message && <p role={done ? 'status' : 'alert'}>{message}</p>}
    {token && !done && <button disabled={busy} onClick={submit} className="px-5 py-3 rounded-lg bg-[#D4755B] text-white disabled:opacity-50">{busy ? 'Processing…' : action === 'confirm' ? 'Confirm subscription' : 'Unsubscribe'}</button>}
    <p><Link to="/contact" className="underline">Contact and newsletter signup</Link></p>
  </section></main>;
}
