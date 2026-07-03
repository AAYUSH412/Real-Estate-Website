import React from 'react';
import { TrendingDown } from 'lucide-react';

const AIDeepDiveSection: React.FC = () => {
  const imgContainer = "https://images.unsplash.com/photo-1622015663381-d2e05ae91b72?w=800";
  
  // Mock data for analysis visualization
  const analysisData = {
    marketScoring: [
      { label: 'Value Potential', score: 92 },
      { label: 'Rental Yield', score: 85 },
      { label: 'Appreciation', score: 88 }
    ],
    investmentMetrics: [
      { label: 'ROI (5yr)', value: '45%' },
      { label: 'Cap Rate', value: '5.2%' },
      { label: 'Cash Flow', value: '$8k/mo' }
    ],
    neighborhoodScore: 94
  };

  return (
    <section className="bg-white py-24">
      <div className="max-w-[1280px] mx-auto px-8">
        {/* Section Header */}
        <div className="mb-12">
          <div className="font-space-mono text-xs text-[#D4755B] uppercase tracking-[1.2px] mb-4">
            Deep Analysis
          </div>
          <h2 className="font-syne text-4xl text-[#221410]">
            Deep Dive Analysis
          </h2>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left - Featured Property Card */}
          <div className="bg-white border border-[#E6E0DA] rounded-xl overflow-hidden shadow-lg">
            {/* Image */}
            <div className="relative aspect-[382/286.5] overflow-hidden">
              <img
                src={imgContainer}
                alt="Property analysis"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-transparent h-12" />
              
              {/* Match Badge */}
              <div className="absolute bottom-4 left-4 backdrop-blur-md bg-white/90 border border-[#E6E0DA] rounded px-3 py-2 shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#10b981] rounded-full" />
                  <span className="font-space-mono text-xs text-[#221410] font-bold">
                    97% Match
                  </span>
                </div>
              </div>
            </div>

            {/* Market Badge */}
            <div className="bg-[rgba(212,117,91,0.1)] border-b border-[rgba(212,117,91,0.2)] px-6 py-4 flex items-center justify-between">
              <span className="font-syne text-xs text-[#B55D45] uppercase tracking-wider">
                Under Market Value
              </span>
              <TrendingDown className="w-5 h-5 text-[#D4755B]" />
            </div>

            {/* Property Details */}
            <div className="p-6">
              <h3 className="font-syne text-xl text-[#221410] mb-2">
                The Eames Retreat
              </h3>
              <p className="font-space-mono font-bold text-lg text-[#D4755B] mb-4">
                $2,400,000
              </p>

              <p className="font-manrope font-extralight text-sm leading-relaxed text-[rgba(34,20,16,0.6)] mb-6">
                Unobstructed city views from the 45th floor. Recent
                price drop makes this a prime acquisition target.
              </p>

              {/* Specs */}
              <div className="flex items-center divide-x divide-[rgba(230,224,218,0.5)] border-t border-[rgba(230,224,218,0.5)] pt-4">
                <div className="flex-1 text-center">
                  <div className="font-syne text-base text-[#221410] mb-1">4</div>
                  <div className="font-manrope font-extralight text-xs text-[rgba(34,20,16,0.5)] uppercase tracking-wide">
                    Beds
                  </div>
                </div>
                <div className="flex-1 text-center">
                  <div className="font-syne text-base text-[#221410] mb-1">3</div>
                  <div className="font-manrope font-extralight text-xs text-[rgba(34,20,16,0.5)] uppercase tracking-wide">
                    Baths
                  </div>
                </div>
                <div className="flex-1 text-center">
                  <div className="font-syne text-base text-[#221410] mb-1">2.8k</div>
                  <div className="font-manrope font-extralight text-xs text-[rgba(34,20,16,0.5)] uppercase tracking-wide">
                    Sqft
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right - Analysis Panels */}
          <div className="space-y-6">
            {/* Market Scoring */}
            <div className="bg-[#F8F6F6] border border-[#E6E0DA] rounded-xl p-6">
              <h3 className="font-syne text-lg text-[#221410] mb-6">
                Market Scoring
              </h3>
              <div className="space-y-4">
                {analysisData.marketScoring.map((item, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-manrope font-extralight text-sm text-[#221410]">
                        {item.label}
                      </span>
                      <span className="font-space-mono font-bold text-sm text-[#D4755B]">
                        {item.score}%
                      </span>
                    </div>
                    <div className="h-2 bg-[#E6E0DA] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#D4755B] rounded-full transition-all duration-500"
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Investment ROI Snapshot */}
            <div className="bg-[#F8F6F6] border border-[#E6E0DA] rounded-xl p-6">
              <h3 className="font-syne text-lg text-[#221410] mb-6">
                Investment ROI Snapshot
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {analysisData.investmentMetrics.map((metric, index) => (
                  <div key={index} className="text-center">
                    <div className="font-space-mono font-bold text-2xl text-[#D4755B] mb-1">
                      {metric.value}
                    </div>
                    <div className="font-manrope font-extralight text-xs text-[#6b7280]">
                      {metric.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Neighborhood Analysis */}
            <div className="bg-[#D4755B] text-white rounded-xl p-6 flex items-center justify-between">
              <div>
                <h3 className="font-syne text-lg mb-2">
                  Neighborhood Match
                </h3>
                <p className="font-manrope font-extralight text-sm opacity-90">
                  Based on lifestyle preferences
                </p>
              </div>
              <div className="relative w-20 h-20">
                {/* Circular Progress */}
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    stroke="white"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 32}`}
                    strokeDashoffset={`${2 * Math.PI * 32 * (1 - analysisData.neighborhoodScore / 100)}`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-space-mono font-bold text-lg">
                    {analysisData.neighborhoodScore}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AIDeepDiveSection;