import React from 'react';
import { MapPin, Maximize, Building2, Loader2, SearchX, Home } from 'lucide-react';
import type { ScrapedProperty } from '../../pages/AIPropertyHubPage';

interface Props {
  properties: ScrapedProperty[];
  loading: boolean;
  error: string | null;
  city: string;
}

/* ── Property card ──────────────────────────────────────── */

const PropertyCard: React.FC<{ property: ScrapedProperty }> = ({ property }) => {
  const handleClick = () => {
    if (property.property_url) {
      window.open(property.property_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white border border-[#E6E0DA]/60 rounded-2xl overflow-hidden hover:shadow-[0_20px_40px_-15px_rgba(212,117,91,0.15)] hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative"
    >
      {/* Subtle gradient accent bar */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#D4755B] to-amber-500 opacity-60 group-hover:opacity-100 transition-opacity" />

      <div className="p-7">
        {/* Type badge */}
        <div className="mb-4">
          <span className="inline-flex items-center gap-1.5 bg-[#FAF8F4] border border-[#E6E0DA] rounded-full px-3.5 py-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#D4755B]" />
            <span className="font-space-mono text-[11px] text-[#6B7280] font-semibold tracking-wider uppercase">
              {property.property_type || 'Property'}
            </span>
          </span>
        </div>

        {/* Name */}
        <h3 className="font-syne text-[22px] font-bold text-[#221410] mb-2.5 leading-tight line-clamp-2 group-hover:text-[#D4755B] transition-colors">
          {property.building_name || 'Premium Property'}
        </h3>

        {/* Location */}
        <div className="flex items-start gap-2 mb-6">
          <MapPin className="w-4 h-4 text-[#D4755B]/60 mt-0.5 shrink-0" />
          <span className="font-manrope text-sm text-[#6B7280] leading-snug line-clamp-2">
            {property.location_address || 'Location not specified'}
          </span>
        </div>

        {/* Price & Area Box */}
        <div className="flex items-center justify-between bg-[#FAF8F4] border border-[#E6E0DA]/50 rounded-xl p-4 mb-6">
          <div>
            <div className="font-space-mono text-[10px] text-[#9CA3AF] font-bold tracking-widest uppercase mb-1">
              Price
            </div>
            <div className="font-manrope font-extrabold text-[#D4755B] text-xl">
              {property.price || 'Contact'}
            </div>
          </div>

          {property.area_sqft && (
            <div className="text-right border-l border-[#E6E0DA] pl-4">
              <div className="font-space-mono text-[10px] text-[#9CA3AF] font-bold tracking-widest uppercase mb-1 flex items-center gap-1.5 justify-end">
                <Maximize className="w-3 h-3" /> Area
              </div>
              <div className="font-manrope font-semibold text-[#221410] text-sm">
                {property.area_sqft} sq.ft
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {property.description && (
          <p className="font-manrope text-sm text-[#6B7280] line-clamp-2 mb-5 leading-relaxed">
            {property.description}
          </p>
        )}

        {/* Amenities */}
        {property.amenities?.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {property.amenities.slice(0, 3).map((amenity, i) => (
              <span
                key={i}
                className="font-manrope font-medium text-[11px] text-[#4B5563] bg-white border border-[#E6E0DA] rounded-lg px-2.5 py-1.5 shadow-sm"
              >
                {amenity}
              </span>
            ))}
            {property.amenities.length > 3 && (
              <span className="font-manrope font-bold text-[11px] text-[#D4755B] bg-[#D4755B]/10 rounded-lg px-2.5 py-1.5">
                +{property.amenities.length - 3}
              </span>
            )}
          </div>
        )}

        {/* External Link Indicator */}
        {property.property_url && (
          <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-white/80 backdrop-blur border border-[#E6E0DA] rounded-full p-2 shadow-sm text-[#D4755B] hover:bg-[#D4755B] hover:text-white transition-colors cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 7h10v10" /><path d="M7 17 17 7" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Main section ───────────────────────────────────────── */

const AISearchResults: React.FC<Props> = ({ properties, loading, error, city }) => {
  /* Loading skeleton (Modern pulsing state) */
  if (loading) {
    return (
      <section className="bg-[#FAF8F4] py-20 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,117,91,0.03)_0%,transparent_100%)] pointer-events-none" />

        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-3 bg-white border border-[#E6E0DA] shadow-sm rounded-full px-5 py-2.5 mb-8 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-[#D4755B] animate-ping" />
              <span className="font-space-mono text-xs text-[#6B7280] font-bold uppercase tracking-wider">
                AI is searching the market...
              </span>
            </div>
            <h2 className="font-syne text-4xl text-[#221410] mb-4 font-bold">
              Gathering Intelligence
            </h2>
            <p className="font-manrope text-lg text-[#6B7280] mb-2">
              Scraping live listings in {city} and scoring investment potential.
            </p>
          </div>

          {/* Skeleton cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white/60 backdrop-blur-sm border border-white rounded-2xl p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-pulse"
              >
                <div className="h-6 w-24 bg-[#E6E0DA]/60 rounded-full mb-6" />
                <div className="space-y-3">
                  <div className="h-7 bg-[#E6E0DA]/80 rounded-lg w-full" />
                  <div className="h-7 bg-[#E6E0DA]/80 rounded-lg w-2/3 mb-6" />

                  <div className="h-4 bg-[#E6E0DA]/50 rounded md w-3/4 mb-8" />

                  <div className="h-20 bg-[#FAF8F4] border border-[#E6E0DA]/40 rounded-xl mb-6" />

                  <div className="flex gap-2">
                    <div className="h-8 bg-[#E6E0DA]/40 rounded-lg w-20" />
                    <div className="h-8 bg-[#E6E0DA]/40 rounded-lg w-24" />
                    <div className="h-8 bg-[#E6E0DA]/40 rounded-lg w-16" />
                  </div>
                </div>
              </div>
            ))}
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
          <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <SearchX className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="font-syne text-2xl text-[#221410] mb-2">Search Failed</h3>
          <p className="font-manrope font-light text-[#6b7280]">{error}</p>
        </div>
      </section>
    );
  }

  /* Empty */
  if (properties.length === 0) {
    return (
      <section className="bg-[#FAF8F4] py-16">
        <div className="max-w-[600px] mx-auto px-6 text-center">
          <div className="w-16 h-16 bg-[#D4755B]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Home className="w-8 h-8 text-[#D4755B]" />
          </div>
          <h3 className="font-syne text-2xl text-[#221410] mb-2">No Properties Found</h3>
          <p className="font-manrope font-light text-[#6b7280]">
            No properties found in {city} within your budget. Try increasing
            your budget or changing the property type.
          </p>
        </div>
      </section>
    );
  }

  /* Results */
  return (
    <section className="bg-[#FAF8F4] py-16">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Header */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="font-space-mono text-[11px] text-[#D4755B] font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#D4755B] animate-pulse" />
              Live AI Results
            </div>
            <h2 className="font-syne text-4xl font-bold text-[#221410] mb-2">
              Properties in {city}
            </h2>
            <p className="font-manrope text-lg text-[#6B7280]">
              Our AI found <strong className="text-[#221410]">{properties.length}</strong>{' '}
              {properties.length === 1 ? 'match' : 'matches'} for your criteria.
            </p>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {properties.map((property, index) => (
            <PropertyCard key={index} property={property} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default AISearchResults;
