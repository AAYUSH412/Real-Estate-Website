import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MapPin } from 'lucide-react';

interface PropertyCardProps {
  id: string;
  image: string;
  name: string;
  price: string;
  location: string;
  beds: number;
  baths: number;
  sqft: number;
  badge?: string;
  tags?: string[];
}

const badgeColor: Record<string, string> = {
  'FOR RENT': 'bg-blue-500',
  'SOLD': 'bg-[#6B7280]',
  'HOT': 'bg-[#D4755B]',
};

const PropertyCard: React.FC<PropertyCardProps> = ({
  id, image, name, price, location, beds, baths, sqft, badge, tags = []
}) => {
  const [favorited, setFavorited] = useState(false);

  return (
    <Link to={`/property/${id}`} className="group block outline-none focus-visible:ring-2 focus-visible:ring-[#D4755B] rounded-2xl">
      <article className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.10)] transition-shadow duration-300">

        {/* ── Image ──────────────────────────────────────── */}
        <div className="relative aspect-[4/3] overflow-hidden bg-[#E6E0DA]">
          <img
            src={image}
            alt={name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            style={{ outline: '1px solid rgba(0,0,0,0.08)', outlineOffset: '-1px' }}
          />

          {/* Dark gradient — price lives here */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

          {/* Badge */}
          {badge && (
            <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-md font-space-mono text-[10px] font-bold text-white tracking-wider ${badgeColor[badge] ?? 'bg-[#10B981]'}`}>
              {badge}
            </div>
          )}

          {/* Favourite */}
          <button
            aria-label={favorited ? 'Remove from favourites' : 'Add to favourites'}
            onClick={e => { e.preventDefault(); setFavorited(f => !f); }}
            className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/40 transition-colors duration-200 active:scale-[0.96]"
          >
            <Heart
              className={`w-4 h-4 transition-colors duration-200 ${favorited ? 'text-[#D4755B] fill-[#D4755B]' : 'text-white'}`}
            />
          </button>

          {/* Price overlay — bottom of image */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-8">
            <p className="font-fraunces text-2xl font-bold text-white leading-none tabular-nums">
              {price}
            </p>
          </div>
        </div>

        {/* ── Content ────────────────────────────────────── */}
        <div className="px-4 py-4">
          {/* Name */}
          <h3 className="font-fraunces text-base font-semibold text-[#221410] leading-snug mb-1.5 text-wrap-balance line-clamp-2">
            {name}
          </h3>

          {/* Location */}
          <div className="flex items-center gap-1 mb-3">
            <MapPin className="w-3.5 h-3.5 text-[#D4755B] shrink-0" aria-hidden />
            <span className="font-manrope text-xs text-[#6B7280] truncate">{location}</span>
          </div>

          {/* Specs — dot-separated, no icons */}
          <div className="flex items-center gap-1.5 font-manrope text-xs text-[#6B7280] tabular-nums">
            <span>{beds} {beds === 1 ? 'Bed' : 'Beds'}</span>
            <span className="text-[#D4C4BC]">·</span>
            <span>{baths} {baths === 1 ? 'Bath' : 'Baths'}</span>
            <span className="text-[#D4C4BC]">·</span>
            <span>{sqft.toLocaleString()} sqft</span>
          </div>

          {/* Type tag — only first tag, subtle */}
          {tags[0] && (
            <div className="mt-3">
              <span className="inline-block font-manrope text-[10px] uppercase tracking-wider text-[#9CA3AF] border border-[#E6E0DA] rounded px-2 py-0.5">
                {tags[0]}
              </span>
            </div>
          )}
        </div>
      </article>
    </Link>
  );
};

export default PropertyCard;
