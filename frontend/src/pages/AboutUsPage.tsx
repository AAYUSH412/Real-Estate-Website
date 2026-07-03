import React from 'react';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { useSEO } from '../hooks/useSEO';
import StructuredData from '../components/common/StructuredData';
import AboutHeroSection from '../components/about/AboutHeroSection';
import AboutHeritageSection from '../components/about/AboutHeritageSection';
import AboutStatsSection from '../components/about/AboutStatsSection';
import AboutValuesSection from '../components/about/AboutValuesSection';
import AboutAISection from '../components/about/AboutAISection';
import AboutCTASection from '../components/about/AboutCTASection';

const AboutUsPage: React.FC = () => {
  useSEO({
    title: 'About BuildEstate — AI-Powered Real Estate in India',
    description: 'BuildEstate is an AI-powered real estate platform serving homebuyers and sellers across Mumbai, Delhi, Bangalore, Ahmedabad, and Pune. Learn about our mission and technology.',
    url: 'https://buildestate.vercel.app/about',
  });

  return (
    <div className="bg-white min-h-screen">
      <StructuredData type="speakable" data={{ cssSelector: ['h1', '[data-speakable]'] }} />

      {/* Sticky Navigation */}
      <Navbar />

      {/* Hero Section */}
      <AboutHeroSection />

      {/* Our Heritage Section */}
      <AboutHeritageSection />

      {/* Stats Section */}
      <AboutStatsSection />

      {/* Values Section - Driven by Purpose */}
      <AboutValuesSection />

      {/* AI Intelligence Section */}
      <AboutAISection />

      {/* CTA Section */}
      <AboutCTASection />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default AboutUsPage;
