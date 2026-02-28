import React from 'react';
import {
  TrendingUp,
  MapPin,
  ArrowUpRight,
  Loader2,
  AlertCircle,
  ChevronRight,
  BarChart3,
} from 'lucide-react';
import type { LocationData, LocationAnalysis } from '../../pages/AIPropertyHubPage';

interface Props {
  locations: LocationData[];
  analysis: LocationAnalysis | null;
  loading: boolean;
  error: string | null;
  city: string;
}

const AILocationTrends: React.FC<Props> = ({
  locations,
  analysis,
  loading,
  error,
  city,
}) => {
  /* Loading skeleton (Modern pulsing state) */
  if (loading) {
    return (
      <section className="bg-white py-20 relative border-t border-[#E6E0DA]/50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,117,91,0.02)_0%,transparent_100%)] pointer-events-none" />
        <div className="max-w-[1200px] mx-auto px-6 relative z-10 text-center animate-pulse">
          <div className="inline-flex items-center gap-3 bg-[#FAF8F4] border border-[#E6E0DA] shadow-sm rounded-full px-5 py-2.5 mb-8">
            <div className="w-2 h-2 rounded-full bg-[#D4755B] animate-ping" />
            <span className="font-space-mono text-xs text-[#6B7280] font-bold uppercase tracking-wider">
              AI is analyzing {city} trends...
            </span>
          </div>

          <div className="max-w-[800px] mx-auto space-y-4 pt-4">
            <div className="h-16 bg-[#FAF8F4] border border-[#E6E0DA]/60 rounded-xl" />
            <div className="h-16 bg-[#FAF8F4] border border-[#E6E0DA]/60 rounded-xl" />
            <div className="h-16 bg-[#FAF8F4] border border-[#E6E0DA]/60 rounded-xl" />
          </div>
        </div>
      </section>
    );
  }

  /* Error */
  if (error) {
    return (
      <section className="bg-[#FAF8F4] py-16">
        <div className="max-w-[600px] mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 text-amber-600 mb-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-manrope text-sm font-medium">
              Trends Unavailable
            </span>
          </div>
          <p className="font-manrope font-light text-sm text-[#6b7280]">
            {error}
          </p>
        </div>
      </section>
    );
  }

  if (!locations.length && !analysis) return null;

  return (
    <section className="bg-[#FAF8F4] py-20 border-t border-[#E6E0DA]/50 relative">
      <div className="absolute top-0 inset-x-0 h-[400px] bg-gradient-to-b from-white to-transparent pointer-events-none" />

      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        {/* ── Header ─────────────────────────────── */}
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 bg-white border border-[#E6E0DA] shadow-sm rounded-full flex items-center justify-center relative">
            <div className="absolute inset-0 bg-[#D4755B]/5 rounded-full" />
            <BarChart3 className="w-5 h-5 text-[#D4755B] relative z-10" />
          </div>
          <div>
            <h2 className="font-syne text-3xl font-bold text-[#221410] mb-1">
              Location Trends — {city}
            </h2>
            <p className="font-manrope text-[15px] text-[#6B7280]">
              Market data from real listings analyzed by AI
            </p>
          </div>
        </div>

        {/* ── Raw location data table ────────────── */}
        {locations.length > 0 && (
          <div className="bg-white border border-[#E6E0DA] rounded-2xl overflow-hidden mb-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#FAF8F4] border-b border-[#E6E0DA]/70">
                    <th className="text-left font-space-mono text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] px-8 py-5">
                      Location
                    </th>
                    <th className="text-right font-space-mono text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] px-8 py-5">
                      Price / sq.ft
                    </th>
                    <th className="text-right font-space-mono text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] px-8 py-5">
                      YoY Change
                    </th>
                    <th className="text-right font-space-mono text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] px-8 py-5">
                      Rental Yield
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E0DA]/40">
                  {locations.map((loc, i) => (
                    <tr
                      key={i}
                      className="hover:bg-[#FAF8F4]/50 transition-colors group cursor-default"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-[#D4755B]/60 group-hover:text-[#D4755B] transition-colors" />
                          <span className="font-manrope text-[15px] text-[#221410] font-semibold">
                            {loc.location}
                          </span>
                        </div>
                      </td>
                      <td className="text-right px-8 py-5">
                        <span className="font-space-mono text-[15px] text-[#4B5563] font-medium">
                          ₹{loc.price_per_sqft ? Number(loc.price_per_sqft).toLocaleString('en-IN') : '—'}
                        </span>
                      </td>
                      <td className="text-right px-8 py-5">
                        {loc.percent_increase && Number(loc.percent_increase) !== 0 ? (
                          <span className="inline-flex items-center gap-1 font-space-mono text-[14px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md font-medium">
                            <ArrowUpRight className="w-4 h-4" />
                            {loc.percent_increase}%
                          </span>
                        ) : (
                          <span className="font-space-mono text-[15px] text-[#9CA3AF]">—</span>
                        )}
                      </td>
                      <td className="text-right px-8 py-5">
                        <span className="font-space-mono text-[15px] text-[#4B5563] font-medium">
                          {loc.rental_yield && Number(loc.rental_yield) !== 0
                            ? `${loc.rental_yield}%`
                            : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── AI Analysis ────────────────────────── */}
        {analysis && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Trend cards */}
            {analysis.trends?.length > 0 && (
              <div className="bg-white border border-[#E6E0DA] shadow-sm rounded-2xl p-8">
                <h3 className="font-syne text-xl font-bold text-[#221410] mb-6 flex items-center gap-2.5">
                  <TrendingUp className="w-5 h-5 text-[#D4755B]" />
                  AI Trend Analysis
                </h3>

                <div className="space-y-4">
                  {analysis.trends.map((trend, i) => {
                    const outlookLower = (trend.outlook || '').toLowerCase();
                    const isPositive =
                      outlookLower.includes('positive') ||
                      outlookLower.includes('good') ||
                      outlookLower.includes('bullish');
                    const isNegative =
                      outlookLower.includes('negative') ||
                      outlookLower.includes('declin');

                    return (
                      <div key={i} className="bg-[#FAF8F4] border border-[#E6E0DA]/60 rounded-xl p-5 hover:border-[#D4755B]/30 transition-colors">
                        <div className="flex items-start justify-between mb-4">
                          {/* Location name */}
                          <h4 className="font-syne text-[17px] font-bold text-[#221410]">
                            {trend.location}
                          </h4>

                          {/* Outlook badge */}
                          <span
                            className={`inline-block font-space-mono text-[11px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full ${isPositive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isNegative
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                          >
                            {trend.outlook || 'Stable'}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-white rounded-lg border border-[#E6E0DA]/50 p-3 text-center">
                            <span className="font-space-mono text-[10px] text-[#9CA3AF] font-bold uppercase tracking-widest block mb-1">
                              ₹/sq.ft
                            </span>
                            <span className="font-manrope font-semibold text-[#221410] text-[15px]">
                              {trend.price_per_sqft
                                ? `₹${Number(trend.price_per_sqft).toLocaleString('en-IN')}`
                                : '—'}
                            </span>
                          </div>
                          <div className="bg-white rounded-lg border border-[#E6E0DA]/50 p-3 text-center">
                            <span className="font-space-mono text-[10px] text-[#9CA3AF] font-bold uppercase tracking-widest block mb-1">
                              YoY
                            </span>
                            <span className={`font-manrope font-semibold text-[15px] ${trend.yearly_change_pct && Number(trend.yearly_change_pct) !== 0
                              ? 'text-emerald-600'
                              : 'text-[#9ca3af]'
                              }`}>
                              {trend.yearly_change_pct && Number(trend.yearly_change_pct) !== 0
                                ? `${trend.yearly_change_pct}%`
                                : '—'}
                            </span>
                          </div>
                          <div className="bg-white rounded-lg border border-[#E6E0DA]/50 p-3 text-center">
                            <span className="font-space-mono text-[10px] text-[#9CA3AF] font-bold uppercase tracking-widest block mb-1">
                              Yield
                            </span>
                            <span className="font-manrope font-semibold text-[#221410] text-[15px]">
                              {trend.rental_yield_pct && Number(trend.rental_yield_pct) !== 0
                                ? `${trend.rental_yield_pct}%`
                                : '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Highlights & Tips */}
            <div className="space-y-6">
              {/* Top Appreciation */}
              {analysis.top_appreciation && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-7 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="font-space-mono text-[11px] text-emerald-600 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4" /> Top Appreciation
                  </div>
                  <h4 className="font-syne text-[22px] font-bold text-emerald-900 mb-2 relative z-10">
                    {analysis.top_appreciation.location}
                  </h4>
                  <p className="font-manrope text-[15px] font-medium text-emerald-800/80 leading-relaxed relative z-10">
                    {analysis.top_appreciation.reason}
                  </p>
                </div>
              )}

              {/* Best Rental Yield */}
              {analysis.best_rental_yield && (
                <div className="bg-[#F0FDF4] border border-[#14B8A6]/20 rounded-2xl p-7 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#14B8A6]/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="font-space-mono text-[11px] text-[#0F766E] font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" /> Best Rental Yield
                  </div>
                  <h4 className="font-syne text-[22px] font-bold text-[#134E4A] mb-2 relative z-10">
                    {analysis.best_rental_yield.location}
                  </h4>
                  <p className="font-manrope text-[15px] font-medium text-[#134E4A]/80 leading-relaxed relative z-10">
                    {analysis.best_rental_yield.reason}
                  </p>
                </div>
              )}

              {/* Investment Tips */}
              {analysis.investment_tips?.length > 0 && (
                <div className="bg-white border border-[#E6E0DA] shadow-sm rounded-2xl p-7 relative overflow-hidden">
                  <h3 className="font-syne text-xl font-bold text-[#221410] mb-5">
                    Investment Tips
                  </h3>
                  <ul className="space-y-3">
                    {analysis.investment_tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="mt-1 bg-[#FAF8F4] p-1 rounded-full border border-[#E6E0DA] shrink-0">
                          <ChevronRight className="w-3 h-3 text-[#D4755B]" />
                        </div>
                        <span className="font-manrope font-medium text-[15px] text-[#4B5563] leading-relaxed">
                          {tip}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default AILocationTrends;
