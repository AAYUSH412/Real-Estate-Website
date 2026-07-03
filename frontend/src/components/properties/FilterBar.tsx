import React, { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal, ChevronDown, X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FilterBarProps {
  onFilterChange?: (filters: FilterState) => void;
  totalProperties?: number;
  sortBy?: string;
  onSortChange?: (sort: string) => void;
  viewMode?: 'grid' | 'list';
  onViewChange?: (v: 'grid' | 'list') => void;
}

export interface FilterState {
  location?: string;
  propertyType?: string[];
  availability?: string;
  priceRange?: [number, number];
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
}

const PROPERTY_TYPES = ['Apartment', 'House', 'Villa', 'Office'];
const AMENITIES = [
  'Parking', 'Swimming Pool', 'Gym', 'Garden', 'Security',
  'Clubhouse', 'Power Backup', 'Lift', 'Balcony', 'CCTV Surveillance',
  'Children Play Area', 'Gated Community',
];

const formatPriceLabel = (value: number): string => {
  if (value >= 200) return '20+ Cr';
  if (value >= 10) return `${(value / 10).toFixed(value % 10 === 0 ? 0 : 1)} Cr`;
  return `${value * 10} L`;
};

// Small dropdown wrapper — opens below trigger, closes on outside click
const Dropdown: React.FC<{
  label: string;
  active?: boolean;
  children: React.ReactNode;
}> = ({ label, active, children }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 h-10 px-4 rounded-xl border font-manrope text-sm font-medium transition-colors duration-200 active:scale-[0.96] ${
          active
            ? 'bg-[#221410] border-[#221410] text-white'
            : 'bg-white border-[#E6E0DA] text-[#374151] hover:border-[#D4755B]'
        }`}
      >
        {label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
            className="absolute top-full left-0 mt-2 z-30 bg-white border border-[#E6E0DA] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.10)] min-w-[220px]"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FilterBar: React.FC<FilterBarProps> = ({
  onFilterChange,
  totalProperties = 0,
  sortBy = 'featured',
  onSortChange,
  viewMode = 'grid',
  onViewChange,
}) => {
  const [location, setLocation] = useState('');
  const [availability, setAvailability] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 200]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [bedrooms, setBedrooms] = useState(0);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const f: FilterState = {};
    if (location) f.location = location;
    if (availability) f.availability = availability;
    if (priceRange[0] > 0 || priceRange[1] < 200) f.priceRange = priceRange;
    if (selectedTypes.length) f.propertyType = selectedTypes;
    if (bedrooms > 0) f.bedrooms = bedrooms;
    if (selectedAmenities.length) f.amenities = selectedAmenities;
    onFilterChange?.(f);
  }, [location, availability, priceRange, selectedTypes, bedrooms, selectedAmenities]);

  // Close "More filters" on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setShowMoreFilters(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleReset = () => {
    setLocation(''); setAvailability(''); setPriceRange([0, 200]);
    setSelectedTypes([]); setBedrooms(0); setSelectedAmenities([]);
    onFilterChange?.({});
  };

  const activeCount = [
    location, availability,
    priceRange[0] > 0 || priceRange[1] < 200,
    selectedTypes.length > 0,
    bedrooms > 0,
    selectedAmenities.length > 0,
  ].filter(Boolean).length;

  const toggleType = (t: string) =>
    setSelectedTypes(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);
  const toggleAmenity = (a: string) =>
    setSelectedAmenities(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a]);

  return (
    <div className="bg-white border-b border-[#E6E0DA] sticky top-[72px] z-20">
      <div className="max-w-[1440px] mx-auto px-6 py-3">

        {/* ── Top row: search + filters + sort + view ── */}
        <div className="flex items-center gap-2 flex-wrap">

          {/* Location search */}
          <div className="relative flex-1 min-w-[200px] max-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" aria-hidden />
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="City or neighbourhood…"
              className="w-full h-10 bg-[#F5F1E8] border border-[#E6E0DA] rounded-xl pl-9 pr-3 font-manrope text-sm text-[#221410] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#D4755B] transition-[border-color]"
            />
            {location && (
              <button onClick={() => setLocation('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-[#9CA3AF]" />
              </button>
            )}
          </div>

          {/* Buy / Rent toggle */}
          <div className="flex items-center gap-1 h-10 bg-[#F5F1E8] rounded-xl p-1">
            {['buy', 'rent'].map(a => (
              <button
                key={a}
                onClick={() => setAvailability(av => av === a ? '' : a)}
                className={`h-8 px-4 rounded-lg font-manrope text-sm font-medium transition-all duration-200 active:scale-[0.96] ${
                  availability === a
                    ? 'bg-white text-[#221410] shadow-sm'
                    : 'text-[#6B7280] hover:text-[#221410]'
                }`}
              >
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </button>
            ))}
          </div>

          {/* Price */}
          <Dropdown
            label={priceRange[0] > 0 || priceRange[1] < 200
              ? `₹${formatPriceLabel(priceRange[0])} – ₹${formatPriceLabel(priceRange[1])}`
              : 'Price'}
            active={priceRange[0] > 0 || priceRange[1] < 200}
          >
            <div className="p-4 space-y-4 w-[260px]">
              <p className="font-manrope font-semibold text-xs text-[#221410] uppercase tracking-wider">Price Range</p>
              <div className="flex justify-between font-space-mono text-sm text-[#D4755B] tabular-nums">
                <span>₹{formatPriceLabel(priceRange[0])}</span>
                <span>₹{formatPriceLabel(priceRange[1])}</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="font-manrope text-xs text-[#9CA3AF] mb-1 block">Min</label>
                  <input type="range" min="0" max="200" step="1" value={priceRange[0]}
                    onChange={e => { const v = +e.target.value; if (v < priceRange[1]) setPriceRange([v, priceRange[1]]); }}
                    className="w-full accent-[#D4755B]" />
                </div>
                <div>
                  <label className="font-manrope text-xs text-[#9CA3AF] mb-1 block">Max</label>
                  <input type="range" min="0" max="200" step="1" value={priceRange[1]}
                    onChange={e => { const v = +e.target.value; if (v > priceRange[0]) setPriceRange([priceRange[0], v]); }}
                    className="w-full accent-[#D4755B]" />
                </div>
              </div>
            </div>
          </Dropdown>

          {/* Type */}
          <Dropdown
            label={selectedTypes.length ? selectedTypes.join(', ') : 'Type'}
            active={selectedTypes.length > 0}
          >
            <div className="p-3 w-[200px]">
              <p className="font-manrope font-semibold text-xs text-[#221410] uppercase tracking-wider mb-3 px-1">Property Type</p>
              <div className="grid grid-cols-2 gap-1.5">
                {PROPERTY_TYPES.map(t => (
                  <button
                    key={t}
                    onClick={() => toggleType(t)}
                    className={`h-9 rounded-xl font-manrope text-sm font-medium transition-all duration-200 active:scale-[0.96] ${
                      selectedTypes.includes(t)
                        ? 'bg-[#221410] text-white'
                        : 'bg-[#F5F1E8] text-[#374151] hover:bg-[#EBE5DE]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </Dropdown>

          {/* Beds */}
          <Dropdown
            label={bedrooms > 0 ? `${bedrooms === 5 ? '5+' : bedrooms} Bed${bedrooms !== 1 ? 's' : ''}` : 'Beds'}
            active={bedrooms > 0}
          >
            <div className="p-3 w-[200px]">
              <p className="font-manrope font-semibold text-xs text-[#221410] uppercase tracking-wider mb-3 px-1">Bedrooms</p>
              <div className="flex gap-1.5 flex-wrap">
                {[0, 1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setBedrooms(n)}
                    className={`w-9 h-9 rounded-xl font-space-mono text-sm font-bold transition-all duration-200 active:scale-[0.96] ${
                      bedrooms === n
                        ? 'bg-[#221410] text-white'
                        : 'bg-[#F5F1E8] text-[#374151] hover:bg-[#EBE5DE]'
                    }`}
                  >
                    {n === 0 ? 'Any' : n === 5 ? '5+' : n}
                  </button>
                ))}
              </div>
            </div>
          </Dropdown>

          {/* More filters */}
          <div ref={moreRef} className="relative">
            <button
              onClick={() => setShowMoreFilters(o => !o)}
              className={`flex items-center gap-1.5 h-10 px-4 rounded-xl border font-manrope text-sm font-medium transition-colors duration-200 active:scale-[0.96] ${
                selectedAmenities.length > 0
                  ? 'bg-[#221410] border-[#221410] text-white'
                  : 'bg-white border-[#E6E0DA] text-[#374151] hover:border-[#D4755B]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              More{selectedAmenities.length > 0 ? ` (${selectedAmenities.length})` : ''}
            </button>

            <AnimatePresence>
              {showMoreFilters && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
                  className="absolute top-full right-0 mt-2 z-30 bg-white border border-[#E6E0DA] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.10)] w-[300px] p-4"
                >
                  <p className="font-manrope font-semibold text-xs text-[#221410] uppercase tracking-wider mb-3">Amenities</p>
                  <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto">
                    {AMENITIES.map(a => (
                      <button
                        key={a}
                        onClick={() => toggleAmenity(a)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl font-manrope text-xs text-left transition-all duration-200 ${
                          selectedAmenities.includes(a)
                            ? 'bg-[#221410] text-white'
                            : 'bg-[#F5F1E8] text-[#374151] hover:bg-[#EBE5DE]'
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Reset — only when filters active */}
          {activeCount > 0 && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 h-10 px-3 rounded-xl font-manrope text-sm text-[#6B7280] hover:text-[#D4755B] transition-colors duration-200"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Count */}
          <span className="font-manrope text-sm text-[#6B7280] whitespace-nowrap">
            {totalProperties} {totalProperties === 1 ? 'property' : 'properties'}
          </span>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => onSortChange?.(e.target.value)}
            className="h-10 bg-white border border-[#E6E0DA] rounded-xl px-3 pr-7 font-manrope text-sm text-[#221410] cursor-pointer focus:outline-none focus:border-[#D4755B] appearance-none transition-[border-color]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%236B7280' d='M5 7L1 3h8z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.6rem center'
            }}
          >
            <option value="featured">Featured</option>
            <option value="price-low">Price: Low → High</option>
            <option value="price-high">Price: High → Low</option>
            <option value="newest">Newest</option>
            <option value="beds">Most Beds</option>
          </select>

          {/* View toggle */}
          <div className="flex items-center gap-0.5 h-10 bg-[#F5F1E8] rounded-xl p-1">
            {(['grid', 'list'] as const).map(m => (
              <button
                key={m}
                onClick={() => onViewChange?.(m)}
                aria-label={`${m} view`}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 ${
                  viewMode === m ? 'bg-white shadow-sm text-[#221410]' : 'text-[#6B7280]'
                }`}
              >
                <span className="material-icons text-[18px]">
                  {m === 'grid' ? 'grid_view' : 'view_list'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
