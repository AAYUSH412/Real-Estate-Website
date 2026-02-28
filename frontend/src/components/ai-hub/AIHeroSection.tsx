import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, MapPin, IndianRupee, Home, Building2, Search, Loader2, KeyRound, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { SearchParams } from '../../pages/AIPropertyHubPage';
import AIApiKeyModal from './AIApiKeyModal';
import { apiKeyStorage } from '../../services/api';

interface AIHeroSectionProps {
  onSearch: (params: SearchParams) => void;
  loading: boolean;
  externalOpenModal?: boolean;   // P1-1: parent can force-open key modal (e.g. on 403)
  onModalClosed?: () => void;    // callback to reset the flag after opening
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

const AIHeroSection: React.FC<AIHeroSectionProps> = ({ onSearch, loading, externalOpenModal, onModalClosed }) => {
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

  // P1-1: open modal when parent signals 403 error
  useEffect(() => {
    if (externalOpenModal) {
      setShowKeyModal(true);
      onModalClosed?.();
    }
  }, [externalOpenModal, onModalClosed]);

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

    // Guard: require API keys before firing any request
    if (!keysReady) {
      setShowKeyModal(true);
      return;
    }

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
    <section className="relative bg-[#FAF8F4] overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-0 inset-x-0 h-[800px] bg-gradient-to-b from-[#D4755B]/10 to-transparent" />
        <div className="absolute top-20 left-10 w-[500px] h-[500px] bg-[#D4755B]/10 rounded-full blur-[100px]" />
        <div className="absolute right-0 top-0 w-1/2 h-full bg-[radial-gradient(circle_at_top_right,rgba(212,117,91,0.08),transparent_60%)]" />
      </div>

      <div className="relative pt-32 pb-24 max-w-[1200px] mx-auto px-6">
        {/* ── Heading ──────────────────────────────── */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm border border-[#D4755B]/20 rounded-full px-4 py-2 mb-6 shadow-sm">
            <Sparkles className="w-4 h-4 text-[#D4755B]" />
            <span className="font-space-mono text-xs text-[#D4755B] uppercase tracking-wider font-semibold">
              AI-Powered Search
            </span>
          </div>

          <h1 className="font-fraunces text-5xl md:text-6xl lg:text-7xl leading-tight text-[#221410] mb-6">
            Find Properties with<br />
            <span className="text-[#D4755B]">AI Intelligence</span>
          </h1>

          <p className="font-manrope text-lg text-[#6B7280] max-w-[600px] mx-auto leading-relaxed">
            Our AI analyzes live market data and real listings to deliver highly personalized property recommendations in seconds.
          </p>
        </div>

        {/* ── API Key Banner ───────────────────────── */}
        <div className="max-w-[800px] mx-auto mb-6 relative z-10">
          {keysReady ? (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 shadow-sm rounded-xl px-5 py-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="font-manrope text-sm font-medium text-emerald-800 flex-1">
                Your API keys are active — AI searches use your own quota.
              </p>
              <button
                onClick={() => setShowKeyModal(true)}
                className="flex items-center gap-1.5 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 text-emerald-700 font-manrope font-bold text-xs px-4 py-2 rounded-lg transition-all whitespace-nowrap"
              >
                <KeyRound className="w-3.5 h-3.5" /> Manage Keys
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 shadow-sm rounded-xl px-5 py-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="font-manrope text-sm font-medium text-amber-800 flex-1">
                Add your <strong className="text-amber-900 font-bold">free</strong> GitHub Models &amp; Firecrawl keys — use your own quota.
              </p>
              <button
                onClick={() => setShowKeyModal(true)}
                className="flex items-center gap-1.5 bg-amber-100 hover:bg-amber-200 border border-amber-200 text-amber-800 font-manrope font-bold text-xs px-4 py-2 rounded-lg transition-all whitespace-nowrap"
              >
                <KeyRound className="w-3.5 h-3.5" /> Set Up Keys
              </button>
            </div>
          )}
        </div>

        {/* ── Search form card ─────────────────────── */}
        <div className="max-w-[900px] mx-auto relative z-10">
          <form
            onSubmit={handleSubmit}
            className="bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6 md:p-8"
          >
            {/* City */}
            <div className="mb-6">
              <label className="block font-space-mono text-[11px] text-[#6B7280] font-semibold uppercase tracking-widest mb-2 ml-1">
                Where do you want to live?
              </label>
              <div className="relative">
                <div className="relative bg-white border border-[#E6E0DA] rounded-xl p-4 flex items-center gap-3 focus-within:ring-2 focus-within:ring-[#D4755B]/30 focus-within:border-[#D4755B] transition-all shadow-sm">
                  <MapPin className="w-5 h-5 text-[#D4755B] shrink-0" />
                  <input
                    ref={cityInputRef}
                    type="text"
                    value={city}
                    onChange={handleCityChange}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={handleCityKeyDown}
                    className="flex-1 bg-transparent font-manrope text-base text-[#221410] outline-none placeholder:text-[#9CA3AF] placeholder:font-light"
                    placeholder="Enter city — e.g. Mumbai, Pune, Bangalore…"
                    autoComplete="off"
                    required
                  />
                </div>

                {/* Autocomplete dropdown */}
                {showSuggestions && filteredCities.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute z-50 left-0 right-0 mt-2 bg-white border border-[#E6E0DA] rounded-xl shadow-xl overflow-hidden"
                  >
                    {filteredCities.map((c, idx) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => selectCity(c)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`w-full text-left px-5 py-3.5 flex items-center gap-3 transition-colors ${idx === highlightedIndex
                          ? 'bg-[#FAF8F4] text-[#221410]'
                          : 'text-[#6B7280] hover:bg-[#FAF8F4] hover:text-[#221410]'
                          }`}
                      >
                        <MapPin className="w-4 h-4 text-[#D4755B] shrink-0" />
                        <span className="font-manrope text-sm font-medium">{c}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick-pick city pills */}
              <div className="flex flex-wrap gap-2 mt-4 ml-1">
                {POPULAR_CITIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => selectCity(c)}
                    className={`font-manrope text-xs px-4 py-1.5 rounded-full border transition-all ${city === c
                      ? 'bg-[#D4755B] border-[#D4755B] text-white font-medium shadow-sm'
                      : 'bg-white border-[#E6E0DA] text-[#6B7280] hover:border-[#D4755B]/50 hover:text-[#D4755B]'
                      }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Budget · Type · Category */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              {/* Budget */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-space-mono text-[11px] text-[#6B7280] font-semibold uppercase tracking-widest ml-1">
                    Max Budget
                  </label>
                  {/* Unit toggle */}
                  <div className="flex items-center bg-[#FAF8F4] border border-[#E6E0DA] rounded p-0.5">
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
                        className={`font-space-mono text-[10px] uppercase font-bold px-2.5 py-1 transition-all rounded-sm ${budgetUnit === unit
                          ? 'bg-white shadow-sm text-[#D4755B]'
                          : 'text-[#9CA3AF] hover:text-[#6B7280]'
                          }`}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative bg-white border border-[#E6E0DA] rounded-xl p-4 flex items-center gap-3 focus-within:ring-2 focus-within:ring-[#D4755B]/30 focus-within:border-[#D4755B] transition-all shadow-sm">
                  <IndianRupee className="w-5 h-5 text-[#D4755B] shrink-0" />
                  <input
                    type="number"
                    value={maxBudget}
                    onChange={(e) => setMaxBudget(e.target.value)}
                    className="flex-1 bg-transparent font-space-mono text-base text-[#221410] outline-none placeholder:text-[#9CA3AF] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder={budgetUnit === 'Lakh' ? '50' : '2'}
                    min="0.1"
                    step="any" // P2: Fix HTML5 validation bug, allow any increment (e.g. 2.0 when jumping by 0.5 was strictly failing)
                    required
                  />
                </div>
              </div>

              {/* Property type */}
              <div>
                <label className="block font-space-mono text-[11px] text-[#6B7280] font-semibold uppercase tracking-widest mb-2 ml-1">
                  Property Type
                </label>
                <div className="relative bg-white border border-[#E6E0DA] rounded-xl p-4 flex items-center gap-3 focus-within:ring-2 focus-within:ring-[#D4755B]/30 focus-within:border-[#D4755B] transition-all shadow-sm">
                  <Home className="w-5 h-5 text-[#D4755B] shrink-0" />
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="flex-1 bg-transparent font-manrope text-base text-[#221410] outline-none cursor-pointer"
                  >
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block font-space-mono text-[11px] text-[#6B7280] font-semibold uppercase tracking-widest mb-2 ml-1">
                  Category
                </label>
                <div className="relative bg-white border border-[#E6E0DA] rounded-xl p-4 flex items-center gap-3 focus-within:ring-2 focus-within:ring-[#D4755B]/30 focus-within:border-[#D4755B] transition-all shadow-sm">
                  <Building2 className="w-5 h-5 text-[#D4755B] shrink-0" />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex-1 bg-transparent font-manrope text-base text-[#221410] outline-none cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="relative group mt-2">
              <button
                type="submit"
                disabled={loading || !city.trim() || !keysReady}
                className="w-full bg-[#D4755B] hover:bg-[#C05621] disabled:opacity-50 disabled:cursor-not-allowed text-white font-manrope font-semibold text-lg py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#D4755B]/20 hover:shadow-xl hover:shadow-[#D4755B]/30"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Searching properties…
                  </>
                ) : !keysReady ? (
                  <>
                    <KeyRound className="w-5 h-5" />
                    Set API Keys to Search
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Search with AI
                  </>
                )}
              </button>
              {/* Tooltip shown when keys are missing */}
              {!keysReady && !loading && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#221410] border border-[#E6E0DA]/20 text-white font-manrope text-xs rounded-lg px-4 py-2 whitespace-nowrap pointer-events-none shadow-xl z-10 transition-opacity">
                  Add your GitHub Models &amp; Firecrawl keys first
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#221410] border-b border-r border-[#E6E0DA]/20 rotate-45" />
                </div>
              )}
            </div>

            {loading && (
              <p className="flex items-center justify-center gap-2 font-manrope text-sm text-[#6B7280] font-medium mt-4 animate-pulse">
                <Sparkles className="w-4 h-4 text-[#D4755B]" />
                Scraping live data & running AI analysis — this may take 15-30s
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