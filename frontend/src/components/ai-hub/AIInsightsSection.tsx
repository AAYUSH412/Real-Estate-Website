import React from 'react';
import { Brain, TrendingUp, Coffee, Award } from 'lucide-react';

const AIInsightsSection: React.FC = () => {
  const insights = [
    {
      icon: TrendingUp,
      title: 'Time-Trend Analysis',
      description: 'We analyze historical price movements, seasonal fluctuations, and market cycles to predict the best buying windows and future appreciation.'
    },
    {
      icon: Coffee,
      title: 'Lifestyle Intelligence',
      description: 'From commute times to coffee shops, schools to nightlife—our AI maps your lifestyle needs to neighborhood characteristics.'
    },
    {
      icon: Award,
      title: 'Expert Recommendations',
      description: 'Our algorithms combine market data with architectural expertise, identifying hidden gems before they hit the mainstream.'
    }
  ];

  return (
    <section className="bg-white py-24">
      <div className="max-w-[1280px] mx-auto px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          {/* Icon */}
          <div className="w-16 h-16 bg-[rgba(236,70,19,0.1)] rounded-full flex items-center justify-center mx-auto mb-6">
            <Brain className="w-8 h-8 text-[#D4755B]" strokeWidth={1.5} />
          </div>

          <h2 className="font-syne text-4xl text-[#221410] mb-4">
            Intelligent Insights
          </h2>
          <p className="font-manrope font-extralight text-lg text-[#4b5563] max-w-[700px] mx-auto">
            Our AI doesn't just match properties—it understands your dreams, analyzes the market, and anticipates your future needs.
          </p>
        </div>

        {/* Insights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {insights.map((insight, index) => (
            <div 
              key={index}
              className="bg-[#F8F6F6] border border-[#E6E0DA] rounded-xl p-8 hover:shadow-xl transition-all group"
            >
              {/* Icon */}
              <div className="w-12 h-12 bg-[rgba(236,70,19,0.1)] rounded-full flex items-center justify-center mb-6 group-hover:bg-[rgba(236,70,19,0.15)] transition-[background-color]">
                <insight.icon className="w-6 h-6 text-[#D4755B]" strokeWidth={1.5} />
              </div>

              {/* Title */}
              <h3 className="font-syne text-xl text-[#221410] mb-4">
                {insight.title}
              </h3>

              {/* Description */}
              <p className="font-manrope font-extralight text-sm leading-relaxed text-[#4b5563]">
                {insight.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AIInsightsSection;