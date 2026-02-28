import React from 'react';
import {
  Brain,
  Star,
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
  /* Loading skeleton (Modern pulsing state) */
  if (loading) {
    return (
      <section className="bg-white py-20 relative border-t border-[#E6E0DA]/50">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FAF8F4] to-transparent pointer-events-none" />
        <div className="max-w-[1200px] mx-auto px-6 relative z-10 animate-pulse">
          {/* Header Skeleton */}
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-[#E6E0DA]/60 rounded-full" />
            <div className="space-y-2">
              <div className="h-7 bg-[#E6E0DA]/60 rounded-lg w-48" />
              <div className="h-4 bg-[#E6E0DA]/40 rounded w-64" />
            </div>
          </div>

          {/* Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#FAF8F4]/80 border border-[#E6E0DA]/60 rounded-2xl p-6 h-48">
                <div className="h-5 bg-[#E6E0DA]/80 rounded w-3/4 mb-6" />
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <div className="h-4 bg-[#E6E0DA]/50 rounded w-16" />
                    <div className="h-4 bg-[#E6E0DA]/80 rounded w-20" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-4 bg-[#E6E0DA]/50 rounded w-16" />
                    <div className="h-4 bg-[#E6E0DA]/80 rounded w-24" />
                  </div>
                </div>
                <div className="h-8 bg-[#D4755B]/10 rounded-lg w-full" />
              </div>
            ))}
          </div>

          {/* Banner Skeleton */}
          <div className="h-32 bg-[#E6E0DA]/40 rounded-2xl" />
        </div>
      </section>
    );
  }

  if (error || !analysis) return null;

  return (
    <section className="bg-white py-20 border-t border-[#E6E0DA]/50 relative">
      <div className="absolute top-0 inset-x-0 h-[400px] bg-gradient-to-b from-[#FAF8F4] to-transparent pointer-events-none" />

      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        {/* ── Header ─────────────────────────────── */}
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 bg-white border border-[#E6E0DA] shadow-sm rounded-full flex items-center justify-center relative">
            <div className="absolute inset-0 bg-[#D4755B]/5 rounded-full" />
            <Brain className="w-5 h-5 text-[#D4755B] relative z-10" />
          </div>
          <div>
            <h2 className="font-syne text-3xl font-bold text-[#221410] mb-1">AI Market Analysis</h2>
            <p className="font-manrope text-[15px] text-[#6B7280]">
              Powered by Advanced AI — Tailored insights for {city}
            </p>
          </div>
        </div>

        {/* Partial error banner */}
        {analysis.error && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="font-manrope text-sm text-amber-700">
              {analysis.error}
            </p>
          </div>
        )}

        {/* ── Overview cards ─────────────────────── */}
        {analysis.overview?.length > 0 && (
          <div className="mb-12">
            <h3 className="font-syne text-xl font-bold text-[#221410] mb-6 flex items-center gap-2.5">
              <Star className="w-5 h-5 text-[#D4755B]" />
              Property Overview
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {analysis.overview.map((item, i) => (
                <div
                  key={i}
                  className="bg-white border border-[#E6E0DA] rounded-2xl p-6 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(212,117,91,0.12)] hover:-translate-y-1 hover:border-[#D4755B]/40 transition-all duration-300"
                >
                  <h4 className="font-syne text-lg font-bold text-[#221410] mb-4 line-clamp-1">
                    {item.name}
                  </h4>

                  <div className="space-y-3 mb-5">
                    <div className="flex items-center justify-between border-b border-[#E6E0DA]/40 pb-2">
                      <span className="font-space-mono text-[11px] font-bold tracking-widest uppercase text-[#9CA3AF]">
                        Price
                      </span>
                      <span className="font-manrope text-[15px] font-bold text-[#221410]">
                        {item.price}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-[#E6E0DA]/40 pb-2">
                      <span className="font-space-mono text-[11px] font-bold tracking-widest uppercase text-[#9CA3AF]">
                        Area
                      </span>
                      <span className="font-manrope text-[15px] font-medium text-[#4B5563]">
                        {item.area}
                      </span>
                    </div>
                    <div className="flex justify-between items-start pt-1">
                      <span className="font-space-mono text-[11px] font-bold tracking-widest uppercase text-[#9CA3AF] mt-1 shrink-0">
                        Location
                      </span>
                      <span className="font-manrope text-[14px] text-[#4B5563] text-right font-medium max-w-[65%] line-clamp-2">
                        {item.location}
                      </span>
                    </div>
                  </div>

                  {/* Highlight */}
                  <div className="bg-[#FAF8F4] border border-[#D4755B]/20 rounded-xl px-4 py-3">
                    <p className="font-manrope text-[13px] text-[#C05621] font-medium flex items-start gap-2 leading-snug">
                      <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-[#D4755B]" />
                      <span className="line-clamp-3">{item.highlight}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Best value pick ────────────────────── */}
        {analysis.best_value && (
          <div className="relative bg-gradient-to-br from-[#221410] via-[#3d2519] to-[#221410] overflow-hidden rounded-2xl p-8 lg:p-10 mb-12 flex flex-col md:flex-row items-start gap-6 shadow-xl">
            {/* Background flourish */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4755B]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="w-16 h-16 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center shrink-0 relative z-10 shadow-lg">
              <Trophy className="w-8 h-8 text-[#D4755B]" />
            </div>

            <div className="relative z-10 font-manrope">
              <div className="inline-flex items-center gap-2 font-space-mono text-[11px] text-[#D4755B] uppercase tracking-widest font-bold mb-3">
                <div className="w-2 h-2 rounded-full bg-[#D4755B] animate-pulse" />
                Best Value Pick
              </div>
              <h4 className="font-syne text-3xl font-bold text-white mb-3">
                {analysis.best_value.name}
              </h4>
              <p className="text-lg text-white/80 font-light leading-relaxed max-w-[800px]">
                {analysis.best_value.reason}
              </p>
            </div>
          </div>
        )}

        {/* ── Recommendations ────────────────────── */}
        {analysis.recommendations?.length > 0 && (
          <div className="bg-[#FAF8F4] border border-[#E6E0DA] rounded-2xl p-8 lg:p-10 shadow-sm relative overflow-hidden">
            {/* Soft background shape */}
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-white rounded-full blur-3xl pointer-events-none" />

            <h3 className="relative z-10 font-syne text-2xl font-bold text-[#221410] mb-6 flex items-center gap-3 border-b border-[#E6E0DA]/50 pb-5">
              <Lightbulb className="w-6 h-6 text-[#D4755B]" />
              Strategic Recommendations
            </h3>

            <ul className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {analysis.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-3 bg-white border border-[#E6E0DA]/50 rounded-xl p-4 shadow-[0_2px_8px_rgb(0,0,0,0.02)]">
                  <div className="mt-0.5 bg-[#FAF8F4] p-1.5 rounded-full border border-[#E6E0DA] shrink-0">
                    <ChevronRight className="w-3.5 h-3.5 text-[#D4755B]" />
                  </div>
                  <span className="font-manrope text-[15px] font-medium text-[#4B5563] leading-relaxed">
                    {rec}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
};

export default AIAnalysisPanel;
