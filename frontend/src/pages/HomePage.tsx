import React from 'react';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { useSEO } from '../hooks/useSEO';
import StructuredData from '../components/common/StructuredData';
import HeroSection from '../components/home/HeroSection';
import StatsSection from '../components/home/StatsSection';
import AIIntelligenceSection from '../components/home/AIIntelligenceSection';
import CuratedListingsSection from '../components/home/CuratedListingsSection';
import ProcessSection from '../components/home/ProcessSection';
import TrustSignalsSection from '../components/home/TrustSignalsSection';
import TestimonialsSection from '../components/home/TestimonialsSection';
import CTASection from '../components/home/CTASection';

const HomePage: React.FC = () => {
  useSEO({
    title: 'Find Flats, Villas & Apartments in India with AI',
    description: 'BuildEstate helps you find flats, villas, and apartments in Mumbai, Delhi, Bangalore, Ahmedabad, and Pune using AI-powered search and live market analysis.',
    url: 'https://buildestate.vercel.app',
  });

  return (
    <div className="bg-[#F8F6F6] min-h-screen">
      <StructuredData
        type="speakable"
        data={{ cssSelector: ['h1', '[data-speakable]'] }}
      />
      <StructuredData
        type="howTo"
        data={{
          howToName: 'How to Buy Property with BuildEstate',
          howToDescription: 'AI-assisted steps to find and purchase your perfect home in India.',
          steps: [
            { name: 'Profile Analysis', text: 'Our AI deep-dives into your preferences, lifestyle needs, and financial goals to build a comprehensive buyer profile.' },
            { name: 'Smart Matching', text: 'Algorithms scan thousands of listings to find properties that align with your unique criteria, filtering out the noise.' },
            { name: 'Virtual Tours & Insights', text: 'Experience homes remotely with immersive 3D tours and receive detailed neighborhood analytics reports.' },
            { name: 'Seamless Closing', text: 'From offer to keys, our digital platform handles paperwork, negotiations, and closing logistics effortlessly.' },
          ],
        }}
      />

      {/* Sticky Navigation */}
      <Navbar />

      {/* Hero Section */}
      <HeroSection />

      {/* Stats Section */}
      <StatsSection />

      {/* AI Intelligence Section */}
      <AIIntelligenceSection />

      {/* Curated Listings Section */}
      <CuratedListingsSection />

      {/* The Path to Your New Beginning Section */}
      <ProcessSection />

      {/* Redefining Real Estate Section */}
      <TrustSignalsSection />

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* CTA Section */}
      <CTASection />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default HomePage;