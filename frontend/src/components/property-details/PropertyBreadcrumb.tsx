import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface PropertyBreadcrumbProps {
  city?: string;
  propertyName?: string;
}

const PropertyBreadcrumb: React.FC<PropertyBreadcrumbProps> = ({
  city = 'Properties',
  propertyName = '',
}) => {
  return (
    <div className="bg-[#FAF8F4] border-b border-[#E6E0DA]">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-8 py-3">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 font-manrope text-xs text-[#9CA3AF]">
          <Link
            to="/"
            className="flex items-center gap-1 hover:text-[#D4755B] transition-colors duration-150"
            aria-label="Home"
          >
            <Home className="w-3.5 h-3.5" />
          </Link>

          <ChevronRight className="w-3 h-3 shrink-0" aria-hidden />

          <Link
            to="/properties"
            className="hover:text-[#D4755B] transition-colors duration-150"
          >
            Properties
          </Link>

          {city && (
            <>
              <ChevronRight className="w-3 h-3 shrink-0" aria-hidden />
              <Link
                to={`/properties?location=${encodeURIComponent(city)}`}
                className="hover:text-[#D4755B] transition-colors duration-150"
              >
                {city}
              </Link>
            </>
          )}

          {propertyName && (
            <>
              <ChevronRight className="w-3 h-3 shrink-0" aria-hidden />
              <span className="text-[#221410] font-medium truncate max-w-[240px]" aria-current="page">
                {propertyName}
              </span>
            </>
          )}
        </nav>
      </div>
    </div>
  );
};

export default PropertyBreadcrumb;
