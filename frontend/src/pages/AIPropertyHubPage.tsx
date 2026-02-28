import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { useSEO } from '../hooks/useSEO';

/* ── Only import AI components when enabled ──────────────── */
const AI_HUB_ENABLED = import.meta.env.VITE_ENABLE_AI_HUB === 'true';

const AIHeroSection = AI_HUB_ENABLED ? React.lazy(() => import('../components/ai-hub/AIHeroSection')) : null;
const AISearchResults = AI_HUB_ENABLED ? React.lazy(() => import('../components/ai-hub/AISearchResults')) : null;
const AIAnalysisPanel = AI_HUB_ENABLED ? React.lazy(() => import('../components/ai-hub/AIAnalysisPanel')) : null;
const AILocationTrends = AI_HUB_ENABLED ? React.lazy(() => import('../components/ai-hub/AILocationTrends')) : null;
const AICTASection = AI_HUB_ENABLED ? React.lazy(() => import('../components/ai-hub/AICTASection')) : null;

let aiAPI: any = null;
if (AI_HUB_ENABLED) {
  import('../services/api').then((mod) => { aiAPI = mod.aiAPI; });
}

/* ── Backend response types ─────────────────────────────── */

export interface ScrapedProperty {
  building_name: string;
  property_type: string;
  location_address: string;
  price: string;
  description: string;
  amenities: string[];
  area_sqft: string;
  property_url?: string;
}

export interface PropertyOverview {
  name: string;
  price: string;
  area: string;
  location: string;
  highlight: string;
}

export interface PropertyAnalysis {
  overview: PropertyOverview[];
  best_value: { name: string; reason: string } | null;
  recommendations: string[];
  error?: string;
}

export interface LocationData {
  location: string;
  price_per_sqft: string;
  percent_increase: string;
  rental_yield: string;
}

export interface TrendDetail {
  location: string;
  price_per_sqft: string;
  yearly_change_pct: string;
  rental_yield_pct: string;
  outlook: string;
}

export interface LocationAnalysis {
  trends: TrendDetail[];
  top_appreciation: { location: string; reason: string } | null;
  best_rental_yield: { location: string; reason: string } | null;
  investment_tips: string[];
  error?: string;
}

export interface SearchParams {
  city: string;
  maxBudget: number;       // value in Crores
  propertyType: string;
  category: string;
}

/* ── Production landing page ────────────────────────────── */

const GITHUB_URL = 'https://github.com/AAYUSH412/Real-Estate-Website';

const AIHubProductionPage: React.FC = () => {
  const features = [
    {
      icon: 'search',
      title: 'Smart Property Search',
      description: 'Search across cities with AI-powered filters for budget, property type, and category.',
    },
    {
      icon: 'analytics',
      title: 'Market Analysis',
      description: 'Get GPT-4.1 powered analysis with best value picks and personalized recommendations.',
    },
    {
      icon: 'trending_up',
      title: 'Location Trends',
      description: 'Real-time price trends, rental yields, appreciation rates, and investment insights.',
    },
    {
      icon: 'lightbulb',
      title: 'Investment Tips',
      description: 'AI-generated investment tips based on market data and location analysis.',
    },
  ];

  const steps = [
    { step: '01', title: 'Clone the Repository', command: `git clone ${GITHUB_URL}.git` },
    { step: '02', title: 'Install Dependencies', command: 'cd frontend && npm install' },
    { step: '03', title: 'Set Up Environment', command: 'cp .env.example .env  # Add your API keys' },
    { step: '04', title: 'Run Locally', command: 'npm run dev' },
  ];

  return (
    <div className="bg-[#FAF8F4]">
      {/* Hero Section */}
      <section className="relative bg-[#221410] overflow-hidden">
        {/* Decorative blurs */}
        <div className="absolute top-20 right-20 w-80 h-80 bg-[rgba(212,117,91,0.15)] rounded-full blur-[80px]" />
        <div className="absolute bottom-10 left-10 w-60 h-60 bg-[rgba(212,117,91,0.1)] rounded-full blur-[60px]" />

        <div className="max-w-[1280px] mx-auto px-8 pt-32 pb-20 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-3 bg-[rgba(212,117,91,0.15)] border border-[rgba(212,117,91,0.3)] rounded-full px-5 py-2.5 mb-8">
              <span className="font-material-icons text-[#D4755B] text-lg">smart_toy</span>
              <span className="font-manrope font-bold text-sm text-[#D4755B] uppercase tracking-wider">
                AI-Powered Feature
              </span>
            </div>

            <h1 className="font-fraunces text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              AI Property Hub
            </h1>
            <p className="font-manrope text-lg text-[#9ca3af] leading-relaxed mb-10 max-w-2xl mx-auto">
              Our AI Property Hub uses GPT-4.1 to analyze real estate data, provide market insights,
              and help you find the perfect property. This feature is available when you run the project locally.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#D4755B] text-white font-manrope font-bold text-lg px-8 py-4 rounded-xl shadow-lg hover:bg-[#B86851] transition-all hover:shadow-xl inline-flex items-center gap-3"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                View on GitHub
              </a>
              <Link
                to="/properties"
                className="border-2 border-[rgba(255,255,255,0.2)] text-white font-manrope font-bold text-lg px-8 py-4 rounded-xl hover:border-[#D4755B] hover:text-[#D4755B] transition-all inline-flex items-center gap-2"
              >
                Browse Properties
                <span className="font-material-icons text-sm">arrow_forward</span>
              </Link>
            </div>

            {/* Info Banner */}
            <div className="bg-[rgba(212,117,91,0.1)] border border-[rgba(212,117,91,0.25)] rounded-2xl p-6 max-w-xl mx-auto">
              <div className="flex items-start gap-3">
                <span className="font-material-icons text-[#D4755B] text-xl mt-0.5">info</span>
                <p className="font-manrope text-sm text-[#d1c4b7] text-left leading-relaxed">
                  The AI Property Hub requires API credits to operate. To save deployment costs, this feature is
                  disabled on the live site. Clone the repo and run it locally to experience the full AI capabilities.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-[1280px] mx-auto px-8 py-20">
        <div className="text-center mb-14">
          <h2 className="font-fraunces text-3xl lg:text-4xl font-bold text-[#111827] mb-4">
            What You'll Get Locally
          </h2>
          <p className="font-manrope text-[#6b7280] max-w-xl mx-auto">
            All these AI-powered features are fully functional when you run the project on your machine.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white border border-[#E6D5C3] rounded-2xl p-6 hover:shadow-lg hover:border-[#D4755B]/30 transition-all group"
            >
              <div className="w-12 h-12 bg-[rgba(212,117,91,0.1)] rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#D4755B] transition-colors">
                <span className="font-material-icons text-[#D4755B] group-hover:text-white transition-colors">
                  {feature.icon}
                </span>
              </div>
              <h3 className="font-syne font-bold text-lg text-[#111827] mb-2">{feature.title}</h3>
              <p className="font-manrope text-sm text-[#6b7280] leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Setup Steps */}
      <section className="bg-[#F5F1E8] py-20">
        <div className="max-w-[1280px] mx-auto px-8">
          <div className="text-center mb-14">
            <h2 className="font-fraunces text-3xl lg:text-4xl font-bold text-[#111827] mb-4">
              Get Started in 4 Steps
            </h2>
            <p className="font-manrope text-[#6b7280] max-w-xl mx-auto">
              Set up the project locally and start using the AI Property Hub in minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((item) => (
              <div key={item.step} className="bg-white rounded-2xl p-6 border border-[#E6D5C3]">
                <span className="font-space-mono text-4xl font-bold text-[#D4755B]/20 block mb-3">
                  {item.step}
                </span>
                <h3 className="font-syne font-bold text-lg text-[#111827] mb-3">{item.title}</h3>
                <code className="block bg-[#221410] text-[#D4755B] font-space-mono text-xs rounded-lg p-3 overflow-x-auto">
                  {item.command}
                </code>
              </div>
            ))}
          </div>

          {/* GitHub CTA */}
          <div className="text-center mt-12">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-[#221410] text-white font-manrope font-bold px-8 py-4 rounded-xl hover:bg-[#3a2419] transition-all shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
              Download from GitHub
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

/* ── Main page component ────────────────────────────────── */

const AIPropertyHubPage: React.FC = () => {
  useSEO({
    title: 'AI Property Hub',
    description: 'AI-powered property search, market analysis, location trends, and investment insights for India real estate.',
  });

  /* ── AI Hub disabled → show "download & run locally" page ── */
  if (!AI_HUB_ENABLED) {
    return (
      <div className="bg-[#FAF8F4] min-h-screen">
        <Navbar />
        <AIHubProductionPage />
        <Footer />
      </div>
    );
  }

  /* ── Development → full AI Hub functionality ────────── */
  return <AIHubDevPage />;
};

/* ── Dev-only component (full AI functionality) ─────────── */

const AIHubDevPage: React.FC = () => {
  // ── P3-1: Resolve aiAPI via useEffect to avoid race condition ────────────────────────────────
  const [apiReady, setApiReady] = useState(false);
  const [aiApiRef, setAiApiRef] = useState<any>(null);

  useEffect(() => {
    if (!AI_HUB_ENABLED) return;
    import('../services/api').then((mod) => {
      setAiApiRef(() => mod.aiAPI);
      setApiReady(true);
    });
  }, []);

  // Search
  const [searchParams, setSearchParams] = useState<SearchParams>({
    city: '',
    maxBudget: 2,
    propertyType: 'Flat',
    category: 'Residential',
  });

  // Results
  const [properties, setProperties] = useState<ScrapedProperty[]>([]);
  const [analysis, setAnalysis] = useState<PropertyAnalysis | null>(null);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [locationAnalysis, setLocationAnalysis] = useState<LocationAnalysis | null>(null);

  // UI flags
  const [searchLoading, setSearchLoading] = useState(false);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [trendsError, setTrendsError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [hasLoadedTrends, setHasLoadedTrends] = useState(false);
  // For P1-1: auto-open key modal on 403
  const [openKeyModal, setOpenKeyModal] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);


  /* ── Handlers ────────────────────────────────────────── */

  /** P1-1 — Turn an axios error into a user-friendly message. */
  const friendlyError = (err: any, fallback: string): { msg: string; isKeyError: boolean } => {
    const status = err?.response?.status;
    const serverMsg = err?.response?.data?.message || '';
    const serverCode = err?.response?.data?.error || '';

    if (status === 403 || serverCode === 'KEYS_REQUIRED') {
      return { msg: 'Your API keys are missing or invalid. Please add your GitHub Models and Firecrawl keys.', isKeyError: true };
    }
    if (status === 429 || serverCode === 'RATE_LIMIT_EXCEEDED') {
      return { msg: 'Rate limit reached — you’ve used 10 AI searches this hour. Please wait before searching again.', isKeyError: false };
    }
    if (status === 503 || serverCode === 'FIRECRAWL_ERROR') {
      return { msg: 'The property scraping service is temporarily unavailable. Please try again in a few minutes.', isKeyError: false };
    }
    if (status === 404) {
      return { msg: serverMsg || 'No results found for your search criteria.', isKeyError: false };
    }
    return { msg: serverMsg || fallback, isKeyError: false };
  };

  const handleSearch = async (params: SearchParams) => {
    if (!apiReady || !aiApiRef) return;
    setSearchParams(params);
    setSearchLoading(true);
    setSearchError(null);
    setProperties([]);
    setAnalysis(null);
    setHasSearched(true);
    // Reset trends on new search
    setLocations([]);
    setLocationAnalysis(null);
    setHasLoadedTrends(false);

    try {
      const maxPriceInRupees = params.maxBudget * 10_000_000; // Cr → ₹
      const response = await aiApiRef.search({
        city: params.city,
        price: { min: 0, max: maxPriceInRupees },
        type: params.propertyType,
        category: params.category,
      });

      const data = response.data;
      setProperties(data.properties || []);
      setAnalysis(data.analysis || null);

      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      const { msg, isKeyError } = friendlyError(err, 'Search failed. Please try again.');
      setSearchError(msg);
      if (isKeyError) setOpenKeyModal(true); // P1-1: auto-open key modal on 403
    } finally {
      setSearchLoading(false);
    }
  };

  // P2-2: Trends are NOT auto-fired. User explicitly clicks "Load Location Trends".
  const fetchTrends = async (city: string) => {
    if (!apiReady || !aiApiRef) return;
    setTrendsLoading(true);
    setTrendsError(null);
    setLocations([]);
    setLocationAnalysis(null);
    setHasLoadedTrends(true);

    try {
      const response = await aiApiRef.locationTrends(city);
      const data = response.data;
      setLocations(data.locations || []);
      setLocationAnalysis(data.analysis || null);
    } catch (err: any) {
      const { msg, isKeyError } = friendlyError(err, 'Failed to load location trends.');
      setTrendsError(msg);
      if (isKeyError) setOpenKeyModal(true);
    } finally {
      setTrendsLoading(false);
    }
  };


  /* ── Render ──────────────────────────────────────────── */

  return (
    <div className="bg-[#FAF8F4] min-h-screen">
      <Navbar />

      {/* Hero — search form */}
      {AIHeroSection && (
        <React.Suspense fallback={<div className="h-96 flex items-center justify-center"><div className="w-12 h-12 border-4 border-[#D4755B] border-t-transparent rounded-full animate-spin" /></div>}>
          <AIHeroSection
            onSearch={handleSearch}
            loading={searchLoading}
            externalOpenModal={openKeyModal}
            onModalClosed={() => setOpenKeyModal(false)}
          />
        </React.Suspense>
      )}

      {/* Results (only shown after first search) */}
      <div ref={resultsRef}>
        {hasSearched && AISearchResults && AIAnalysisPanel && (
          <React.Suspense fallback={null}>
            <AISearchResults
              properties={properties}
              loading={searchLoading}
              error={searchError}
              city={searchParams.city}
            />

            <AIAnalysisPanel
              analysis={analysis}
              loading={searchLoading}
              error={searchError}
              city={searchParams.city}
            />
          </React.Suspense>
        )}
      </div>

      {/* P2-2: Location trends — explicit button, not auto-fired */}
      {hasSearched && !searchLoading && properties.length > 0 && AILocationTrends && (
        <React.Suspense fallback={null}>
          {!hasLoadedTrends ? (
            <section className="bg-[#FAF8F4] py-10 border-t border-[#E6E0DA]">
              <div className="max-w-[1200px] mx-auto px-6 text-center">
                <p className="font-manrope text-sm text-[#6b7280] mb-4">
                  Want to see price trends and rental yields for {searchParams.city}?
                </p>
                <button
                  onClick={() => fetchTrends(searchParams.city)}
                  className="inline-flex items-center gap-2 bg-[#D4755B] hover:bg-[#C05621] text-white font-manrope font-semibold text-sm px-6 py-3 rounded-xl transition-all shadow-md shadow-[#D4755B]/20"
                >
                  <span className="text-base">&#x1F4C8;</span>
                  Load Location Trends
                </button>
              </div>
            </section>
          ) : (
            <AILocationTrends
              locations={locations}
              analysis={locationAnalysis}
              loading={trendsLoading}
              error={trendsError}
              city={searchParams.city}
            />
          )}
        </React.Suspense>
      )}

      {AICTASection && (
        <React.Suspense fallback={null}>
          <AICTASection />
        </React.Suspense>
      )}
      <Footer />
    </div>
  );
};

export default AIPropertyHubPage;

