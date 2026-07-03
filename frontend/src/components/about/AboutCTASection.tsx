import React from 'react';

const CTASection: React.FC = () => {
  return (
    <section className="bg-[#EC4613] py-24 relative overflow-hidden">
      {/* Background Pattern */}
        <img
          src="/src/images/Abstract architectural texture with light and shadow.png"
          alt=""
          loading="lazy"
          decoding="async"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay"
        />
        <div className="absolute top-0 left-1/4 w-96"/>

      <div className="max-w-[1280px] mx-auto px-8 text-center relative z-10">
        <h2 className="font-fraunces text-5xl text-white mb-6">
          Ready to Find Your Dream Home?
        </h2>
        <p className="font-manrope font-light text-xl text-white/90 mb-10 max-w-[680px] mx-auto">
          Join thousands of satisfied homeowners who found their perfect property with BuildEstate's AI-powered platform.
        </p>
        <div className="flex gap-4 justify-center">
          <button className="bg-white text-[#C05621] font-manrope font-bold text-lg px-10 py-4 rounded-xl shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1)] hover:shadow-2xl transition-all">
            Get Started
          </button>
          <button className="border-2 border-white text-white font-manrope font-bold text-lg px-10 py-4 rounded-xl hover:bg-white hover:text-[#C05621] transition-all">
            Schedule a Demo
          </button>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
