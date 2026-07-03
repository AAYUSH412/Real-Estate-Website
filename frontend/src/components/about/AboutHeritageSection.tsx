import React from 'react';
import { ArrowRight } from 'lucide-react';
import heritageImage from '../../images/Heritage section.jpg';

const AboutHeritageSection: React.FC = () => {
  return (
    <section className="bg-white py-24">
      <div className="max-w-[1280px] mx-auto px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left - Image with Border */}
          <div className="relative">
            {/* Inner border box */}
            <div className="border-2 border-[rgba(236,70,19,0.2)] rounded-xl p-4">
              {/* Image container with overlay */}
              <div className="relative h-[735px] bg-[rgba(242,239,233,0.3)] border border-[rgba(230,224,218,0.5)] rounded-lg overflow-hidden">
                <div className="absolute inset-4">
                  <div className="relative h-full w-full overflow-hidden">
                    <img
                      src={heritageImage}
                      alt="Architectural detail"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-white mix-blend-saturation" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right - Content */}
          <div className="lg:pt-16">
            {/* Label */}
            <div className="mb-6">
              <p className="font-space-mono text-xs text-[#D4755B] uppercase tracking-[2.4px]">
                Our Heritage
              </p>
            </div>

            {/* Headline */}
            <h2 className="mb-6">
              <span className="font-syne text-[40px] leading-[50px] text-[#221410] block font-semibold">
                Redefining the Real Estate Landscape with
              </span>
              <span className="font-fraunces italic text-[40px] leading-[50px] text-[#D4755B] block">
                Better Property Discovery
              </span>
            </h2>

            {/* Description Paragraphs */}
            <div className="space-y-6 mb-8">
              <p className="font-manrope font-extralight text-base leading-[26px] text-[#4b5563]">
                Founded by architects and data scientists, BuildEstate emerged from a
                simple observation: the search for a home had become a transaction, losing
                the emotional resonance of finding one's sanctuary.
              </p>

              <p className="font-manrope font-extralight text-base leading-[26px] text-[#4b5563]">
                We set out to bridge the gap between cold data and warm living spaces. By
                harnessing advanced AI, we don't just match square footage; we match
                lifestyles, aesthetics, and the intangible feelings that make a house a home.
              </p>
            </div>

            {/* Blockquote */}
            <blockquote className="border-l-4 border-[#D4755B] pl-6 mb-8">
              <p className="font-fraunces italic text-2xl leading-8 text-[#D4755B]">
                "We believe finding a home should be inspiring,
                not exhausting."
              </p>
            </blockquote>

            {/* Link */}
            <a 
              href="#team" 
              className="inline-flex items-center gap-2 border-b border-[#221410] pb-1 group hover:border-[#D4755B] transition-colors"
            >
              <span className="font-space-mono text-sm text-[#221410] group-hover:text-[#D4755B] transition-colors">
                Meet the Architects
              </span>

              <ArrowRight className="w-4 h-4 text-[#221410] group-hover:text-[#D4755B] transition-colors" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutHeritageSection;