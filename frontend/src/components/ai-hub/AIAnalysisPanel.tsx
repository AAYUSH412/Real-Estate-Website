import React, { useMemo } from 'react';
import {
  Brain,
  Lightbulb,
  ChevronRight,
  Trophy,
  AlertCircle,
} from 'lucide-react';
import type { PropertyAnalysis } from '../../pages/AIPropertyHubPage';

interface Props {
  analysis: PropertyAnalysis | null;
  loading: boolean;
  error: string | null;
  city: string;
}

const AIAnalysisPanel: React.FC<Props> = ({ analysis, loading, error, city }) => {
  /* ── Verdict count summary ─────────────────────────── */
  const verdictCounts = useMemo(() => {
    const counts = { good_deal: 0, fair: 0, overpriced: 0 };
    analysis?.overview?.forEach(item => {
      if (item.value_verdict && item.value_verdict in counts) {
        counts[item.value_verdict as keyof typeof counts]++;
      }
    });
    return counts;
  }, [analysis]);

  const hasVerdicts =
    verdictCounts.good_deal > 0 ||
    verdictCounts.fair > 0 ||
    verdictCounts.overpriced > 0;

  /* ── Loading skeleton ──────────────────────────────── */
  if (loading) {
    return (
      <div className="bg-white border border-[#E6E0DA] rounded-2xl p-6 space-y-5 animate-pulse">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#E6E0DA]/60 rounded-full shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-5 bg-[#E6E0DA]/60 rounded w-3/4" />
            <div className="h-3.5 bg-[#E6E0DA]/40 rounded w-full" />
          </div>
        </div>
        {/* Verdict pills */}
        <div className="flex gap-2">
          <div className="h-6 w-24 bg-[#E6E0DA]/40 rounded-full" />
          <div className="h-6 w-20 bg-[#E6E0DA]/40 rounded-full" />
        </div>
        {/* Best value block */}
        <div className="h-28 bg-[#E6E0DA]/30 rounded-xl" />
        {/* Recs */}
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-5 h-5 bg-[#E6E0DA]/50 rounded-full shrink-0" />
              <div className="h-4 bg-[#E6E0DA]/40 rounded flex-1" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !analysis) return null;

  return (
    <div className="bg-white border border-[#E6E0DA] rounded-2xl p-6 space-y-5 mt-15">
      {/* ── Header ───────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-[#D4755B]/10 border border-[#D4755B]/20 rounded-full flex items-center justify-center shrink-0">
          <Brain className="w-4 h-4 text-[#D4755B]" />
        </div>
        <div>
          <h2 className="font-syne text-base font-bold text-[#221410] leading-tight">
            AI Market Analysis
          </h2>
          <p className="font-manrope text-[12px] text-[#9CA3AF] leading-tight mt-0.5">
            {city}
          </p>
        </div>
      </div>

      {/* ── Partial error banner ─────────────────────── */}
      {analysis.error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="font-manrope text-xs text-amber-700">{analysis.error}</p>
        </div>
      )}

      {/* ── Verdict count summary ─────────────────────── */}
      {hasVerdicts && (
        <div className="flex flex-wrap gap-1.5">
          {verdictCounts.good_deal > 0 && (
            <span className="font-space-mono text-[10px] font-bold px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
              🟢 Good Deal: {verdictCounts.good_deal}
            </span>
          )}
          {verdictCounts.fair > 0 && (
            <span className="font-space-mono text-[10px] font-bold px-2.5 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
              🟡 Fair: {verdictCounts.fair}
            </span>
          )}
          {verdictCounts.overpriced > 0 && (
            <span className="font-space-mono text-[10px] font-bold px-2.5 py-1 rounded-full border bg-red-50 text-red-600 border-red-200">
              🔴 Overpriced: {verdictCounts.overpriced}
            </span>
          )}
        </div>
      )}

      {/* ── Best value pick ───────────────────────────── */}
      {analysis.best_value && (
        <div className="relative bg-gradient-to-br from-[#221410] via-[#3d2519] to-[#221410] overflow-hidden rounded-xl p-5 flex flex-col gap-3 shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4755B]/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-2.5 relative z-10">
            <div className="w-8 h-8 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4 text-[#D4755B]" />
            </div>
            <span className="font-space-mono text-[10px] text-[#D4755B] uppercase tracking-widest font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4755B] animate-pulse inline-block" />
              Best Value Pick
            </span>
          </div>

          <div className="relative z-10">
            <h4 className="font-syne text-lg font-bold text-white leading-snug mb-1.5">
              {analysis.best_value.name}
            </h4>
            <p className="font-manrope text-[13px] text-white/75 leading-relaxed">
              {analysis.best_value.reason}
            </p>
          </div>
        </div>
      )}

      {/* ── Recommendations ──────────────────────────── */}
      {analysis.recommendations?.length > 0 && (
        <div className="bg-[#FAF8F4] border border-[#E6E0DA] rounded-xl p-5">
          <h3 className="font-syne text-sm font-bold text-[#221410] mb-3 flex items-center gap-2 pb-3 border-b border-[#E6E0DA]/60">
            <Lightbulb className="w-4 h-4 text-[#D4755B] shrink-0" />
            Strategic Recommendations
          </h3>

          <ul className="flex flex-col gap-2">
            {analysis.recommendations.map((rec, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 bg-white border border-[#E6E0DA]/50 rounded-lg p-3"
              >
                <div className="mt-0.5 bg-[#FAF8F4] p-1 rounded-full border border-[#E6E0DA] shrink-0">
                  <ChevronRight className="w-3 h-3 text-[#D4755B]" />
                </div>
                <span className="font-manrope text-[13px] font-medium text-[#4B5563] leading-relaxed">
                  {rec}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AIAnalysisPanel;
