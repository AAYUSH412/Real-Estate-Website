import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, IndianRupee, Home, Building2, Search, Loader2, KeyRound, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { SearchParams } from '../../pages/AIPropertyHubPage';
import AIApiKeyModal from './AIApiKeyModal';
import { apiKeyStorage, aiAPI } from '../../services/api';

interface AIHeroSectionProps {
  onSearch: (params: SearchParams) => void;
  loading: boolean;
  sseStage?: 'searching' | 'analyzing' | null; // real-time SSE stage from backend
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

const LOAD_STEPS = [
  { label: 'Searching listings',        desc: 'Querying 99acres, MagicBricks, Housing.com & NoBroker' },
  { label: 'Reading property details',  desc: 'Extracting data from live listing pages'  },
  { label: 'Getting AI insights',       desc: 'Ranking & analysing by your criteria'     },
];

type BudgetUnit = 'Lakh' | 'Cr';

interface AIModelOption {
  name: string;
  slug: string;
  badge: string;
  description: string;
  isDefault: boolean;
}

const AIHeroSection: React.FC<AIHeroSectionProps> = ({ onSearch, loading, sseStage, externalOpenModal, onModalClosed }) => {
  const [city, setCity] = useState('');
  const [locality, setLocality] = useState('');
  const [bhk, setBhk] = useState('Any');
  const [possession, setPossession] = useState('any');
  const [loadStep, setLoadStep] = useState(0); // 0=idle, 1=searching, 2=reading, 3=analyzing
  const [maxBudget, setMaxBudget] = useState('2');
  const [budgetUnit, setBudgetUnit] = useState<BudgetUnit>('Cr');
  const [propertyType, setPropertyType] = useState('Flat');
  const [category, setCategory] = useState('Residential');

  // AI model selector
  const [availableModels, setAvailableModels] = useState<AIModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  // City autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Locality autocomplete state
  const [localitySuggestions, setLocalitySuggestions] = useState<string[]>([]);
  const [showLocalitySuggestions, setShowLocalitySuggestions] = useState(false);
  const [localityHighlightedIndex, setLocalityHighlightedIndex] = useState(-1);
  const localityInputRef = useRef<HTMLInputElement>(null);
  const localitySuggestionsRef = useRef<HTMLDivElement>(null);
  const localityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // API key modal + status
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keysReady,    setKeysReady]   = useState(apiKeyStorage.hasKeys());

  // Load available AI models once
  useEffect(() => {
    aiAPI.getModels().then((res: { data: { models: AIModelOption[] } }) => {
      const models: AIModelOption[] = res.data?.models || [];
      setAvailableModels(models);
      const def = models.find(m => m.isDefault);
      if (def) setSelectedModel(def.slug);
    }).catch(() => {
      // non-fatal — backend will use default model anyway
    });
  }, []);

  // P1-1: open modal when parent signals 403 error
  useEffect(() => {
    if (externalOpenModal) {
      setShowKeyModal(true);
      onModalClosed?.();
    }
  }, [externalOpenModal, onModalClosed]);

  // Advance loading steps — SSE events drive real progress; timers are fallback only.
  // Step 1 "Searching listings"    → activates when loading starts (SSE: searching)
  // Step 2 "Reading property details" → timer fallback at 8s (Firecrawl scraping)
  // Step 3 "Getting AI insights"   → SSE analyzing event OR timer fallback at 20s
  useEffect(() => {
    if (!loading) { setLoadStep(0); return; }
    setLoadStep(1);
    const t2 = setTimeout(() => setLoadStep(prev => (prev < 2 ? 2 : prev)), 8_000);
    const t3 = setTimeout(() => setLoadStep(prev => (prev < 3 ? 3 : prev)), 20_000);
    return () => { clearTimeout(t2); clearTimeout(t3); };
  }, [loading]);

  // SSE stage events immediately advance the loader — no waiting for timers.
  useEffect(() => {
    if (!loading || !sseStage) return;
    if (sseStage === 'searching') setLoadStep(prev => Math.max(prev, 1));
    if (sseStage === 'analyzing') setLoadStep(3); // jump straight to step 3
  }, [sseStage, loading]);

  const refreshKeyStatus = useCallback(() => {
    setKeysReady(apiKeyStorage.hasKeys());
  }, []);

  // Clear locality when city changes
  useEffect(() => {
    setLocality('');
    setLocalitySuggestions([]);
    setShowLocalitySuggestions(false);
  }, [city]);

  // Debounced locality suggestions — fetches from MongoDB-cached scraped data
  useEffect(() => {
    if (localityDebounceRef.current) clearTimeout(localityDebounceRef.current);
    if (!city.trim() || locality.trim().length < 1) {
      setLocalitySuggestions([]);
      setShowLocalitySuggestions(false);
      return;
    }
    localityDebounceRef.current = setTimeout(async () => {
      try {
        const res = await aiAPI.localities(city.trim(), locality.trim());
        const suggestions: string[] = res.data?.localities || [];
        setLocalitySuggestions(suggestions);
        setShowLocalitySuggestions(suggestions.length > 0);
      } catch {
        setLocalitySuggestions([]);
      }
    }, 300);
    return () => {
      if (localityDebounceRef.current) clearTimeout(localityDebounceRef.current);
    };
  }, [city, locality]);

  // Close locality dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        localitySuggestionsRef.current &&
        !localitySuggestionsRef.current.contains(e.target as Node) &&
        localityInputRef.current &&
        !localityInputRef.current.contains(e.target as Node)
      ) {
        setShowLocalitySuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectLocality = (loc: string) => {
    setLocality(loc);
    setShowLocalitySuggestions(false);
    setLocalityHighlightedIndex(-1);
  };

  const handleLocalityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showLocalitySuggestions || localitySuggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setLocalityHighlightedIndex(prev => (prev < localitySuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setLocalityHighlightedIndex(prev => (prev > 0 ? prev - 1 : localitySuggestions.length - 1));
    } else if (e.key === 'Enter' && localityHighlightedIndex >= 0) {
      e.preventDefault();
      selectLocality(localitySuggestions[localityHighlightedIndex]);
    } else if (e.key === 'Escape') {
      setShowLocalitySuggestions(false);
    }
  };

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
      city:         city.trim(),
      locality:     locality.trim(),
      bhk,
      possession,
      maxBudget:    valueInCrores,
      propertyType,
      category,
      model:        selectedModel || undefined,
    });
  };

  return (
    <section className="relative">
      {/* ── Hero band ────────────────────────────── */}
      <div className="relative bg-[#FAF8F4] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-[#D4755B]/8 to-transparent" />
          <div className="absolute -top-24 right-0 w-[480px] h-[480px] bg-[#D4755B]/8 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-[1200px] mx-auto px-6 pt-32 pb-14">
          <div className="text-center max-w-[760px] mx-auto">
            <h1 className="font-fraunces text-4xl md:text-5xl lg:text-6xl leading-tight text-[#221410] mb-6 [text-wrap:balance]">
              Find Properties with<br />
              <span className="text-[#D4755B]">AI Intelligence</span>
            </h1>

            <p className="font-manrope text-lg text-[#57534E] max-w-[620px] mx-auto leading-relaxed">
              Tell us where you want to live — we search live listings on 99acres,
              MagicBricks &amp; Housing.com, then rank the best matches for your budget.
            </p>
          </div>

          {/* ── How it works — real 3-step sequence ── */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-[880px] mx-auto">
            {[
              { n: '1', title: 'Tell us what you need', desc: 'City, budget and home type — takes 30 seconds.' },
              { n: '2', title: 'We scan live listings', desc: 'Real properties from 99acres, MagicBricks & Housing.com.' },
              { n: '3', title: 'AI ranks your matches', desc: 'Scored, flagged and explained — best value first.' },
            ].map((s) => (
              <div key={s.n} className="flex items-start gap-3 bg-white border border-[#E6E0DA] rounded-xl px-4 py-3.5">
                <span className="font-fraunces text-xl text-[#D4755B] leading-none mt-0.5">{s.n}</span>
                <div className="text-left">
                  <p className="font-manrope text-sm font-semibold text-[#221410]">{s.title}</p>
                  <p className="font-manrope text-xs text-[#6B7280] mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── API key status strip ── */}
          <div className="max-w-[880px] mx-auto mt-8">
            {keysReady ? (
              <div className="flex flex-wrap items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="font-manrope text-sm font-medium text-emerald-800 flex-1 min-w-[220px]">
                  Firecrawl key active — searches use your scraping quota, AI analysis runs on our servers.
                </p>
                <button
                  onClick={() => setShowKeyModal(true)}
                  className="flex items-center gap-1.5 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 text-emerald-700 font-manrope font-bold text-xs px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                >
                  <KeyRound className="w-3.5 h-3.5" /> Manage Key
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="font-manrope text-sm font-medium text-amber-800 flex-1 min-w-[220px]">
                  Add your <strong className="text-amber-900 font-bold">free</strong> Firecrawl key to search live listings — takes 2 minutes, no card needed.
                </p>
                <button
                  onClick={() => setShowKeyModal(true)}
                  className="flex items-center gap-1.5 bg-amber-100 hover:bg-amber-200 border border-amber-200 text-amber-800 font-manrope font-bold text-xs px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                >
                  <KeyRound className="w-3.5 h-3.5" /> Add Free Key
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Light form area ──────────────────────── */}
      <div className="bg-[#FAF8F4] px-6 pt-10 pb-24">

        {/* ── AI Model Selector ───────────────────── */}
        {availableModels.length > 0 && (
          <div className="max-w-[900px] mx-auto mb-4 relative z-10">
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="font-space-mono text-[10px] text-[#9CA3AF] uppercase tracking-widest font-semibold">AI Model</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {availableModels.map(m => (
                <button
                  key={m.slug}
                  type="button"
                  onClick={() => setSelectedModel(m.slug)}
                  className={`flex-1 min-w-[140px] text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                    selectedModel === m.slug
                      ? 'bg-[#221410] border-[#D4755B] text-white shadow-md'
                      : 'bg-white border-[#E6E0DA] text-[#6B7280] hover:border-[#D4755B]/50 hover:text-[#1C1B1A]'
                  }`}
                >
                  <div className="font-semibold text-sm mb-0.5">{m.name}</div>
                  {m.badge && (
                    <div className={`text-[10px] font-medium ${selectedModel === m.slug ? 'text-[#D4755B]' : 'text-[#9CA3AF]'}`}>
                      {m.badge}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Search form card ─────────────────────── */}
        <div className="max-w-[900px] mx-auto relative z-10">
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-[#E6E0DA] shadow-sm rounded-2xl p-6 md:p-8"
          >
            {/* City */}
            <div className="mb-6">
              <label className="block font-manrope text-sm font-semibold text-[#221410] mb-2 ml-1">
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
                        className={`w-full text-left px-5 py-3.5 flex items-center gap-3 transition-[background-color,color] ${idx === highlightedIndex
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
                    className={`font-manrope text-sm px-4 py-2 rounded-full border transition-all ${city === c
                      ? 'bg-[#D4755B] border-[#D4755B] text-white font-medium shadow-sm'
                      : 'bg-white border-[#E6E0DA] text-[#6B7280] hover:border-[#D4755B]/50 hover:text-[#D4755B]'
                      }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Locality / Area ─────────────────────────────── */}
            <div className="mb-6">
              <label className="block font-manrope text-sm font-semibold text-[#221410] mb-2 ml-1">
                Specific Area <span className="font-normal text-[#6B7280]">(optional — narrows results the most)</span>
              </label>
              <div className="relative">
                <div className="relative bg-white border border-[#E6E0DA] rounded-xl p-4 flex items-center gap-3 focus-within:ring-2 focus-within:ring-[#D4755B]/30 focus-within:border-[#D4755B] transition-all shadow-sm">
                  <MapPin className="w-5 h-5 text-[#9CA3AF] shrink-0" />
                  <input
                    ref={localityInputRef}
                    type="text"
                    value={locality}
                    onChange={(e) => { setLocality(e.target.value); setLocalityHighlightedIndex(-1); }}
                    onFocus={() => { if (localitySuggestions.length > 0) setShowLocalitySuggestions(true); }}
                    onKeyDown={handleLocalityKeyDown}
                    className="flex-1 bg-transparent font-manrope text-base text-[#221410] outline-none placeholder:text-[#9CA3AF] placeholder:font-light"
                    placeholder={city.trim() ? `Search areas in ${city}…` : 'e.g. Powai, Andheri West, Koramangala…'}
                    autoComplete="off"
                  />
                </div>

                {/* Locality autocomplete dropdown */}
                {showLocalitySuggestions && localitySuggestions.length > 0 && (
                  <div
                    ref={localitySuggestionsRef}
                    className="absolute z-50 left-0 right-0 mt-2 bg-white border border-[#E6E0DA] rounded-xl shadow-xl overflow-hidden"
                  >
                    {localitySuggestions.map((loc, idx) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => selectLocality(loc)}
                        onMouseEnter={() => setLocalityHighlightedIndex(idx)}
                        className={`w-full text-left px-5 py-3.5 flex items-center gap-3 transition-[background-color,color] ${
                          idx === localityHighlightedIndex
                            ? 'bg-[#FAF8F4] text-[#221410]'
                            : 'text-[#6B7280] hover:bg-[#FAF8F4] hover:text-[#221410]'
                        }`}
                      >
                        <MapPin className="w-4 h-4 text-[#D4755B] shrink-0" />
                        <span className="font-manrope text-sm font-medium">{loc}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Budget · Type · Category */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              {/* Budget */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-manrope text-sm font-semibold text-[#221410] ml-1">
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
                <label className="block font-manrope text-sm font-semibold text-[#221410] mb-2 ml-1">
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
                <label className="block font-manrope text-sm font-semibold text-[#221410] mb-2 ml-1">
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

            {/* ── BHK + Possession — refinement row ──────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
              <div>
                <label className="block font-manrope text-sm font-semibold text-[#221410] mb-3 ml-1">
                  BHK Configuration
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['Any', '1BHK', '2BHK', '3BHK', '4BHK+'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setBhk(option)}
                      className={`font-manrope text-sm font-medium px-4 py-2 rounded-xl border transition-all ${
                        bhk === option
                          ? 'bg-[#D4755B] border-[#D4755B] text-white shadow-sm'
                          : 'bg-white border-[#E6E0DA] text-[#6B7280] hover:border-[#D4755B]/50 hover:text-[#D4755B]'
                      }`}
                    >
                      {option === 'Any' ? 'Any BHK' : option}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-manrope text-sm font-semibold text-[#221410] mb-3 ml-1">
                  Possession
                </label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { value: 'any',               label: 'Any' },
                    { value: 'ready',             label: 'Ready to Move' },
                    { value: 'underconstruction', label: 'Under Construction' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPossession(opt.value)}
                      className={`font-manrope text-sm font-medium px-4 py-2 rounded-xl border transition-all ${
                        possession === opt.value
                          ? 'bg-[#221410] border-[#221410] text-white shadow-sm'
                          : 'bg-white border-[#E6E0DA] text-[#6B7280] hover:border-[#221410]/30 hover:text-[#221410]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
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
                  Add your free Firecrawl key first
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#221410] border-b border-r border-[#E6E0DA]/20 rotate-45" />
                </div>
              )}
            </div>

            {loading && (
              <div className="mt-5 bg-[#FAF8F4] border border-[#E6E0DA] rounded-xl p-5">
                {/* 3-step progress */}
                <div className="space-y-4">
                  {LOAD_STEPS.map((s, i) => {
                    const stepNum = i + 1;
                    const isDone    = loadStep > stepNum;
                    const isActive  = loadStep === stepNum;
                    const isPending = loadStep < stepNum;
                    return (
                      <div key={s.label} className={`flex items-start gap-3 transition-opacity duration-500 ${isPending ? 'opacity-35' : 'opacity-100'}`}>
                        <div className="mt-0.5 shrink-0 w-5 h-5 flex items-center justify-center">
                          {isDone   ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          : isActive ? <Loader2 className="w-5 h-5 text-[#D4755B] animate-spin" />
                          :            <div className="w-4 h-4 rounded-full border-2 border-[#D4755B]/30" />}
                        </div>
                        <div>
                          <p className={`font-manrope text-sm font-semibold ${isDone ? 'text-[#6B7280] line-through decoration-[#9CA3AF]' : isActive ? 'text-[#221410]' : 'text-[#9CA3AF]'}`}>
                            {s.label}{isActive ? '…' : ''}
                          </p>
                          {isActive && (
                            <p className="font-manrope text-xs text-[#9CA3AF] mt-0.5">{s.desc}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Search context summary */}
                <p className="font-manrope text-xs text-[#9CA3AF] text-center mt-5 leading-relaxed">
                  {bhk !== 'Any' ? `${bhk} ` : ''}{propertyType.toLowerCase()}s
                  {locality ? ` in ${locality},` : ' in'} <span className="font-semibold text-[#6B7280]">{city}</span>
                  {' '}· under ₹{maxBudget} {budgetUnit} · usually takes 15–30 s
                </p>
              </div>
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