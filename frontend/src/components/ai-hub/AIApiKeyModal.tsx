import React, { useState, useEffect } from 'react';
import { X, Key, Eye, EyeOff, CheckCircle2, AlertCircle, ExternalLink, Trash2, Save } from 'lucide-react';
import { apiKeyStorage } from '../../services/api';

interface AIApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeysChanged: () => void;
}

const AIApiKeyModal: React.FC<AIApiKeyModalProps> = ({ isOpen, onClose, onKeysChanged }) => {
  const [githubKey, setGithubKey] = useState('');
  const [firecrawlKey, setFirecrawlKey] = useState('');
  const [showGithub, setShowGithub] = useState(false);
  const [showFirecrawl, setShowFirecrawl] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const hasGithub = !!apiKeyStorage.getGithubKey();
  const hasFirecrawl = !!apiKeyStorage.getFirecrawlKey();

  useEffect(() => {
    if (!isOpen) {
      setGithubKey('');
      setFirecrawlKey('');
      setToast(null);
    }
  }, [isOpen]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSave = () => {
    if (!githubKey.trim() && !firecrawlKey.trim()) {
      showToast('error', 'Enter at least one key to save.');
      return;
    }

    // P2-3: Lightweight format validation
    if (githubKey.trim()) {
      const ghk = githubKey.trim();
      if (!ghk.startsWith('ghp_') && !ghk.startsWith('github_pat_')) {
        showToast('error', 'GitHub key should start with ghp_ or github_pat_');
        return;
      }
      apiKeyStorage.setGithubKey(ghk);
    }
    if (firecrawlKey.trim()) {
      if (!firecrawlKey.trim().startsWith('fc-')) {
        showToast('error', 'Firecrawl key should start with fc-');
        return;
      }
      apiKeyStorage.setFirecrawlKey(firecrawlKey.trim());
    }

    setGithubKey('');
    setFirecrawlKey('');
    showToast('success', 'Keys saved! They are stored only in your browser.');
    onKeysChanged();
  };

  const handleClear = () => {
    apiKeyStorage.clear();
    showToast('success', 'Keys removed.');
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
        <div className="mx-6 mt-4 grid grid-cols-2 gap-3">
          <StatusBadge label="GitHub Models" active={hasGithub} />
          <StatusBadge label="Firecrawl" active={hasFirecrawl} />
        </div>

        {/* Inputs */}
        <div className="px-6 py-4 space-y-4">
          <KeyInput
            label="GitHub Models API Key"
            linkText="Get free key →"
            linkHref="https://github.com/marketplace/models"
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            value={githubKey}
            onChange={setGithubKey}
            show={showGithub}
            onToggleShow={() => setShowGithub(v => !v)}
          />
          <KeyInput
            label="Firecrawl API Key"
            linkText="Get free key →"
            linkHref="https://firecrawl.dev"
            placeholder="fc-xxxxxxxxxxxxxxxxxxxx"
            value={firecrawlKey}
            onChange={setFirecrawlKey}
            show={showFirecrawl}
            onToggleShow={() => setShowFirecrawl(v => !v)}
          />
        </div>

        {/* Note */}
        <div className="mx-6 mb-4 flex items-start gap-2 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-[#D4755B] shrink-0 mt-0.5" />
          <p className="font-manrope text-xs text-white/50 leading-relaxed">
            Your keys are stored only in <strong className="text-white/70">this browser</strong>. They are sent directly to our backend with each request and used only to call the AI services on your behalf.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 px-6 pb-6">
          <button
            onClick={handleSave}
            disabled={!githubKey.trim() && !firecrawlKey.trim()}
            className="flex-1 flex items-center justify-center gap-2 bg-[#D4755B] hover:bg-[#C05621] disabled:opacity-40 disabled:cursor-not-allowed text-white font-manrope font-semibold text-sm py-3 rounded-xl transition-all"
          >
            <Save className="w-4 h-4" />
            Save Keys
          </button>

          {(hasGithub || hasFirecrawl) && (
            <button
              onClick={handleClear}
              className="flex items-center gap-2 bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 text-red-400 font-manrope font-semibold text-sm py-3 px-5 rounded-xl transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Sub-components ─────────────────────────────────────── */

const StatusBadge: React.FC<{ label: string; active: boolean }> = ({ label, active }) => (
  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${active ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/[0.04] border-white/10'
    }`}>
    {active
      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      : <AlertCircle className="w-3.5 h-3.5 text-white/30 shrink-0" />}
    <span className={`font-manrope text-xs ${active ? 'text-emerald-300' : 'text-white/40'}`}>{label}</span>
    <span className={`ml-auto font-space-mono text-[10px] ${active ? 'text-emerald-400' : 'text-white/30'}`}>
      {active ? '✓ set' : 'not set'}
    </span>
  </div>
);

interface KeyInputProps {
  label: string; linkText: string; linkHref: string;
  placeholder: string; value: string; onChange: (v: string) => void;
  show: boolean; onToggleShow: () => void;
}

const KeyInput: React.FC<KeyInputProps> = ({
  label, linkText, linkHref, placeholder, value, onChange, show, onToggleShow
}) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <label className="font-space-mono text-[10px] text-white/50 uppercase tracking-widest">{label}</label>
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
