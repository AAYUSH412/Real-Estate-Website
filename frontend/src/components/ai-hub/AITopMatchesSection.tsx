import React from 'react';

const AITopMatchesSection: React.FC = () => {
  const propertyImages = {
    property1: "https://images.unsplash.com/photo-1622015663381-d2e05ae91b72?w=800",
    property2: "https://images.unsplash.com/photo-1762732793012-8bdab3af00b4?w=800",
    property3: "https://images.unsplash.com/photo-1769428003672-296f923d19b2?w=800",
  };
  
  const properties = [
    {
      id: 1,
      image: propertyImages.property1,
      name: 'The Glass Pavilion',
      price: '$2,800,000',
      beds: 4,
      baths: 3,
      sqft: '3.2k',
      matchScore: 97,
      badge: 'HOT DEAL'
    },
    {
      id: 2,
      image: propertyImages.property2,
      name: 'Oceanfront Villa',
      price: '$3,200,000',
      beds: 3,
      baths: 3,
      sqft: '2.8k',
      matchScore: 97,
      badge: 'NEW LISTING'
    },
    {
      id: 3,
      image: propertyImages.property3,
      name: 'Modern Skyline Apartment',
      price: '$2,100,000',
      beds: 3,
      baths: 2,
      sqft: '2.4k',
      matchScore: 97,
      badge: 'PRICE DROP'
    }
  ];

  return (
    <section className="bg-[#F2EFE9] py-24">
      <div className="max-w-[1280px] mx-auto px-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-baseline gap-4">
            <h2 className="font-syne text-4xl text-[#221410]">
              Top Matches
            </h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#D4755B] rounded-full animate-pulse" />
              <span className="font-space-mono font-bold text-2xl text-[#D4755B]">
                97%
              </span>
              <span className="font-space-mono text-sm text-[#6b7280]">Average Match Rate</span>
            </div>
          </div>

          <button className="font-space-mono text-sm text-[#221410] border-b border-[#221410] hover:text-[#D4755B] hover:border-[#D4755B] transition-[color,border-color] pb-1">
            View All → See more
          </button>
        </div>

        {/* Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {properties.map((property) => (
            <div 
              key={property.id}
              className="bg-white border border-[#E6E0DA] rounded-xl overflow-hidden hover:shadow-2xl transition-all group cursor-pointer"
            >
              {/* Image */}
              <div className="relative aspect-[382/286.5] overflow-hidden">
                <img
                  src={property.image}
                  alt={property.name}
                  loading="lazy"
                  decoding="async"
                  className="absolute h-[133.33%] w-full object-cover top-[-16.67%] group-hover:scale-105 transition-transform duration-500"
                />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-transparent h-12" />
                
                {/* Badge */}
                <div className="absolute top-4 left-4 bg-[#D4755B] text-white font-space-mono text-xs px-3 py-1.5 rounded-full shadow-lg">
                  {property.badge}
                </div>

                {/* Match Score Badge */}
                <div className="absolute bottom-4 left-4 backdrop-blur-md bg-white/90 border border-[#E6E0DA] rounded px-3 py-2 shadow-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#10b981] rounded-full" />
                    <span className="font-space-mono text-xs text-[#221410] font-bold">
                      {property.matchScore}% Match
                    </span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Name and Price */}
                <h3 className="font-syne text-xl text-[#221410] mb-2">
                  {property.name}
                </h3>
                <p className="font-space-mono font-bold text-lg text-[#D4755B] mb-4">
                  {property.price}
                </p>

                {/* Specs */}
                <div className="flex items-center divide-x divide-[rgba(230,224,218,0.5)] border-t border-[rgba(230,224,218,0.5)] pt-4">
                  <div className="flex-1 text-center">
                    <div className="font-syne text-base text-[#221410] mb-1">
                      {property.beds}
                    </div>
                    <div className="font-manrope font-extralight text-xs text-[rgba(34,20,16,0.5)] uppercase tracking-wide">
                      Beds
                    </div>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="font-syne text-base text-[#221410] mb-1">
                      {property.baths}
                    </div>
                    <div className="font-manrope font-extralight text-xs text-[rgba(34,20,16,0.5)] uppercase tracking-wide">
                      Baths
                    </div>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="font-syne text-base text-[#221410] mb-1">
                      {property.sqft}
                    </div>
                    <div className="font-manrope font-extralight text-xs text-[rgba(34,20,16,0.5)] uppercase tracking-wide">
                      Sqft
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AITopMatchesSection;