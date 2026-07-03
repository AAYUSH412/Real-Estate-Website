import React from 'react';
import { MapPin, ExternalLink } from 'lucide-react';

interface PropertyLocationProps {
  address?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  location?: string;
  propertyName?: string;
  googleMapLink?: string;
}

/**
 * Extract an embeddable Google Maps URL from various link formats.
 * Supports:
 *  - https://www.google.com/maps/embed?... (already embeddable)
 *  - https://maps.google.com/... or https://www.google.com/maps/...
 *  - https://maps.app.goo.gl/... (short links)
 *  - https://goo.gl/maps/...
 */
function getEmbedUrl(link: string): string | null {
  if (!link || !link.trim()) return null;
  const trimmed = link.trim();

  // Already an embed URL
  if (trimmed.includes('/maps/embed')) return trimmed;

  // Extract place or coordinates from a regular Google Maps URL
  // Use the Maps Embed API with a place query
  const placeMatch = trimmed.match(/\/maps\/place\/([^/@]+)/);
  if (placeMatch) {
    const query = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
    return `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3000!2d0!3d0!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s!2s${encodeURIComponent(query)}!5e0!3m2!1sen!2sin!4v1`;
  }

  // For @lat,lng format
  const coordMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (coordMatch) {
    return `https://maps.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}&output=embed`;
  }

  // For q= parameter
  const qMatch = trimmed.match(/[?&]q=([^&]+)/);
  if (qMatch) {
    return `https://maps.google.com/maps?q=${qMatch[1]}&output=embed`;
  }

  // For short links or other formats, just use the place query approach with the full URL
  // Use a simple embed with search query
  return `https://maps.google.com/maps?q=${encodeURIComponent(trimmed)}&output=embed`;
}

const PropertyLocation: React.FC<PropertyLocationProps> = ({ address, city, state, zipcode, location, propertyName, googleMapLink }) => {
  const displayTitle = city || location?.split(',').pop()?.trim() || 'Location';
  const displayAddress = address
    ? `${address}, ${city}, ${state} ${zipcode}`
    : location || '';

  const embedUrl = getEmbedUrl(googleMapLink || '');
  const hasMap = !!embedUrl;
  
  return (
    <div className="mb-12">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-6 bg-[#D4755B] rounded-full" />
        <h2 className="font-syne text-2xl text-[#0F172A]">
          Location
        </h2>
      </div>

      {/* Address Card */}
      <div className="bg-white border border-[#E6E0DA] rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-[rgba(212,117,91,0.1)] rounded-full flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-[#D4755B]" />
          </div>
          <div className="flex-1">
            <h3 className="font-manrope font-medium text-base text-[#0F172A] mb-1">
              {displayTitle}
            </h3>
            <p className="font-manrope font-extralight text-sm text-[#64748B] leading-relaxed">
              {displayAddress}
            </p>
          </div>
          {googleMapLink && (
            <a
              href={googleMapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[#D4755B] hover:text-[#B86851] font-manrope text-sm font-medium shrink-0 transition-[color]"
            >
              Open in Maps
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Map / Placeholder */}
      <div className="relative aspect-[690/280] rounded-xl overflow-hidden border border-[#E6E0DA] bg-gray-100">
        {hasMap ? (
          <iframe
            src={embedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={`Map — ${propertyName || displayTitle}`}
            className="absolute inset-0 w-full h-full"
          />
        ) : (
          /* Placeholder when no map link */
          <div className="absolute inset-0 bg-gradient-to-br from-[#F5F1E8] to-[#E6E0DA] flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 bg-white/80 rounded-full flex items-center justify-center shadow-sm">
              <MapPin className="w-8 h-8 text-[#D4755B]/60" />
            </div>
            <p className="font-manrope text-sm text-[#64748B]">
              Map not available for this property
            </p>
            <p className="font-manrope text-xs text-[#94A3B8]">
              Contact us for directions
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyLocation;