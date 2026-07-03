import React from 'react';
import { Link } from 'react-router-dom';
import glassPavilion from '../../images/The Glass Pavilion.jpg';
import skylinePenthouse from '../../images/Skyline Penthouse.jpg';
import desertOasis from '../../images/Desert Oasis.jpg';
import coastalRetreat from '../../images/Coastal Retreat.jpg';

const CuratedListingsSection: React.FC = () => {
    const propertyImages = [
        glassPavilion,
        skylinePenthouse,
        desertOasis,
        coastalRetreat
    ];

  return (
    <section className="bg-[#F9F7F2] py-24 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20">
          <path d="M0 0h20v20H0z" fill="#D4755B" opacity="0.05" />
        </svg>
      </div>

      <div className="max-w-[1280px] mx-auto px-8 relative z-10">
        {/* Section Header */}
        <div className="flex justify-between items-center mb-16">
          <div>
            <div className="font-space-mono text-sm text-[#D4755B] uppercase tracking-widest mb-4">Exclusive Selection</div>
            <h2 className="font-fraunces text-5xl text-[#111827]">Curated Listings</h2>
          </div>

          <Link to="/properties" className="flex items-center gap-2 font-manrope font-bold text-[#D4755B] hover:gap-4 transition-all">
            View All Properties
            <span className="font-material-icons text-sm" aria-hidden="true">arrow_forward</span>
          </Link>
        </div>

        {/* Property Grid */}
        <div className="grid grid-cols-12 gap-6">

          {/* Large Featured Property */}
          <div className="col-span-12 md:col-span-8 rounded-2xl overflow-hidden shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1)] relative group">
            <div className="relative h-[500px]">
              <img 
                src={propertyImages[0]} 
                alt="The Glass Pavilion luxury villa in Montecito California" 
                className="absolute inset-0 w-full h-full object-cover" 
                loading="eager"
                fetchPriority="high"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="bg-[#D4755B] inline-block px-3 py-1 rounded text-white font-manrope font-bold text-xs mb-4">
                  FEATURED
                </div>
                <h3 className="font-fraunces text-3xl text-white mb-2">The Glass Pavilion</h3>
                <p className="font-manrope font-light text-white/80 mb-4">Montecito, California</p>
                <div className="border-t border-white/20 pt-4 flex items-center justify-between">
                  <span className="font-space-mono text-white">$12,500,000</span>
                  <div className="flex items-center gap-6 text-white/90">
                    <div className="flex items-center gap-2">
                      <span className="font-material-icons text-sm" aria-hidden="true">bed</span>
                      <span className="font-space-mono text-sm">6 Beds</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-material-icons text-sm" aria-hidden="true">square_foot</span>
                      <span className="font-space-mono text-sm">8,200 sqft</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Small Property Card */}
          <div className="col-span-12 md:col-span-4 rounded-2xl overflow-hidden shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1)] relative group">
            <div className="relative h-[500px]">
              <img 
                src={propertyImages[1]} 
                alt="Skyline Penthouse luxury apartment in New York NY" 
                className="absolute inset-0 w-full h-full object-cover" 
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="font-fraunces text-xl text-white mb-1">Skyline Penthouse</h3>
                <p className="font-manrope text-sm text-white/70 mb-3">New York, NY</p>
                <span className="font-space-mono text-sm text-white">$8,950,000</span>
              </div>
            </div>
          </div>

          {/* Desert Oasis */}
          <div className="col-span-12 md:col-span-4 rounded-2xl overflow-hidden shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1)] aspect-square">
            <div className="relative h-full">
              <img 
                src={propertyImages[2]} 
                alt="Desert Oasis modern home in Joshua Tree CA" 
                className="absolute inset-0 w-full h-full object-cover" 
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="font-fraunces text-xl text-white mb-1">Desert Oasis</h3>
                <p className="font-manrope text-sm text-white/70 mb-3">Joshua Tree, CA</p>
                <span className="font-space-mono text-sm text-white">$3,200,000</span>
              </div>
            </div>
          </div>

          {/* Coastal Retreat */}
          <div className="col-span-12 md:col-span-8 rounded-2xl overflow-hidden shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1)] relative">
            <div className="relative h-[800px]">
              <img 
                src={propertyImages[3]} 
                alt="Coastal Retreat mansion in Malibu California" 
                className="absolute inset-0 w-full h-full object-cover" 
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <h3 className="font-fraunces text-2xl text-white mb-2">Coastal Retreat</h3>
                <p className="font-manrope text-white/70 mb-6">Malibu, California</p>
                <div className="border-t border-white/20 pt-6 flex items-center justify-between">
                  <span className="font-space-mono text-white">$15,000,000</span>
                  <button className="text-white hover:bg-white/10 p-2 rounded-full transition-all" aria-label="View Coastal Retreat">
                    <span className="font-material-icons text-2xl" aria-hidden="true">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CuratedListingsSection;
