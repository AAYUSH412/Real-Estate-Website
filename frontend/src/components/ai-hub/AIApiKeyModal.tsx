import React, { useState, useEffect } from 'react';
import { X, Key, Eye, EyeOff, CheckCircle2, AlertCircle, ExternalLink, Trash2, Save } from 'lucide-react';
import { aiAPI, apiKeyStorage } from '../../services/api';

interface AIApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeysChanged: () => void;
}

const AIApiKeyModal: React.FC<AIApiKeyModalProps> = ({ isOpen, onClose, onKeysChanged }) => {
  const [firecrawlKey, setFirecrawlKey] = useState('');
  const [showFirecrawl, setShowFirecrawl] = useState(false);
  const [toast,  setToast]  = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const hasFirecrawl = !!apiKeyStorage.getFirecrawlKey();

  useEffect(() => {
    if (!isOpen) {
      setFirecrawlKey('');
      setToast(null);
    }
  }, [isOpen]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSave = async () => {
    const entered = firecrawlKey.trim();

    if (!entered) {
      showToast('error', 'Enter your Firecrawl API key to save.');
      return;
    }
    if (!entered.startsWith('fc-')) {
      showToast('error', 'Firecrawl key should start with fc-');
      return;
    }

    setSaving(true);
    try {
      await aiAPI.validateKeys({ firecrawlKey: entered });
      apiKeyStorage.setFirecrawlKey(entered);
      setFirecrawlKey('');
      showToast('success', 'Firecrawl key verified and saved!');
      onKeysChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Could not verify key. Please check and try again.';
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    apiKeyStorage.clear();
    showToast('success', 'Key removed.');
    onKeysChanged();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#1a0f0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#D4755B]/20 rounded-xl flex items-center justify-center">
              <Key className="w-4 h-4 text-[#D4755B]" />
            </div>
            <div>
              <h2 className="font-syne font-bold text-white text-lg">Firecrawl API Key</h2>
              <p className="font-manrope text-xs text-white/40">Saved in your browser only — never sent to our servers.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-[color]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Server AI notice */}
        <div className="mx-6 mt-4 flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="font-manrope text-xs text-emerald-300/90 leading-relaxed">
            <strong className="text-emerald-300">AI is powered by our servers</strong> — you only need a free Firecrawl key to enable live property scraping.
          </p>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`mx-6 mt-4 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-manrope ${
            toast.type === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/15 border border-red-500/30 text-red-300'
          }`}>
            {toast.type === 'success'
              ? <CheckCircle2 className="w-4 h-4 shrink-0" />
              : <AlertCircle  className="w-4 h-4 shrink-0" />}
            {toast.msg}
          </div>
        )}

        {/* Status badge */}
        <div className="mx-6 mt-4">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border w-fit ${
            hasFirecrawl
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-white/[0.04] border-white/10'
          }`}>
            {hasFirecrawl
              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              : <AlertCircle  className="w-3.5 h-3.5 text-amber-400" />}
            <span className={`font-manrope text-xs ${hasFirecrawl ? 'text-emerald-300' : 'text-amber-300'}`}>
              {hasFirecrawl ? 'Firecrawl key active ✓' : 'Firecrawl key required'}
            </span>
          </div>
        </div>

        {/* Input */}
        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <label className="font-space-mono text-[10px] text-white/50 uppercase tracking-widest">
                Firecrawl API Key
              </label>
              <span className="font-manrope text-[9px] text-[#D4755B]/70 uppercase">required</span>
            </div>
            <a
              href="https://firecrawl.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-manrope text-[11px] text-[#D4755B] hover:text-[#e88a6f] transition-[color]"
            >
              Get free key → <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="relative bg-white/[0.07] border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3 focus-within:border-[#D4755B]/50 transition-all">
            <Key className="w-4 h-4 text-[#D4755B]/60 shrink-0" />
            <input
              type={showFirecrawl ? 'text' : 'password'}
              value={firecrawlKey}
              onChange={e => setFirecrawlKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="fc-xxxxxxxxxxxxxxxxxxxx"
              className="flex-1 bg-transparent font-space-mono text-xs text-white outline-none placeholder:text-white/20"
              autoComplete="off"
            />
            <button type="button" onClick={() => setShowFirecrawl(v => !v)} className="text-white/30 hover:text-white/70 transition-[color]">
              {showFirecrawl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="mt-2 font-manrope text-[11px] text-white/30 leading-relaxed">
            Free tier includes 500 scrape credits/month — enough for ~80 property searches.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 px-6 pb-6">
          <button
            onClick={handleSave}
            disabled={saving || !firecrawlKey.trim()}
            className="flex-1 flex items-center justify-center gap-2 bg-[#D4755B] hover:bg-[#C05621] disabled:opacity-40 disabled:cursor-not-allowed text-white font-manrope font-semibold text-sm py-3 rounded-xl transition-all"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Verifying...' : 'Save Key'}
          </button>

          {hasFirecrawl && (
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

export default AIApiKeyModal;
