import React from 'react';
import { motion, type Variants } from 'framer-motion';
import PropertyCard from './PropertyCard';
import type { Property } from '../../pages/PropertiesPage';
import { formatPrice } from '../../utils/formatPrice';
import { Link } from 'react-router-dom';
import { MapPin, Bed, Bath, Maximize2 } from 'lucide-react';

const fallbackImages = [
  "https://images.unsplash.com/photo-1622015663381-d2e05ae91b72?w=800",
  "https://images.unsplash.com/photo-1695067440629-b5e513976100?w=800",
  "https://images.unsplash.com/photo-1738168279272-c08d6dd22002?w=800",
  "https://images.unsplash.com/photo-1769428003672-296f923d19b2?w=800",
  "https://images.unsplash.com/photo-1761509386107-9baefe0073f2?w=800",
  "https://images.unsplash.com/photo-1762732793012-8bdab3af00b4?w=800",
];

interface PropertiesGridProps {
  properties: Property[];
  viewMode?: 'grid' | 'list';
}

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

// List view row — more compact than the card
const PropertyRow: React.FC<{ property: Property; index: number }> = ({ property, index }) => {
  const img = property.image?.[0] || fallbackImages[index % fallbackImages.length];
  const badge = property.availability === 'sold' ? 'SOLD'
    : property.availability === 'rent' ? 'FOR RENT'
    : property.availability === 'sale' ? 'FOR SALE'
    : property.availability?.toUpperCase();

  return (
    <Link to={`/property/${property._id}`} className="group block outline-none focus-visible:ring-2 focus-visible:ring-[#D4755B] rounded-2xl">
      <div className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.09)] transition-shadow duration-300 flex gap-0">
        {/* Thumbnail */}
        <div className="relative w-52 shrink-0 overflow-hidden">
          <img
            src={img}
            alt={property.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            style={{ outline: '1px solid rgba(0,0,0,0.07)', outlineOffset: '-1px' }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />
          {badge && (
            <div className="absolute top-3 left-3 px-2 py-0.5 rounded font-space-mono text-[10px] font-bold text-white bg-[#10B981]">
              {badge}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 px-6 py-5 flex flex-col justify-between">
          <div>
            <h3 className="font-fraunces text-lg font-semibold text-[#221410] mb-1 leading-snug">{property.title}</h3>
            <div className="flex items-center gap-1 mb-3">
              <MapPin className="w-3.5 h-3.5 text-[#D4755B] shrink-0" />
              <span className="font-manrope text-sm text-[#6B7280]">{property.location}</span>
            </div>
            <div className="flex items-center gap-4 font-manrope text-sm text-[#6B7280]">
              <span className="flex items-center gap-1.5"><Bed className="w-4 h-4" />{property.beds} Beds</span>
              <span className="flex items-center gap-1.5"><Bath className="w-4 h-4" />{property.baths} Baths</span>
              <span className="flex items-center gap-1.5"><Maximize2 className="w-4 h-4" />{property.sqft.toLocaleString()} sqft</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <p className="font-fraunces text-2xl font-bold text-[#D4755B] tabular-nums">
              {formatPrice(property.price)}
            </p>
            {property.type && (
              <span className="font-manrope text-xs uppercase tracking-wider text-[#9CA3AF] border border-[#E6E0DA] rounded px-2 py-0.5">
                {property.type}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

const PropertiesGrid: React.FC<PropertiesGridProps> = ({ properties, viewMode = 'grid' }) => {
  return (
    <div className="max-w-[1440px] mx-auto px-6 pb-16 pt-4">
      {viewMode === 'grid' ? (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
        >
          {properties.map((property, index) => (
            <motion.div key={property._id} variants={item}>
              <PropertyCard
                id={property._id}
                image={property.image?.[0] || fallbackImages[index % fallbackImages.length]}
                name={property.title}
                price={formatPrice(property.price)}
                location={property.location}
                beds={property.beds}
                baths={property.baths}
                sqft={property.sqft}
                badge={
                  property.availability === 'sold' ? 'SOLD' :
                  property.availability === 'rent' ? 'FOR RENT' :
                  property.availability === 'sale' ? 'FOR SALE' :
                  property.availability?.toUpperCase()
                }
                tags={property.type ? [property.type] : []}
              />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-4"
        >
          {properties.map((property, index) => (
            <motion.div key={property._id} variants={item}>
              <PropertyRow property={property} index={index} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default PropertiesGrid;
