import React from 'react';
import teamImage from '../../images/Team section.jpg';

const TrustSignalsSection: React.FC = () => {
  return (
    <section className="bg-[#F8F6F6] py-24">
      <div className="max-w-[1280px] mx-auto px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="font-fraunces text-5xl text-[#111827] mb-6">Redefining Real Estate</h2>
          <div className="w-24 h-1 bg-[#D4755B] mx-auto" />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left - Image with Border */}
          <div className="relative">
            <div className="border-2 border-[rgba(212,117,91,0.2)] rounded-2xl p-4">
              <img
                src={teamImage}
                alt="Team meeting in modern office"
                className="rounded-2xl shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] w-full"
              />
            </div>
          </div>

          {/* Right - Features */}
          <div className="space-y-12">
            {/* Feature 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-white rounded-lg shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1)] flex items-center justify-center">
                  <span className="font-material-icons text-2xl text-[#D4755B]" aria-hidden="true">verified_user</span>
                </div>
              </div>
              <div>
                <h4 className="font-syne font-bold text-xl text-[#111827] mb-2">Verified Listings Only</h4>
                <p className="font-manrope text-base text-[#4b5563] leading-relaxed">
                  Every property on our platform is physically verified by our team to
                  ensure what you see is what you get.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-white rounded-lg shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1)] flex items-center justify-center">
                  <span className="font-material-icons text-2xl text-[#D4755B]" aria-hidden="true">support_agent</span>
                </div>
              </div>
              <div>
                <h4 className="font-syne font-bold text-xl text-[#111827] mb-2">24/7 Concierge Support</h4>
                <p className="font-manrope text-base text-[#4b5563] leading-relaxed">
                  Our dedicated team is always available to answer questions,
                  schedule viewings, and provide expert advice.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-white rounded-lg shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1)] flex items-center justify-center">
                  <span className="font-material-icons text-2xl text-[#D4755B]" aria-hidden="true">savings</span>
                </div>
              </div>
              <div>
                <h4 className="font-syne font-bold text-xl text-[#111827] mb-2">Transparent Pricing</h4>
                <p className="font-manrope text-base text-[#4b5563] leading-relaxed">
                  No hidden fees. We provide clear, upfront cost breakdowns so you
                  can budget with confidence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSignalsSection;
