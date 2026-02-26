import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, MapPin, IndianRupee, Home, Building2, Search, Loader2, KeyRound, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { SearchParams } from '../../pages/AIPropertyHubPage';
import AIApiKeyModal from './AIApiKeyModal';
import { apiKeyStorage } from '../../services/api';

interface AIHeroSectionProps {
  onSearch: (params: SearchParams) => void;
  loading: boolean;
}

const POPULAR_CITIES = [
  'Mumbai', 'Bangalore', 'Delhi', 'Pune',
  'Hyderabad', 'Chennai', 'Ahmedabad', 'Gurgaon',
];

// Extended list for autocomplete
const ALL_CITIES = [
  'Mumbai', 'Bangalore', 'Delhi', 'Pune', 'Hyderabad', 'Chennai',
  'Ahmedabad', 'Gurgaon', 'Noida', 'Kolkata', 'Jaipur', 'Lucknow',
  'Chandigarh', 'Indore', 'Nagpur', 'Bhopal', 'Kochi', 'Coimbatore',
  'Vadodara', 'Surat', 'Thane', 'Navi Mumbai', 'Mysore', 'Vizag',
  'Nashik', 'Faridabad', 'Ghaziabad', 'Dehradun', 'Mangalore',
  'Thiruvananthapuram', 'Bhubaneswar', 'Patna', 'Ranchi', 'Raipur',
  'Agra', 'Varanasi', 'Amritsar', 'Ludhiana', 'Greater Noida',
  'Mohali', 'Panchkula', 'Zirakpur', 'Dera Bassi', 'Sonipat',
  'Panipat', 'Karnal', 'Ambala', 'Udaipur', 'Jodhpur', 'Kota',
  'Rajkot', 'Gandhinagar', 'Anand', 'Vapi', 'Bhavnagar',
  'Aurangabad', 'Solapur', 'Kolhapur', 'Sangli', 'Satara',
];

const PROPERTY_TYPES = ['Flat', 'Villa', 'House', 'Penthouse', 'Plot', 'Studio'];
const CATEGORIES = ['Residential', 'Commercial'];

type BudgetUnit = 'Lakh' | 'Cr';

const AIHeroSection: React.FC<AIHeroSectionProps> = ({ onSearch, loading }) => {
  const [city, setCity] = useState('');
  const [maxBudget, setMaxBudget] = useState('2');
  const [budgetUnit, setBudgetUnit] = useState<BudgetUnit>('Cr');
  const [propertyType, setPropertyType] = useState('Flat');
  const [category, setCategory] = useState('Residential');

  // Autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // API key modal + status
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keysReady, setKeysReady] = useState(apiKeyStorage.hasKeys());

  const refreshKeyStatus = useCallback(() => {
    setKeysReady(apiKeyStorage.hasKeys());
  }, []);

  // Filter cities based on input
  const filteredCities = city.trim()
    ? ALL_CITIES.filter(
        (c) => c.toLowerCase().includes(city.toLowerCase()) && c.toLowerCase() !== city.toLowerCase()
      ).slice(0, 6)
    : [];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        cityInputRef.current &&
        !cityInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCity(e.target.value);
    setShowSuggestions(true);
    setHighlightedIndex(-1);
  };

  const selectCity = (selectedCity: string) => {
    setCity(selectedCity);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const handleCityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredCities.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredCities.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredCities.length - 1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      selectCity(filteredCities[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim()) return;

    // Convert to Crores for the backend
    const rawValue = parseFloat(maxBudget) || 2;
    const valueInCrores = budgetUnit === 'Lakh' ? rawValue / 100 : rawValue;

    onSearch({
      city: city.trim(),
      maxBudget: valueInCrores,
      propertyType,
      category,
    });
  };

  return (
    <section className="relative bg-gradient-to-br from-[#221410] via-[#3d2519] to-[#221410] pt-32 pb-20 overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#D4755B]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#D4755B]/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/[0.04] rounded-full" />
      </div>

      <div className="relative max-w-[1200px] mx-auto px-6">
        {/* ── Heading ──────────────────────────────── */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2 mb-6">
            <Sparkles className="w-4 h-4 text-[#D4755B]" />
            <span className="font-space-mono text-xs text-white/80 uppercase tracking-wider">
              AI-Powered Search
            </span>
          </div>

          <h1 className="font-fraunces text-5xl md:text-6xl leading-tight text-white mb-4">
            Find Properties with
            <span className="text-[#D4755B]"> AI Intelligence</span>
          </h1>

          <p className="font-manrope font-light text-lg text-white/60 max-w-[560px] mx-auto">
            Our AI scrapes real listings from 99acres, analyzes market data,
            and delivers personalised recommendations.
          </p>
        </div>

        {/* ── API Key Banner ───────────────────────── */}
        <div className="max-w-[800px] mx-auto mb-4">
          {keysReady ? (
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-5 py-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="font-manrope text-sm text-emerald-200 flex-1">
                Your API keys are active — AI searches use your own quota.
              </p>
              <button
                onClick={() => setShowKeyModal(true)}
                className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-manrope font-semibold text-xs px-3 py-1.5 rounded-lg transition-all whitespace-nowrap"
              >
                <KeyRound className="w-3 h-3" /> Manage Keys
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-5 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="font-manrope text-sm text-amber-200 flex-1">
                Add your <strong className="text-amber-100">free</strong> GitHub Models &amp; Firecrawl keys — use your own quota.
              </p>
              <button
                onClick={() => setShowKeyModal(true)}
                className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-manrope font-semibold text-xs px-3 py-1.5 rounded-lg transition-all whitespace-nowrap"
              >
                <KeyRound className="w-3 h-3" /> Set Up Keys
              </button>
            </div>
          )}
        </div>

        {/* ── Search form card ─────────────────────── */}
        <div className="max-w-[800px] mx-auto">
          <form
            onSubmit={handleSubmit}
            className="bg-white/[0.07] backdrop-blur-xl border border-white/10 rounded-2xl p-8"
          >
            {/* City */}
            <div className="mb-5">
              <label className="block font-space-mono text-[11px] text-white/50 uppercase tracking-widest mb-2">
                City
              </label>
              <div className="relative">
                <div className="relative bg-white/10 rounded-xl p-4 flex items-center gap-3 focus-within:ring-2 focus-within:ring-[#D4755B]/50 transition-all">
                  <MapPin className="w-5 h-5 text-[#D4755B] shrink-0" />
                  <input
                    ref={cityInputRef}
                    type="text"
                    value={city}
                    onChange={handleCityChange}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={handleCityKeyDown}
                    className="flex-1 bg-transparent font-manrope text-sm text-white outline-none placeholder:text-white/30"
                    placeholder="Enter city — e.g. Mumbai, Pune, Bangalore…"
                    autoComplete="off"
                    required
                  />
                </div>

                {/* Autocomplete dropdown */}
                {showSuggestions && filteredCities.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute z-50 left-0 right-0 mt-1 bg-[#2d1a12] border border-white/15 rounded-xl shadow-2xl overflow-hidden"
                  >
                    {filteredCities.map((c, idx) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => selectCity(c)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                          idx === highlightedIndex
                            ? 'bg-[#D4755B]/20 text-white'
                            : 'text-white/70 hover:bg-white/5'
                        }`}
                      >
                        <MapPin className="w-4 h-4 text-[#D4755B]/60 shrink-0" />
                        <span className="font-manrope text-sm">{c}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick-pick city pills */}
              <div className="flex flex-wrap gap-2 mt-3">
                {POPULAR_CITIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => selectCity(c)}
                    className={`font-manrope text-xs px-3 py-1.5 rounded-full border transition-all ${
                      city === c
                        ? 'bg-[#D4755B] border-[#D4755B] text-white'
                        : 'border-white/20 text-white/50 hover:border-[#D4755B]/50 hover:text-white/80'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Budget · Type · Category */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Budget */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-space-mono text-[11px] text-white/50 uppercase tracking-widest">
                    Max Budget
                  </label>
                  {/* Unit toggle */}
                  <div className="flex items-center bg-white/10 rounded-md overflow-hidden">
                    {(['Lakh', 'Cr'] as BudgetUnit[]).map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => {
                          if (unit !== budgetUnit) {
                            const val = parseFloat(maxBudget) || 0;
                            if (unit === 'Lakh') {
                              setMaxBudget(String(val * 100));
                            } else {
                              setMaxBudget(String(val / 100));
                            }
                            setBudgetUnit(unit);
                          }
                        }}
                        className={`font-space-mono text-[10px] px-2 py-1 transition-all ${
                          budgetUnit === unit
                            ? 'bg-[#D4755B] text-white'
                            : 'text-white/50 hover:text-white/80'
                        }`}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative bg-white/10 rounded-xl p-4 flex items-center gap-3 focus-within:ring-2 focus-within:ring-[#D4755B]/50 transition-all">
                  <IndianRupee className="w-5 h-5 text-[#D4755B] shrink-0" />
                  <input
                    type="number"
                    value={maxBudget}
                    onChange={(e) => setMaxBudget(e.target.value)}
                    className="flex-1 bg-transparent font-space-mono text-sm text-white outline-none placeholder:text-white/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder={budgetUnit === 'Lakh' ? '50' : '2'}
                    min="0.1"
                    step={budgetUnit === 'Lakh' ? '5' : '0.5'}
                    required
                  />
                </div>
              </div>

              {/* Property type */}
              <div>
                <label className="block font-space-mono text-[11px] text-white/50 uppercase tracking-widest mb-2">
                  Property Type
                </label>
                <div className="relative bg-white/10 rounded-xl p-4 flex items-center gap-3 focus-within:ring-2 focus-within:ring-[#D4755B]/50 transition-all">
                  <Home className="w-5 h-5 text-[#D4755B] shrink-0" />
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="flex-1 bg-transparent font-manrope text-sm text-white outline-none cursor-pointer [&>option]:text-[#221410]"
                  >
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block font-space-mono text-[11px] text-white/50 uppercase tracking-widest mb-2">
                  Category
                </label>
                <div className="relative bg-white/10 rounded-xl p-4 flex items-center gap-3 focus-within:ring-2 focus-within:ring-[#D4755B]/50 transition-all">
                  <Building2 className="w-5 h-5 text-[#D4755B] shrink-0" />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex-1 bg-transparent font-manrope text-sm text-white outline-none cursor-pointer [&>option]:text-[#221410]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !city.trim()}
              className="w-full bg-[#D4755B] hover:bg-[#C05621] disabled:opacity-50 disabled:cursor-not-allowed text-white font-manrope font-semibold text-base py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#D4755B]/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Searching properties…
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Search with AI
                </>
              )}
            </button>

            {loading && (
              <p className="font-manrope text-xs text-white/40 text-center mt-3">
                Scraping live data from 99acres &amp; running AI analysis — this may take 15-30 seconds
              </p>
            )}
          </form>
        </div>
      </div>

      {/* API Key Modal */}
      <AIApiKeyModal
        isOpen={showKeyModal}
        onClose={() => setShowKeyModal(false)}
        onKeysChanged={refreshKeyStatus}
      />
    </section>
  );
};

export default AIHeroSection;