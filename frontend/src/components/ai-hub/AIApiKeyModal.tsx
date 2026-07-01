import React, { useState, useEffect } from 'react';
import { X, Key, Eye, EyeOff, CheckCircle2, AlertCircle, ExternalLink, Trash2, Save, Zap } from 'lucide-react';
import { aiAPI, apiKeyStorage } from '../../services/api';

interface AIApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeysChanged: () => void;
}

const SERVER_AI_ENABLED = import.meta.env.VITE_SERVER_AI_ENABLED === 'true';

const AIApiKeyModal: React.FC<AIApiKeyModalProps> = ({ isOpen, onClose, onKeysChanged }) => {
  const [githubKey,    setGithubKey]    = useState('');
  const [firecrawlKey, setFirecrawlKey] = useState('');
  const [nvidiaKey,    setNvidiaKey]    = useState('');
  const [showGithub,    setShowGithub]    = useState(false);
  const [showFirecrawl, setShowFirecrawl] = useState(false);
  const [showNvidia,    setShowNvidia]    = useState(false);
  const [toast,   setToast]   = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [nvidiaStatus, setNvidiaStatus] = useState<'untested' | 'valid' | 'invalid'>('untested');

  const hasGithub    = !!apiKeyStorage.getGithubKey();
  const hasFirecrawl = !!apiKeyStorage.getFirecrawlKey();
  const hasNvidia    = apiKeyStorage.hasNvidiaKey();

  useEffect(() => {
    if (!isOpen) {
      setGithubKey('');
      setFirecrawlKey('');
      setNvidiaKey('');
      setToast(null);
      setNvidiaStatus('untested');
    }
  }, [isOpen]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSave = async () => {
    const enteredGithub    = githubKey.trim();
    const enteredFirecrawl = firecrawlKey.trim();
    const enteredNvidia    = nvidiaKey.trim();

    if (!enteredGithub && !enteredFirecrawl && !enteredNvidia) {
      showToast('error', 'Enter at least one key to save.');
      return;
    }

    // Format validation
    if (enteredGithub && !enteredGithub.startsWith('ghp_') && !enteredGithub.startsWith('github_pat_')) {
      showToast('error', 'GitHub key should start with ghp_ or github_pat_');
      return;
    }
    if (enteredFirecrawl && !enteredFirecrawl.startsWith('fc-')) {
      showToast('error', 'Firecrawl key should start with fc-');
      return;
    }
    if (enteredNvidia && !enteredNvidia.startsWith('nvapi-')) {
      showToast('error', 'NVIDIA NIM key should start with nvapi-');
      return;
    }

    const effectiveGithub    = enteredGithub    || apiKeyStorage.getGithubKey().trim();
    const effectiveFirecrawl = enteredFirecrawl || apiKeyStorage.getFirecrawlKey().trim();
    const effectiveNvidia    = enteredNvidia    || apiKeyStorage.getNvidiaKey().trim();

    // Firecrawl always required
    if (!effectiveFirecrawl) {
      showToast('error', 'Firecrawl API key is required for property search.');
      return;
    }
    // AI provider required only when server doesn't have one
    if (!SERVER_AI_ENABLED && !effectiveGithub && !effectiveNvidia) {
      showToast('error', 'Add at least one AI provider key — GitHub Models or NVIDIA NIM.');
      return;
    }

    setSaving(true);
    try {
      const res = await aiAPI.validateKeys({
        githubKey:    effectiveGithub,
        firecrawlKey: effectiveFirecrawl,
        nvidiaKey:    effectiveNvidia || undefined,
      });

      // Required keys passed — persist them
      if (enteredGithub)    apiKeyStorage.setGithubKey(enteredGithub);
      if (enteredFirecrawl) apiKeyStorage.setFirecrawlKey(enteredFirecrawl);

      // NVIDIA is optional — persist and show status
      const nvidiaRes = res.data?.nvidia;
      if (enteredNvidia) {
        if (nvidiaRes?.valid) {
          apiKeyStorage.setNvidiaKey(enteredNvidia);
          setNvidiaStatus('valid');
        } else {
          setNvidiaStatus('invalid');
        }
      }

      setGithubKey('');
      setFirecrawlKey('');
      setNvidiaKey('');

      const nvidiaMsg = effectiveNvidia
        ? (nvidiaRes?.valid
            ? ' NVIDIA NIM key active — 40 rpm quota unlocked.'
            : ' NVIDIA key invalid — using GitHub Models instead.')
        : '';

      showToast('success', `Keys verified and saved!${nvidiaMsg}`);
      onKeysChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Could not verify API keys. Please check and try again.';
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    apiKeyStorage.clear();
    setNvidiaStatus('untested');
    showToast('success', 'All keys removed.');
    onKeysChanged();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-[#1a0f0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#D4755B]/20 rounded-xl flex items-center justify-center">
              <Key className="w-4 h-4 text-[#D4755B]" />
            </div>
            <div>
              <h2 className="font-syne font-bold text-white text-lg">Your API Keys</h2>
              <p className="font-manrope text-xs text-white/40">Saved in your browser only — never sent to our servers.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Server AI banner */}
        {SERVER_AI_ENABLED && (
          <div className="mx-6 mt-4 flex items-center gap-3 bg-[#76B900]/10 border border-[#76B900]/30 rounded-xl px-4 py-3">
            <Zap className="w-4 h-4 text-[#76B900] shrink-0" />
            <p className="font-manrope text-xs text-[#76B900]/90 leading-relaxed">
              <strong className="text-[#76B900]">AI powered by server NVIDIA NIM</strong> — only your Firecrawl key is needed to search. GitHub Models and NVIDIA keys are optional upgrades.
            </p>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className={`mx-6 mt-4 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-manrope ${toast.type === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/15 border border-red-500/30 text-red-300'
            }`}>
            {toast.type === 'success'
              ? <CheckCircle2 className="w-4 h-4 shrink-0" />
              : <AlertCircle className="w-4 h-4 shrink-0" />}
            {toast.msg}
          </div>
        )}

        {/* Status badges */}
        <div className="mx-6 mt-4 grid grid-cols-3 gap-2">
          <StatusBadge label="Firecrawl"     active={hasFirecrawl} required />
          <StatusBadge label="GitHub Models" active={hasGithub}    hint="AI (optional)" />
          <StatusBadge label="NVIDIA NIM"    active={hasNvidia}
            status={nvidiaStatus === 'invalid' ? 'invalid' : hasNvidia ? 'valid' : 'unset'}
            hint="AI (optional)" />
        </div>
        {/* Requirement note */}
        {!hasFirecrawl && (
          <p className="mx-6 mt-2 font-manrope text-[11px] text-amber-400">
            Firecrawl key required · add GitHub Models or NVIDIA NIM for AI
          </p>
        )}

        {/* Inputs */}
        <div className="px-6 py-4 space-y-4">
          <KeyInput
            label="Firecrawl API Key"
            required
            linkText="Get free key →"
            linkHref="https://firecrawl.dev"
            placeholder="fc-xxxxxxxxxxxxxxxxxxxx"
            value={firecrawlKey}
            onChange={setFirecrawlKey}
            show={showFirecrawl}
            onToggleShow={() => setShowFirecrawl(v => !v)}
          />

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="font-space-mono text-[10px] text-white/30 uppercase tracking-widest">Choose AI provider</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <KeyInput
            label="GitHub Models API Key"
            required={false}
            badge={<span className="font-manrope text-[10px] text-white/30">free · use alone or with NVIDIA</span>}
            linkText="Get free key →"
            linkHref="https://github.com/marketplace/models"
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            value={githubKey}
            onChange={setGithubKey}
            show={showGithub}
            onToggleShow={() => setShowGithub(v => !v)}
          />

          <KeyInput
            label="NVIDIA NIM API Key"
            required={false}
            badge={<span className="flex items-center gap-1 text-[#76B900] font-manrope text-[10px] font-semibold"><Zap className="w-3 h-3" />40 rpm · better reasoning</span>}
            linkText="Get free key →"
            linkHref="https://build.nvidia.com/models"
            placeholder="nvapi-xxxxxxxxxxxxxxxxxxxx"
            value={nvidiaKey}
            onChange={v => { setNvidiaKey(v); setNvidiaStatus('untested'); }}
            show={showNvidia}
            onToggleShow={() => setShowNvidia(v => !v)}
          />
        </div>

        {/* Note */}
        <div className="mx-6 mb-4 flex items-start gap-2 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-[#D4755B] shrink-0 mt-0.5" />
          <p className="font-manrope text-xs text-white/50 leading-relaxed">
            Keys are stored only in <strong className="text-white/70">this browser</strong>. The NVIDIA key activates higher rate limits (40 rpm) and uses nemotron-ultra for deeper property analysis.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 px-6 pb-6">
          <button
            onClick={handleSave}
            disabled={saving || (!githubKey.trim() && !firecrawlKey.trim() && !nvidiaKey.trim())}
            className="flex-1 flex items-center justify-center gap-2 bg-[#D4755B] hover:bg-[#C05621] disabled:opacity-40 disabled:cursor-not-allowed text-white font-manrope font-semibold text-sm py-3 rounded-xl transition-all"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Verifying Keys...' : 'Save Keys'}
          </button>

          {(hasGithub || hasFirecrawl || hasNvidia) && (
            <button
              onClick={handleClear}
              className="flex items-center gap-2 bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 text-red-400 font-manrope font-semibold text-sm py-3 px-5 rounded-xl transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Remove All
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Sub-components ─────────────────────────────────────── */

const StatusBadge: React.FC<{
  label: string;
  active: boolean;
  required?: boolean;
  hint?: string;
  status?: 'valid' | 'invalid' | 'unset';
}> = ({ label, active, required, hint, status }) => {
  const isInvalid = status === 'invalid';
  const subLabel  = isInvalid ? '✗ invalid' : active ? '✓ set' : required ? 'required' : hint ?? 'optional';
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border ${
      isInvalid ? 'bg-red-500/10 border-red-500/30'
      : active   ? 'bg-emerald-500/10 border-emerald-500/30'
                 : 'bg-white/[0.04] border-white/10'
    }`}>
      {isInvalid
        ? <AlertCircle  className="w-3.5 h-3.5 text-red-400 shrink-0" />
        : active
          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          : <AlertCircle  className="w-3.5 h-3.5 text-white/30 shrink-0" />}
      <div className="min-w-0">
        <p className={`font-manrope text-[10px] truncate ${isInvalid ? 'text-red-300' : active ? 'text-emerald-300' : 'text-white/40'}`}>
          {label}
        </p>
        <p className={`font-space-mono text-[9px] ${isInvalid ? 'text-red-400' : active ? 'text-emerald-400' : 'text-white/25'}`}>
          {subLabel}
        </p>
      </div>
    </div>
  );
};

interface KeyInputProps {
  label: string;
  required?: boolean;
  badge?: React.ReactNode;
  linkText: string;
  linkHref: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
}

const KeyInput: React.FC<KeyInputProps> = ({
  label, required, badge, linkText, linkHref, placeholder, value, onChange, show, onToggleShow
}) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <div className="flex items-center gap-2">
        <label className="font-space-mono text-[10px] text-white/50 uppercase tracking-widest">{label}</label>
        {required && <span className="font-manrope text-[9px] text-[#D4755B]/70 uppercase">required</span>}
        {badge}
      </div>
      <a href={linkHref} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1 font-manrope text-[11px] text-[#D4755B] hover:text-[#e88a6f] transition-colors">
        {linkText} <ExternalLink className="w-3 h-3" />
      </a>
    </div>
    <div className="relative bg-white/[0.07] border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3 focus-within:border-[#D4755B]/50 transition-all">
      <Key className="w-4 h-4 text-[#D4755B]/60 shrink-0" />
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent font-space-mono text-xs text-white outline-none placeholder:text-white/20"
        autoComplete="off"
      />
      <button type="button" onClick={onToggleShow} className="text-white/30 hover:text-white/70 transition-colors">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  </div>
);

export default AIApiKeyModal;
