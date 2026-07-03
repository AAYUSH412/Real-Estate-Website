import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

interface PropertyBreadcrumbProps {
  city?: string;
  propertyName?: string;
}

const PropertyBreadcrumb: React.FC<PropertyBreadcrumbProps> = ({ 
  city = "Ahmedabad",
  propertyName = "Skyline Towers" 
}) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white border-b border-[#E6E0DA]">
      <div className="max-w-[1280px] mx-auto px-8 py-6">
        <div className="flex items-center justify-between">
          {/* Back Button */}
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[#64748B] hover:text-[#D4755B] transition-[color] group"
          >
            <span className="material-icons text-base">
              arrow_back
            </span>
            <span className="font-manrope font-extralight text-sm">
              Back to Properties
            </span>
          </button>

          {/* Breadcrumb Trail */}
          <nav className="flex items-center gap-2 text-xs tracking-wider uppercase opacity-80">
            <Link to="/" className="font-manrope font-extralight text-[#64748B] hover:text-[#D4755B] transition-[color]">
              Home
            </Link>
            <span className="font-manrope text-[#CBD5E1]">
              /
            </span>
            <Link to="/properties" className="font-manrope font-extralight text-[#64748B] hover:text-[#D4755B] transition-[color]">
              Properties
            </Link>
            <span className="font-manrope text-[#CBD5E1]">
              /
            </span>
            <span className="font-manrope font-extralight text-[#64748B]">
              {city}
            </span>
            <span className="font-manrope text-[#CBD5E1]">
              /
            </span>
            <span className="font-manrope font-extralight text-[#CF4517]">
              {propertyName}
            </span>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default PropertyBreadcrumb;