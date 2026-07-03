import React from 'react';
import { Check, ArrowRight, Sparkles } from 'lucide-react';

const AboutAISection: React.FC = () => {
  const imgVerticalArchitecturalDetail = "https://images.unsplash.com/photo-1695067440629-b5e513976100?w=600";
  
  const features = [
    "Predictive Market Analysis",
    "Hyper-local Neighborhood Data",
    "Investment Value Projection",
    "Lifestyle Compatibility Scoring"
  ];

  return (
    <section className="bg-[#F2EFE9] border-t border-[#E6E0DA] py-24">
      <div className="max-w-[1280px] mx-auto px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left - Content */}
          <div>
            {/* Label */}
            <div className="mb-6">
              <p className="font-space-mono text-xs text-[#D4755B] uppercase tracking-[1.2px]">
                The Engine
              </p>
            </div>

            {/* Headline */}
            <h2 className="mb-6">
              <span className="font-syne text-5xl leading-[48px] text-[#221410] block font-semibold">
                AI-Powered
              </span>
              <span className="font-fraunces font-light italic text-5xl leading-[48px] text-[#D4755B] block">
                Property Intelligence
              </span>
            </h2>

            {/* Description */}
            <p className="font-manrope font-extralight text-lg leading-[29.25px] text-[#4b5563] mb-8">
              Our proprietary algorithms analyze millions of data points—from sun
              patterns and neighborhood noise levels to architectural styles and
              historical value trends—to present you with opportunities others
              miss.
            </p>

            {/* Features List */}
            <ul className="space-y-5 mb-8">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <Check className="w-5 h-5 text-[#D4755B]" />
                  </div>
                  <span className="font-manrope font-extralight text-base text-[#221410]">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            {/* Link */}
            <a 
              href="#" 
              className="inline-flex items-center gap-2 border-b border-[#221410] pb-1 group hover:border-[#D4755B] transition-[border-color]"
            >
              <span className="font-space-mono text-sm text-[#221410] group-hover:text-[#D4755B] transition-[color]">
                Learn about our Tech
              </span>

              <ArrowRight className="w-4 h-4 text-[#221410] group-hover:text-[#D4755B] transition-[color]" />
            </a>
          </div>

          {/* Right - Image with AI Card Overlay */}
          <div className="relative">
            {/* Background overlay (rotated) */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[592px] h-[732px] bg-[rgba(230,224,218,0.5)] rounded-lg rotate-2" />
            </div>

            {/* Main Image Container */}
            <div className="relative aspect-[560/700] rounded-lg overflow-hidden shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)]">
              <img
                src={imgVerticalArchitecturalDetail}
                alt="AI Property Intelligence"
                loading="lazy"
                decoding="async"
                className="absolute h-full left-[-12.5%] w-[125%] object-cover"
              />

              {/* AI Match Card Overlay */}
              <div className="absolute bottom-6 left-6 right-6 backdrop-blur-md bg-white/90 border border-[#E6E0DA] rounded p-4 flex items-center gap-4">
                {/* Icon */}
                <div className="w-10 h-[46px] bg-[rgba(236,70,19,0.1)] rounded-full flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-[#D4755B]" />
                </div>

                {/* Content */}
                <div>
                  <p className="font-space-mono text-xs text-[#6b7280] uppercase mb-1">
                    Match Score
                  </p>
                  <p className="font-manrope font-extralight text-lg text-[#221410]">
                    98.5% Compatibility
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutAISection;