import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Cpu } from 'lucide-react';
import { toast } from 'sonner';
import AccessibleDialog from '../components/AccessibleDialog';
import { aiModelsAPI } from '../services/aiModelsAPI';

const defaults = { maxTokens: 8192, timeoutMs: 60000, temperature: 0.5, topP: 1 };
const emptyForm = () => ({ name: '', slug: '', modelId: '', profile: 'text-basic', badge: '', description: '', config: { ...defaults } });
const button = 'border rounded-lg px-3 py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50';
const inputClass = 'block w-full border rounded-lg px-3 py-2 mt-1 disabled:bg-stone-100';
const tested = model => model.lastTest?.passed && model.lastTest.configuration === model.configuration;
export default function AIModels() {
  const [models, setModels] = useState([]), [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [busy, setBusy] = useState(false), [revision, setRevision] = useState(0);
  const [form, setForm] = useState(null), [editing, setEditing] = useState(null);
  const [pending, setPending] = useState(null), [replacement, setReplacement] = useState('');
  const [migrationRequired, setMigrationRequired] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    aiModelsAPI.list(controller.signal).then(({ data }) => {
      if (!controller.signal.aborted) { setModels(data.models); setProfiles(data.profiles || {}); setMigrationRequired(data.migrationRequired); }
    }).catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Unable to load AI models.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);
  const reload = () => setRevision(value => value + 1);
  async function run(work, message) {
    if (busy) return; setBusy(true);
    try { const response = await work(); if (message) toast.success(message); reload(); return response; }
    catch (err) { toast.error(err.response?.data?.message || 'Action failed. Refresh and retry.'); reload(); }
    finally { setBusy(false); }
  }
  function openForm(model = null) {
    setEditing(model); setForm(model ? { name: model.name, slug: model.slug, modelId: model.modelId, profile: model.profile, badge: model.badge, description: model.description, config: { ...model.config } } : emptyForm());
  }
  function setProfile(value) {
    const spec = profiles[value];
    setForm(current => ({ ...current, profile: value, modelId: spec.modelId || current.modelId, config: { ...defaults } }));
  }
  async function save(event) {
    event.preventDefault();
    const response = await run(() => editing ? aiModelsAPI.update(editing, form) : aiModelsAPI.create(form), editing ? 'Model saved. Retest changed configurations before enabling.' : 'Saved disabled. Run the application test next.');
    if (response) { setForm(null); setEditing(null); }
  }
  async function test(model, mode) {
    const response = await run(() => aiModelsAPI.test(model, mode));
    if (response) {
      const result = response.data.result;
      if (result.passed) toast.success(`${mode === 'application' ? 'Application JSON' : 'Connection'} test passed in ${result.latencyMs} ms`);
      else toast.error(`Test failed: ${result.code}. No fallback model was used.`);
    }
  }
  function destructive(model, action) { setPending({ model, action }); setReplacement(''); }
  async function confirmAction(event) {
    event.preventDefault();
    const { model, action } = pending;
    let options = {};
    if (model.isDefault) {
      if (!replacement) return;
      if (replacement === 'off') options = { turnOffAI: true };
      else { const next = models.find(row => row._id === replacement); options = { replacementId: next._id, replacementVersion: next.version }; }
    }
    const response = await run(() => action === 'remove' ? aiModelsAPI.remove(model, options) : aiModelsAPI.update(model, { ...options, isActive: false }), action === 'remove' ? 'Model removed. History retained.' : 'Model disabled.');
    if (response) setPending(null);
  }
  async function move(index, direction) {
    const ordered = [...models]; [ordered[index], ordered[index + direction]] = [ordered[index + direction], ordered[index]];
    await run(() => aiModelsAPI.reorder(ordered), 'Fallback order updated');
  }
  return <main className="min-h-screen bg-[#FAF8F4] p-6 lg:p-10 space-y-6">
    <div className="flex flex-wrap gap-4 justify-between items-center">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold"><Cpu aria-hidden="true" />AI models</h1><p className="text-stone-600 mt-2">NVIDIA NIM · Save disabled, test, then enable. The default runs first; other enabled models follow the order below (up to three attempts within 120 seconds).</p></div>
      <div className="flex gap-2"><button className={button} disabled={busy} onClick={reload}><RefreshCw className="inline h-4 w-4 mr-2" />Refresh</button><button className={button} disabled={busy || migrationRequired || loading} onClick={() => openForm()}><Plus className="inline h-4 w-4 mr-2" />Add model</button></div>
    </div>
    <p className="text-sm text-stone-600">Tests send a small demo request to NVIDIA and use account quota. API keys stay on the server. A connection test alone does not enable a model.</p>
    {migrationRequired && <div role="alert" className="border border-amber-300 bg-amber-50 p-4 rounded-lg">Legacy configurations need migration before management. Follow backend/docs/admin-phase2-nvidia.md; existing user and property records are preserved.</div>}
    {error && <p role="alert" className="text-red-700">{error} <button className="underline" onClick={reload}>Retry</button></p>}
    {loading ? <p role="status">Loading models…</p> : !error && <>
      {!models.length && !migrationRequired && <p className="bg-white border rounded-xl p-6">No models configured. Add a NVIDIA model to begin. AI search is unavailable until a tested model is enabled.</p>}
      {models.map((model, index) => <article key={model._id} className="bg-white border rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-lg">{model.name}{model.isDefault ? ' · Default' : ''}</h2><p className="text-sm break-all text-stone-600">{model.modelId}</p><p className="mt-1 text-sm">{model.isActive ? 'Enabled' : 'Disabled'} · {profiles[model.profile]?.label || model.profile} · Order {index + 1}</p>{model.description && <p className="text-sm mt-2">{model.description}</p>}</div><span className="border rounded-full px-3 py-1 text-xs">{tested(model) ? 'Application test passed' : 'Application test required'}</span></div>
        {model.lastTest && <p className="text-sm" role="status">Last application test: {model.lastTest.passed ? 'passed' : `failed (${model.lastTest.code})`} · {model.lastTest.latencyMs} ms · {new Date(model.lastTest.testedAt).toLocaleString()}</p>}
        {model.lastConnectionTest && <p className="text-sm">Connection test: {model.lastConnectionTest.passed ? 'passed' : 'failed'} · {new Date(model.lastConnectionTest.testedAt).toLocaleString()}</p>}
        <div className="flex flex-wrap gap-2">
          <button disabled={busy || migrationRequired} className={button} onClick={() => test(model, 'connection')}>Test connection</button>
          <button disabled={busy || migrationRequired} className={button} onClick={() => test(model, 'application')}>Test application JSON</button>
          <button disabled={busy || migrationRequired || (!model.isActive && !tested(model))} className={button} onClick={() => model.isActive ? destructive(model, 'disable') : run(() => aiModelsAPI.update(model, { isActive: true }), 'Model enabled')}>{model.isActive ? 'Disable' : 'Enable'}</button>
          {!model.isDefault && <button disabled={busy || migrationRequired || !model.isActive || !tested(model)} className={button} onClick={() => run(() => aiModelsAPI.update(model, { isDefault: true }), 'Default updated')}>Make default</button>}
          <button disabled={busy || migrationRequired} className={button} onClick={() => openForm(model)}>Edit</button>
          <button disabled={busy || migrationRequired} className={button} onClick={() => destructive(model, 'remove')}>Remove</button>
          <button aria-label={`Move ${model.name} earlier`} disabled={busy || migrationRequired || index === 0} className={button} onClick={() => move(index, -1)}>Move up</button>
          <button aria-label={`Move ${model.name} later`} disabled={busy || migrationRequired || index === models.length - 1} className={button} onClick={() => move(index, 1)}>Move down</button>
        </div>
        <details className="text-sm"><summary className="cursor-pointer">Saved parameters and test limits</summary><dl className="grid grid-cols-2 gap-2 mt-3">{Object.entries(model.config).map(([key, value]) => <div key={key}><dt className="text-stone-500">{key}</dt><dd>{String(value)}</dd></div>)}</dl><p className="mt-2 text-stone-600">Application tests use at most 1024 output tokens and 30 seconds, bounded by the saved limits. Search uses saved limits. Configuration: {model.configuration.slice(0, 12)}</p></details>
      </article>)}
    </>}
    {form && <AccessibleDialog label={editing ? 'Edit NVIDIA model' : 'Add NVIDIA model'} busy={busy} onClose={() => setForm(null)}><form onSubmit={save} className="w-[min(90vw,36rem)] p-6 space-y-4"><h2 className="font-bold text-xl">{editing ? 'Edit model' : 'Add model'}</h2><p>NVIDIA API key and endpoint are configured on the server.</p>{editing?.isActive && <p className="text-amber-800">Disable this model before changing its ID, profile or parameters.</p>}
      <label className="block">Parameter profile<select className={inputClass} disabled={busy || editing?.isActive} value={form.profile} onChange={event => setProfile(event.target.value)}>{Object.entries(profiles).map(([key, spec]) => <option value={key} key={key}>{spec.label}</option>)}</select></label>
      {['name', 'slug', 'modelId', 'badge', 'description'].map(field => <label className="block" key={field}>{({ name: 'Name', slug: 'Unique slug', modelId: 'Exact NVIDIA model ID', badge: 'Badge', description: 'Description' })[field]}<input className={inputClass} required={['name', 'slug', 'modelId'].includes(field)} maxLength={field === 'description' ? 2000 : 200} disabled={busy || (field === 'modelId' && editing?.isActive)} value={form[field]} onChange={event => setForm(current => ({ ...current, [field]: event.target.value }))} /></label>)}
      <fieldset disabled={busy || editing?.isActive} className="grid grid-cols-2 gap-3"><legend className="font-semibold mb-2">Parameters</legend>{Object.keys(defaults).map(field => <label key={field}>{field}<input className={inputClass} type="number" required step={['temperature', 'topP'].includes(field) ? '0.01' : '1'} value={form.config[field]} onChange={event => setForm(current => ({ ...current, config: { ...current.config, [field]: event.target.value === '' ? '' : Number(event.target.value) } }))} /></label>)}
        {profiles[form.profile]?.options.includes('enableThinking') && <label className="col-span-2"><input type="checkbox" checked={form.config.enableThinking || false} onChange={event => setForm(current => ({ ...current, config: { ...current.config, enableThinking: event.target.checked } }))} /> Enable thinking</label>}
        {profiles[form.profile]?.options.includes('reasoningEffort') && <label>Reasoning effort<select className={inputClass} value={form.config.reasoningEffort || ''} onChange={event => setForm(current => { const config = { ...current.config }; if (event.target.value) config.reasoningEffort = event.target.value; else delete config.reasoningEffort; return { ...current, config }; })}><option value="">Provider default</option><option value="high">High</option></select></label>}
        {(profiles[form.profile]?.options || []).filter(key => !['enableThinking', 'reasoningEffort'].includes(key)).map(field => <label key={field}>{field} (optional)<input className={inputClass} type="number" step={field === 'seed' ? '1' : '0.1'} value={form.config[field] ?? ''} onChange={event => setForm(current => { const config = { ...current.config }; if (event.target.value !== '') config[field] = Number(event.target.value); else delete config[field]; return { ...current, config }; })} /></label>)}
      </fieldset><div className="flex justify-end gap-2"><button type="button" disabled={busy} className={button} onClick={() => setForm(null)}>Cancel</button><button disabled={busy} className={button}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Save disabled'}</button></div>
    </form></AccessibleDialog>}
    {pending && <AccessibleDialog label={`${pending.action} model`} busy={busy} onClose={() => setPending(null)}><form className="w-[min(90vw,32rem)] p-6 space-y-4" onSubmit={confirmAction}><h2 className="font-semibold text-xl">{pending.action === 'remove' ? 'Remove' : 'Disable'} {pending.model.name}?</h2><p>Future requests will no longer use this model. Existing audit history stays available.</p>{pending.model.isDefault && <label className="block">Replace the default or turn off AI<select required className={inputClass} value={replacement} onChange={event => setReplacement(event.target.value)}><option value="">Choose an action</option>{models.filter(row => row._id !== pending.model._id && row.isActive && tested(row)).map(row => <option key={row._id} value={row._id}>Use {row.name}</option>)}<option value="off">Turn off all AI search models</option></select></label>}<div className="flex justify-end gap-2"><button type="button" disabled={busy} className={button} onClick={() => setPending(null)}>Cancel</button><button disabled={busy || (pending.model.isDefault && !replacement)} className={button}>Confirm {pending.action}</button></div></form></AccessibleDialog>}
  </main>;
}
