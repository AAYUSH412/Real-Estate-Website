import PaginationControls, { type PageMetadata } from '../components/common/PaginationControls';
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import FilterBar, { FilterState } from '../components/properties/FilterBar';
import PropertiesGrid from '../components/properties/PropertiesGrid';
import LoadingState from '../components/common/LoadingState';
import { propertiesAPI } from '../services/api';
import { useSEO } from '../hooks/useSEO';

export interface Property {
  _id: string;
  title: string;
  location: string;
  price: number;
  image: string[];
  beds: number;
  baths: number;
  sqft: number;
  type: string;
  availability: string;
  description: string;
  amenities: string[];
  phone: string;
}

const PropertiesPage: React.FC = () => {
  useSEO({
    title: 'Browse Properties in Mumbai, Delhi, Bangalore & More',
    description: 'Browse flats, villas, apartments, and houses for sale or rent in Mumbai, Delhi, Bangalore, Ahmedabad, and Pune. Filter by price, bedrooms, and location.',
    url: 'https://buildestate.vercel.app/properties',
  });

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('featured');
  const [filters, setFilters] = useState<FilterState>({});
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PageMetadata | null>(null);
  const changeFilters = useCallback((next: FilterState) => { setFilters(next); setPage(1); }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const { data } = await propertiesAPI.getAll({
          page, sort: sortBy, location: filters.location, type: filters.propertyType?.join(','),
          availability: filters.availability, bedrooms: filters.bedrooms, bathrooms: filters.bathrooms,
          minPrice: filters.priceRange ? filters.priceRange[0] * 1_000_000 : undefined,
          maxPrice: filters.priceRange && filters.priceRange[1] < 200 ? filters.priceRange[1] * 1_000_000 : undefined,
          amenities: filters.amenities?.join(','),
        }, controller.signal);
        if (!controller.signal.aborted) { setProperties(data.property); setPagination(data.pagination); }
      } catch {
        if (!controller.signal.aborted) setError('Failed to load properties. Please try again later.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [page, sortBy, filters]);

  const filteredProperties = properties;

  return (
    <div className="bg-[#FAF8F4] min-h-screen">
      <Navbar />

      {/* ── Sticky filter bar ── */}
      <FilterBar
        totalProperties={pagination?.totalProperties || 0}
        sortBy={sortBy}
        onSortChange={value => { setSortBy(value); setPage(1); }}
        viewMode={viewMode}
        onViewChange={setViewMode}
        onFilterChange={changeFilters}
      />

      {/* ── Page title ── */}
      <div className="max-w-[1440px] mx-auto px-6 pt-8 pb-2">
        <h1 className="font-fraunces text-3xl font-semibold text-[#221410]">All Properties</h1>
      </div>

      {/* ── Content ── */}
      {loading && <LoadingState message="Loading properties…" />}

      {error && !loading && (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <span className="material-icons text-4xl text-[#D4755B] mb-4 block">error_outline</span>
            <p className="font-manrope text-[#374151] mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#D4755B] text-white font-manrope font-bold px-6 py-2.5 rounded-xl hover:bg-[#B86851] active:scale-[0.96] transition-all"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {!loading && !error && filteredProperties.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center py-24"
        >
          <div className="text-center">
            <span className="material-icons text-5xl text-[#D4C4BC] mb-4 block">search_off</span>
            <p className="font-fraunces text-xl text-[#221410] mb-2">No properties found</p>
            <p className="font-manrope text-sm text-[#6B7280]">Try adjusting your filters</p>
          </div>
        </motion.div>
      )}

      {!loading && !error && filteredProperties.length > 0 && (
        <PropertiesGrid properties={filteredProperties} viewMode={viewMode} />
      )}

      {!loading && !error && <PaginationControls pagination={pagination} onPageChange={setPage} />}
      <Footer />
    </div>
  );
};

export default PropertiesPage;
