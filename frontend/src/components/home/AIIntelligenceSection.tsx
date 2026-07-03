import React from 'react';

const AIIntelligenceSection: React.FC = () => {
  return (
    <section className="bg-[#F8F6F6] py-24">
      <div className="max-w-[1280px] mx-auto px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="font-space-mono text-sm text-[#D4755B] uppercase tracking-widest mb-4">Why Choose AI?</div>
          <h2 className="font-fraunces text-5xl text-[#111827] mb-6">AI-Powered Property Intelligence</h2>
          <p className="font-manrope font-light text-lg text-[#4b5563] max-w-[740px] mx-auto">
            We leverage advanced algorithms to give you a competitive edge in the market, turning data
            into your dream home.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white border border-[#f3f4f6] rounded-2xl p-8 shadow-[0px_20px_25px_-5px_rgba(229,231,235,0.5)]">
            <div className="w-14 h-14 bg-[rgba(212,117,91,0.1)] rounded-xl flex items-center justify-center mb-6">
              <span className="font-material-icons text-3xl text-[#D4755B]" aria-hidden="true">query_stats</span>
            </div>
            <h3 className="font-syne font-bold text-2xl text-[#111827] mb-4">Live Market Scraping</h3>
            <p className="font-manrope text-base text-[#6b7280] leading-relaxed">
              Real-time data feeds from every major listing source, aggregating hidden gems before
              they hit the mainstream market.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white border border-[#f3f4f6] rounded-2xl p-8 shadow-[0px_20px_25px_-5px_rgba(229,231,235,0.5)]">
            <div className="w-14 h-14 bg-[rgba(212,117,91,0.1)] rounded-xl flex items-center justify-center mb-6">
              <span className="font-material-icons text-3xl text-[#D4755B]" aria-hidden="true">psychology</span>
            </div>
            <h3 className="font-syne font-bold text-2xl text-[#111827] mb-4">Expert AI Insights</h3>
            <p className="font-manrope text-base text-[#6b7280] leading-relaxed">
              Predictive analytics on value appreciation and investment potential, tailored to your
              financial goals.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white border border-[#f3f4f6] rounded-2xl p-8 shadow-[0px_20px_25px_-5px_rgba(229,231,235,0.5)]">
            <div className="w-14 h-14 bg-[rgba(212,117,91,0.1)] rounded-xl flex items-center justify-center mb-6">
              <span className="font-material-icons text-3xl text-[#D4755B]" aria-hidden="true">location_city</span>
            </div>
            <h3 className="font-syne font-bold text-2xl text-[#111827] mb-4">Best Area Suggestions</h3>
            <p className="font-manrope text-base text-[#6b7280] leading-relaxed">
              Neighborhood matching based on your lifestyle habits, commute preferences, and
              local amenities.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AIIntelligenceSection;
