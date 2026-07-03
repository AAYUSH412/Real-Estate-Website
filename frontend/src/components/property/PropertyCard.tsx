import React from 'react';

// Placeholder for PropertyCard component
// Will be implemented in the next iteration

interface PropertyCardProps {
  id: string;
  image: string;
  title: string;
  location: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  featured?: boolean;
  aiMatch?: number;
}

const PropertyCard: React.FC<PropertyCardProps> = ({
  image,
  title,
  location,
  price,
  beds,
  baths,
  sqft,
  featured,
  aiMatch,
}) => {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all hover:-translate-y-2 cursor-pointer">
      <div className="relative h-64">
        <img src={image} alt={title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
        {featured && (
          <div className="absolute top-4 left-4 bg-[#D4755B] text-white px-3 py-1 rounded-lg font-manrope font-bold text-xs">
            FEATURED
          </div>
        )}
        {aiMatch && (
          <div className="absolute top-4 right-4 bg-[rgba(212,117,91,0.1)] px-2 py-1 rounded">
            <span className="font-manrope font-bold text-xs text-[#D4755B]">AI MATCH: {aiMatch}%</span>
          </div>
        )}
      </div>
      <div className="p-6">
        <h3 className="font-fraunces text-xl font-bold text-[#111827] mb-2">{title}</h3>
        <p className="font-space-mono text-sm text-[#6b7280] uppercase tracking-wide mb-4">{location}</p>
        <div className="border-t border-[#e5e7eb] pt-4 flex items-center justify-between">
          <span className="font-space-mono text-lg font-bold text-[#111827]">
            ${price.toLocaleString()}
          </span>
          <div className="flex items-center gap-4 text-[#4b5563]">
            <div className="flex items-center gap-1">
              <span className="font-material-icons text-sm">bed</span>
              <span className="font-manrope text-sm">{beds}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-material-icons text-sm">shower</span>
              <span className="font-manrope text-sm">{baths}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-material-icons text-sm">square_foot</span>
              <span className="font-manrope text-sm">{sqft}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;