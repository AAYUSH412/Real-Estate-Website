import { useState } from 'react';
import { userAPI } from '../../services/api';
export default function ResendVerificationForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  return <form className="space-y-3 mt-5" onSubmit={async event => {
    event.preventDefault(); if (busy) return; setBusy(true); setMessage('');
    try { const { data } = await userAPI.resendVerification(email); setMessage(data.message); }
    catch (error: any) { setMessage(error.response?.data?.message || 'Unable to send verification. Try again later.'); }
    finally { setBusy(false); }
  }}>
    <label className="block">Account email<input type="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" className="block w-full border rounded-lg p-3" /></label>
    <button disabled={busy} className="border rounded-lg p-3 disabled:opacity-50">{busy ? 'Sending…' : 'Resend verification email'}</button>
    {message && <p role="status">{message}</p>}
  </form>;
}
