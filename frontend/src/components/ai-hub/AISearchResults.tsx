import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Maximize, SearchX, Home, ExternalLink,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle,
  X, BarChart2, CheckCircle2, Compass, Building2,
  Sparkles, TrendingUp, Zap,
} from 'lucide-react';
import type { ScrapedProperty, PropertyAnalysis, PropertyOverview } from '../../pages/AIPropertyHubPage';

interface Props {
  properties: ScrapedProperty[];
  loading: boolean;
  statusMessage?: string;
  sseStage?: 'searching' | 'analyzing' | null;
  error: string | null;
  city: string;
  analysis?: PropertyAnalysis | null;
}

/* ── Source badge colours ────────────────────────────────── */
const SOURCE_META: Record<string, { label: string; cls: string }> = {
  '99acres':    { label: '99acres',     cls: 'bg-orange-50  text-orange-600  border-orange-200'  },
  magicbricks:  { label: 'MagicBricks', cls: 'bg-purple-50  text-purple-600  border-purple-200'  },
  housing:      { label: 'Housing.com', cls: 'bg-teal-50    text-teal-700    border-teal-200'    },
  nobroker:     { label: 'NoBroker',    cls: 'bg-green-50   text-green-700   border-green-200'   },
};

/* ── Value verdict ───────────────────────────────────────── */
const VERDICT_META = {
  good_deal:  { label: 'Good Deal',  icon: '🟢', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  fair:       { label: 'Fair Price', icon: '🟡', cls: 'bg-amber-50   text-amber-700   border-amber-200'   },
  overpriced: { label: 'Overpriced', icon: '🔴', cls: 'bg-red-50     text-red-600     border-red-200'     },
} as const;

/* ── Known builders for verified badge ──────────────────── */
const KNOWN_BUILDERS = [
  'godrej', 'lodha', 'prestige', 'tata', 'sobha', 'dlf', 'oberoi',
  'hiranandani', 'mahindra', 'brigade', 'phoenix', 'shapoorji', 'embassy',
];

/* ── Comparison table rows ───────────────────────────────── */
const COMPARE_ROWS = [
  { key: 'price',             label: 'Price'       },
  { key: 'price_per_sqft',    label: 'Per sqft'    },
  { key: 'area_sqft',         label: 'Carpet area' },
  { key: 'floor',             label: 'Floor'       },
  { key: 'possession_status', label: 'Possession'  },
  { key: 'facing_direction',  label: 'Facing'      },
  { key: 'parking',           label: 'Parking'     },
  { key: 'rera_number',       label: 'RERA'        },
  { key: 'builder_name',      label: 'Builder'     },
  { key: 'amenities',         label: 'Amenities'   },
  { key: 'ai_verdict',        label: 'AI Verdict'  },
  { key: 'ai_insight',        label: 'AI Insight'  },
] as const;

/* ── Status stage messages ───────────────────────────────── */
const STAGE_LINES: Record<string, string[]> = {
  searching: [
    'Querying 99acres, MagicBricks, Housing.com...',
    'Fetching live listings from portals...',
    'Scraping property data in parallel...',
  ],
  analyzing: [
    'AI is reading each listing...',
    'Scoring value-for-money across properties...',
    'Ranking by match score and price efficiency...',
  ],
};

/* ── Property card ──────────────────────────────────────── */
const cardVariants = {
  hidden:  { opacity: 0, y: 20, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0,  filter: 'blur(0px)' },
};

const PropertyCard: React.FC<{
  property: ScrapedProperty;
  insight?: PropertyOverview;
  rank: number;
  isComparing: boolean;
  canCompare: boolean;
  onToggleCompare: () => void;
}> = ({ property, insight, rank, isComparing, canCompare, onToggleCompare }) => {
  const [showFlags, setShowFlags] = useState(false);

  const srcKey     = property.source?.toLowerCase() ?? '';
  const sourceMeta = SOURCE_META[srcKey] ?? {
    label: property.source || 'Portal',
    cls: 'bg-[#FAF8F4] text-[#9CA3AF] border-[#E6E0DA]',
  };
  const verdictMeta   = insight?.value_verdict ? VERDICT_META[insight.value_verdict] : null;
  const isVerified    = property.builder_name
    ? KNOWN_BUILDERS.some(b => property.builder_name!.toLowerCase().includes(b))
    : false;
  const redFlags      = insight?.red_flags ?? [];
  const hasMatchScore = insight?.match_score != null;
  const isBest        = rank === 1 && !!insight?.value_verdict;

  return (
    <div
      className={`
        bg-white rounded-2xl overflow-hidden flex flex-col relative
        transition-[box-shadow,transform] duration-200 ease-out
        hover:-translate-y-0.5
        ${isComparing
          ? 'shadow-[0_0_0_2px_#D4755B,0_8px_24px_-4px_rgba(212,117,91,0.2)]'
          : 'shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.08)] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_8px_24px_-4px_rgba(0,0,0,0.12)]'
        }
      `}
    >
      {/* Top gradient accent — stronger for #1 pick */}
      <div className={`absolute top-0 inset-x-0 h-0.5 ${isBest ? 'bg-gradient-to-r from-[#D4755B] via-amber-400 to-[#D4755B]' : 'bg-gradient-to-r from-[#D4755B]/40 to-amber-400/40'}`} />

      <div className="p-5 flex flex-col flex-1">

        {/* Row 1: rank + source + verdict */}
        <div className="flex items-center gap-2 mb-3.5">
          <span className="font-space-mono text-[10px] font-bold text-[#9CA3AF] tabular-nums">
            #{rank}
          </span>
          <span className={`font-space-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${sourceMeta.cls}`}>
            {sourceMeta.label}
          </span>
          <div className="flex-1" />
          {verdictMeta && (
            <span className={`font-space-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border flex items-center gap-1 ${verdictMeta.cls}`}>
              {verdictMeta.icon} {verdictMeta.label}
            </span>
          )}
        </div>

        {/* Building name */}
        <h3 className="font-syne text-[18px] font-bold text-[#221410] mb-0.5 leading-tight line-clamp-2 [text-wrap:balance]">
          {property.building_name || 'Premium Property'}
        </h3>

        {/* Builder + verified inline */}
        {property.builder_name && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <Building2 className="w-3 h-3 text-[#9CA3AF] shrink-0" />
            <span className="font-manrope text-[12px] text-[#6B7280]">
              by <span className="font-medium text-[#4B5563]">{property.builder_name}</span>
            </span>
            {isVerified && (
              <span className="font-manrope text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md ml-0.5">
                ★ Verified
              </span>
            )}
          </div>
        )}

        {/* Location */}
        <div className="flex items-center gap-1.5 mb-4">
          <MapPin className="w-3 h-3 text-[#D4755B]/60 shrink-0" />
          <span className="font-manrope text-[12px] text-[#6B7280] line-clamp-1">
            {property.location_address || 'Location not specified'}
          </span>
        </div>

        {/* Price box */}
        <div className="flex items-center justify-between bg-[#FAF8F4] rounded-xl px-4 py-3 mb-3 shadow-[0_0_0_1px_rgba(0,0,0,0.05)]">
          <div>
            <p className="font-space-mono text-[9px] text-[#9CA3AF] font-bold tracking-widest uppercase mb-0.5">Price</p>
            <p className="font-manrope font-extrabold text-[#D4755B] text-[20px] leading-none tabular-nums">
              {property.price || 'Contact for price'}
            </p>
          </div>
          {(property.price_per_sqft || property.area_sqft) && (
            <div className="text-right border-l border-[#E6E0DA] pl-3">
              {property.price_per_sqft && (
                <p className="font-manrope text-[13px] font-semibold text-[#4B5563] tabular-nums">
                  {property.price_per_sqft}
                </p>
              )}
              {property.area_sqft && (
                <p className="font-manrope text-[11px] text-[#9CA3AF] flex items-center gap-1 justify-end mt-0.5 tabular-nums">
                  <Maximize className="w-3 h-3" />
                  {property.area_sqft} sqft
                </p>
              )}
            </div>
          )}
        </div>

        {/* BHK + floor */}
        {(property.bhk_config || property.floor_number) && (
          <p className="font-manrope text-[12px] text-[#4B5563] mb-3 tabular-nums">
            {[
              property.bhk_config,
              property.floor_number
                ? property.total_floors
                  ? `Floor ${property.floor_number} of ${property.total_floors}`
                  : `Floor ${property.floor_number}`
                : null,
            ]
              .filter(Boolean)
              .join('  ·  ')}
          </p>
        )}

        {/* Trust chips — max 3 */}
        {(property.rera_number || property.possession_status || property.parking || property.facing_direction) && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {property.rera_number && (
              <span className="inline-flex items-center gap-1 font-manrope text-[11px] font-medium px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
                <CheckCircle className="w-3 h-3" /> RERA
              </span>
            )}
            {property.possession_status && (
              <span className="inline-flex items-center gap-1 font-manrope text-[11px] font-medium px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700">
                {property.possession_status}
              </span>
            )}
            {property.facing_direction && (
              <span className="inline-flex items-center gap-1 font-manrope text-[11px] font-medium px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-700">
                <Compass className="w-3 h-3" /> {property.facing_direction}
              </span>
            )}
            {!property.facing_direction && property.parking && property.parking.toLowerCase() !== 'none' && (
              <span className="inline-flex items-center gap-1 font-manrope text-[11px] font-medium px-2.5 py-1 rounded-lg bg-[#FAF8F4] border border-[#E6E0DA] text-[#4B5563]">
                P {property.parking}
              </span>
            )}
          </div>
        )}

        {/* AI insight block — hero section */}
        {insight?.one_line_insight && (
          <div className="relative bg-gradient-to-br from-[#FDF6F3] to-[#FAF4F0] border border-[#D4755B]/20 rounded-xl px-4 py-3 mb-3 overflow-hidden">
            <div className="absolute top-2 right-2">
              <Sparkles className="w-3.5 h-3.5 text-[#D4755B]/30" />
            </div>
            <p className="font-space-mono text-[9px] text-[#D4755B]/60 font-bold uppercase tracking-widest mb-1.5">
              AI Insight
            </p>
            <p className="font-manrope text-[12px] text-[#4B5563] leading-relaxed pr-4 [text-wrap:pretty]">
              &ldquo;{insight.one_line_insight}&rdquo;
            </p>
            {hasMatchScore && (
              <div className="flex items-center gap-2 mt-2.5">
                <div className="flex-1 h-1 bg-[#E6E0DA] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#D4755B] to-amber-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${insight.match_score}%` }}
                    transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                  />
                </div>
                <span className="font-space-mono text-[10px] text-[#9CA3AF] font-bold shrink-0 tabular-nums">
                  {insight.match_score}/100
                </span>
              </div>
            )}
          </div>
        )}

        {/* Red flags (collapsible) */}
        {redFlags.length > 0 && (
          <div className="mb-3">
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setShowFlags(f => !f); }}
              className="flex items-center gap-2 w-full text-left font-manrope text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 hover:bg-amber-100 transition-[background-color] active:scale-[0.98]"
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{redFlags.length} concern{redFlags.length > 1 ? 's' : ''}</span>
              {showFlags
                ? <ChevronUp className="w-3.5 h-3.5 ml-auto" />
                : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
            </button>
            <AnimatePresence>
              {showFlags && (
                <motion.ul
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="mt-1 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-1 overflow-hidden"
                >
                  {redFlags.map((flag, i) => {
                    const flagText = typeof flag === 'string' ? flag : flag?.flag || '';
                    const severity = typeof flag === 'object' ? flag?.severity : null;
                    const color = severity === 'critical' ? 'text-red-700' : 'text-amber-800';
                    return (
                      <li key={i} className={`font-manrope text-[11px] ${color} flex items-start gap-1.5`}>
                        <span className="shrink-0 mt-0.5">{severity === 'critical' ? '⚠' : '→'}</span>
                        {flagText}
                      </li>
                    );
                  })}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="flex-1" />

        {/* Action buttons */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-[#E6E0DA]/50">
          {property.property_url ? (
            <a
              href={property.property_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#D4755B] hover:bg-[#C05621] text-white font-manrope font-semibold text-sm py-2.5 rounded-xl transition-[background-color,box-shadow] duration-150 shadow-sm shadow-[#D4755B]/20 active:scale-[0.96]"
            >
              View Listing <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <span className="flex-1 inline-flex items-center justify-center bg-[#F3F0EC] text-[#9CA3AF] font-manrope font-semibold text-sm py-2.5 rounded-xl cursor-not-allowed">
              No link
            </span>
          )}
          <button
            type="button"
            onClick={onToggleCompare}
            disabled={!isComparing && !canCompare}
            className={`px-4 py-2.5 font-manrope font-semibold text-sm rounded-xl transition-[background-color,border-color,color] duration-150 border active:scale-[0.96] ${
              isComparing
                ? 'bg-[#D4755B] border-[#D4755B] text-white hover:bg-[#C05621]'
                : canCompare
                  ? 'border-[#E6E0DA] text-[#6B7280] hover:border-[#D4755B]/50 hover:text-[#D4755B]'
                  : 'border-[#E6E0DA]/50 text-[#C4C4C4] cursor-not-allowed opacity-50'
            }`}
          >
            {isComparing ? '✓ Added' : '+ Compare'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Comparison modal ───────────────────────────────────── */
const ComparisonModal: React.FC<{
  items: ScrapedProperty[];
  insightMap: Map<string, PropertyOverview>;
  onClose: () => void;
}> = ({ items, insightMap, onClose }) => {

  const getCellValue = (property: ScrapedProperty, key: string): React.ReactNode => {
    const insight = insightMap.get((property.building_name || '').toLowerCase().trim());
    switch (key) {
      case 'price':
        return <span className="font-bold text-[#D4755B] tabular-nums">{property.price || '—'}</span>;
      case 'price_per_sqft':
        return <span className="tabular-nums">{property.price_per_sqft || '—'}</span>;
      case 'area_sqft':
        return property.area_sqft ? <span className="tabular-nums">{property.area_sqft} sqft</span> : '—';
      case 'floor':
        return property.floor_number
          ? property.total_floors
            ? <span className="tabular-nums">{property.floor_number} / {property.total_floors}</span>
            : <span className="tabular-nums">{property.floor_number}</span>
          : '—';
      case 'possession_status':
        return property.possession_status || '—';
      case 'facing_direction':
        return property.facing_direction
          ? <span className="inline-flex items-center gap-1"><Compass className="w-3.5 h-3.5 text-sky-600" /> {property.facing_direction}</span>
          : <span className="text-[#C4C4C4]">—</span>;
      case 'parking':
        return property.parking && property.parking.toLowerCase() !== 'none'
          ? `${property.parking} ✓`
          : (property.parking || '—');
      case 'rera_number':
        return property.rera_number
          ? <span className="inline-flex items-center gap-1 text-emerald-600 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Yes</span>
          : <span className="text-[#C4C4C4]">—</span>;
      case 'builder_name':
        return property.builder_name || '—';
      case 'amenities':
        return property.amenities && property.amenities.length > 0
          ? <span className="text-[11px]">{property.amenities.slice(0, 3).join(', ')}{property.amenities.length > 3 && ` +${property.amenities.length - 3}`}</span>
          : <span className="text-[#C4C4C4]">—</span>;
      case 'ai_verdict': {
        const v = insight?.value_verdict;
        if (!v) return <span className="text-[#C4C4C4]">—</span>;
        const meta = VERDICT_META[v];
        return (
          <span className={`font-space-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${meta.cls}`}>
            {meta.icon} {meta.label}
          </span>
        );
      }
      case 'ai_insight':
        return insight?.one_line_insight
          ? <span className="italic text-[#6B7280] text-[11px]">&ldquo;{insight.one_line_insight}&rdquo;</span>
          : <span className="text-[#C4C4C4]">—</span>;
      default:
        return '—';
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-5xl max-h-[90vh] flex flex-col shadow-2xl"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0, filter: 'blur(4px)' }}
        transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6E0DA] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#FAF8F4] border border-[#E6E0DA] rounded-full flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-[#D4755B]" />
            </div>
            <h2 className="font-syne text-xl font-bold text-[#221410]">Compare Properties</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#FAF8F4] text-[#9CA3AF] hover:text-[#221410] transition-[background-color,color] active:scale-[0.96]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full border-collapse min-w-[480px]">
            <thead>
              <tr className="border-b-2 border-[#E6E0DA]">
                <th className="w-[140px] sm:w-[160px] bg-[#FAF8F4] px-4 py-4 sticky left-0 z-10 border-r border-[#E6E0DA]" />
                {items.map((p, i) => (
                  <th key={i} className="px-5 py-4 text-left min-w-[220px]">
                    <p className="font-syne font-bold text-[#221410] text-[15px] leading-tight">{p.building_name || 'Property'}</p>
                    <p className="font-manrope text-[12px] text-[#9CA3AF] mt-1 line-clamp-1">{p.location_address || ''}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map(({ key, label }, ri) => (
                <tr key={key} className={`border-b border-[#E6E0DA]/60 ${ri % 2 === 0 ? 'bg-white' : 'bg-[#FAF8F4]/40'}`}>
                  <td className="sticky left-0 z-10 px-4 py-3.5 border-r border-[#E6E0DA] bg-inherit">
                    <span className="font-space-mono text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider whitespace-nowrap">{label}</span>
                  </td>
                  {items.map((p, ci) => (
                    <td key={ci} className="px-5 py-3.5">
                      <span className="font-manrope text-[14px] text-[#4B5563]">{getCellValue(p, key)}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ── AI-style loading state ──────────────────────────────── */
const AILoadingState: React.FC<{ city: string; sseStage?: 'searching' | 'analyzing' | null; statusMessage?: string }> = ({
  city, sseStage, statusMessage,
}) => {
  const [lineIdx, setLineIdx] = useState(0);
  const stage = sseStage || 'searching';
  const lines = STAGE_LINES[stage] ?? STAGE_LINES.searching;

  React.useEffect(() => {
    setLineIdx(0);
    const interval = setInterval(() => {
      setLineIdx(i => (i + 1) % lines.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [stage, lines.length]);

  const displayMsg = statusMessage || lines[lineIdx];

  return (
    <div className="py-16">
      {/* Animated orb */}
      <div className="flex justify-center mb-10">
        <div className="relative w-20 h-20">
          {/* Outer pulse rings */}
          <div className="absolute inset-0 rounded-full bg-[#D4755B]/10 animate-ping" style={{ animationDuration: '1.8s' }} />
          <div className="absolute inset-2 rounded-full bg-[#D4755B]/15 animate-ping" style={{ animationDuration: '2.4s', animationDelay: '0.4s' }} />
          {/* Core orb */}
          <div className="absolute inset-4 rounded-full bg-gradient-to-br from-[#D4755B] to-amber-400 shadow-[0_0_24px_rgba(212,117,91,0.5)]" />
          {/* Inner shimmer */}
          <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-white/30 to-transparent" />
          {/* Icon */}
          <div className="absolute inset-4 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>

      {/* Stage label */}
      <div className="text-center mb-6">
        <AnimatePresence mode="wait">
          <motion.p
            key={stage}
            initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
            transition={{ duration: 0.25 }}
            className="font-space-mono text-[10px] text-[#D4755B] font-bold uppercase tracking-widest mb-2"
          >
            {stage === 'analyzing' ? 'AI Analysis' : 'Live Search'}
          </motion.p>
        </AnimatePresence>
        <h2 className="font-syne text-2xl font-bold text-[#221410] mb-1 [text-wrap:balance]">
          {stage === 'analyzing' ? 'AI is reviewing listings' : `Searching in ${city}`}
        </h2>
        <p className="font-manrope text-sm text-[#6B7280]">This takes about 25–35 seconds. Stay on this page.</p>
      </div>

      {/* Streaming status messages */}
      <div className="max-w-sm mx-auto bg-white rounded-2xl shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_4px_12px_-2px_rgba(0,0,0,0.08)] overflow-hidden">
        {/* Terminal header */}
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[#E6E0DA] bg-[#FAF8F4]">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="font-space-mono text-[10px] text-[#9CA3AF] ml-2 uppercase tracking-wider">AI Agent</span>
        </div>
        {/* Log lines */}
        <div className="px-4 py-4 space-y-2.5">
          {/* Completed phases */}
          {stage === 'analyzing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-start gap-2.5"
            >
              <span className="font-space-mono text-[10px] text-emerald-500 mt-0.5 shrink-0">✓</span>
              <span className="font-space-mono text-[11px] text-[#9CA3AF]">Scraped listings from 3 portals</span>
            </motion.div>
          )}
          {/* Active line */}
          <div className="flex items-start gap-2.5">
            <span className="font-space-mono text-[10px] text-[#D4755B] mt-0.5 shrink-0">›</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={displayMsg}
                initial={{ opacity: 0, x: 4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -4 }}
                transition={{ duration: 0.2 }}
                className="font-space-mono text-[11px] text-[#221410]"
              >
                {displayMsg}
              </motion.span>
            </AnimatePresence>
          </div>
          {/* Blinking cursor */}
          <div className="flex items-center gap-2.5 pl-5">
            <span className="font-space-mono text-[11px] text-[#D4755B] animate-pulse">▋</span>
          </div>
        </div>
      </div>

      {/* Skeleton grid below — subtle, shows layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-10 opacity-30">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.06)] animate-pulse">
            <div className="flex justify-between mb-3">
              <div className="h-5 w-16 bg-[#E6E0DA] rounded-full" />
              <div className="h-5 w-20 bg-[#E6E0DA]/60 rounded-full" />
            </div>
            <div className="h-5 bg-[#E6E0DA] rounded-lg w-3/4 mb-1.5" />
            <div className="h-3.5 bg-[#E6E0DA]/60 rounded w-1/2 mb-4" />
            <div className="h-14 bg-[#FAF8F4] rounded-xl mb-3" />
            <div className="flex gap-1.5 mb-4">
              <div className="h-6 bg-[#E6E0DA]/40 rounded-lg w-14" />
              <div className="h-6 bg-[#E6E0DA]/40 rounded-lg w-20" />
            </div>
            <div className="h-12 bg-[#FDF6F3] rounded-xl mb-3" />
            <div className="flex gap-2 pt-3 border-t border-[#E6E0DA]/30">
              <div className="flex-1 h-9 bg-[#D4755B]/15 rounded-xl" />
              <div className="h-9 w-20 bg-[#E6E0DA]/40 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Main section ───────────────────────────────────────── */
const AISearchResults: React.FC<Props> = ({ properties, loading, sseStage, statusMessage, error, city, analysis }) => {
  const [compareList, setCompareList]   = useState<ScrapedProperty[]>([]);
  const [showModal, setShowModal]       = useState(false);

  const insightMap = React.useMemo<Map<string, PropertyOverview>>(() => {
    const map = new Map<string, PropertyOverview>();
    analysis?.overview?.forEach(item => {
      map.set(item.name.toLowerCase().trim(), item);
    });
    return map;
  }, [analysis]);

  const toggleCompare = (property: ScrapedProperty) => {
    setCompareList(prev => {
      const idx = prev.findIndex(p => p.building_name === property.building_name && p.location_address === property.location_address);
      if (idx !== -1) return prev.filter((_, i) => i !== idx);
      if (prev.length >= 3) return prev;
      return [...prev, property];
    });
  };

  if (loading) {
    return <AILoadingState city={city} sseStage={sseStage} statusMessage={statusMessage} />;
  }

  if (error) {
    return (
      <div className="py-10 text-center">
        <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <SearchX className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="font-syne text-2xl text-[#221410] mb-2">Search Failed</h3>
        <p className="font-manrope font-light text-[#6b7280] [text-wrap:pretty]">{error}</p>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="py-10 text-center">
        <div className="w-16 h-16 bg-[#D4755B]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Home className="w-8 h-8 text-[#D4755B]" />
        </div>
        <h3 className="font-syne text-2xl text-[#221410] mb-2">No Properties Found</h3>
        <p className="font-manrope font-light text-[#6b7280]">
          No properties found in {city} within your budget. Try increasing your budget or changing the property type.
        </p>
      </div>
    );
  }

  const aiMatchCount = properties.filter(p =>
    insightMap.has((p.building_name || '').toLowerCase().trim())
  ).length;

  return (
    <>
      <div>
        {/* Header */}
        <div className="mb-7 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="font-space-mono text-[10px] text-[#D4755B] font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
              <TrendingUp className="w-3 h-3" />
              Live AI Results
            </div>
            <h2 className="font-syne text-3xl font-bold text-[#221410] mb-1.5 [text-wrap:balance]">
              Properties in {city}
            </h2>
            <p className="font-manrope text-sm text-[#6B7280]">
              <span className="tabular-nums font-semibold text-[#221410]">{properties.length}</span>{' '}
              {properties.length === 1 ? 'match' : 'matches'} found
              {aiMatchCount > 0 && (
                <> · <span className="tabular-nums font-semibold text-[#D4755B]">{aiMatchCount}</span> with AI insights</>
              )}
            </p>
          </div>
        </div>

        {/* Card grid — staggered entrance */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-5"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
        >
          {properties.map((property, index) => {
            const insight     = insightMap.get((property.building_name || '').toLowerCase().trim());
            const isComparing = compareList.some(
              p => p.building_name === property.building_name && p.location_address === property.location_address
            );
            const canCompare  = compareList.length < 3;
            return (
              <motion.div
                key={index}
                variants={cardVariants}
                transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
              >
                <PropertyCard
                  property={property}
                  insight={insight}
                  rank={index + 1}
                  isComparing={isComparing}
                  canCompare={canCompare}
                  onToggleCompare={() => toggleCompare(property)}
                />
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Sticky compare bar */}
      <AnimatePresence>
        {compareList.length >= 2 && (
          <motion.div
            className="fixed bottom-0 inset-x-0 z-40"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
          >
            <div className="bg-white border-t border-[#E6E0DA] shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.12)]">
              <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center gap-4">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {compareList.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 bg-[#FAF8F4] border border-[#E6E0DA] rounded-xl px-3 py-1.5 min-w-0 shadow-[0_0_0_1px_rgba(0,0,0,0.04)]">
                      <span className="font-manrope text-[13px] font-semibold text-[#221410] truncate max-w-[140px]">
                        {p.building_name || 'Property'}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleCompare(p)}
                        className="shrink-0 text-[#9CA3AF] hover:text-[#D4755B] transition-[color] active:scale-[0.96]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-manrope text-[13px] text-[#6B7280] hidden sm:block tabular-nums">
                    {compareList.length} selected
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-2 bg-[#D4755B] hover:bg-[#C05621] text-white font-manrope font-semibold text-sm px-5 py-2.5 rounded-xl transition-[background-color] duration-150 shadow-sm shadow-[#D4755B]/25 active:scale-[0.96]"
                  >
                    <BarChart2 className="w-4 h-4" />
                    Compare Now
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && compareList.length >= 2 && (
          <ComparisonModal
            items={compareList}
            insightMap={insightMap}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default AISearchResults;
