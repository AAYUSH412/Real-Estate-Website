import React from 'react';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { useSEO } from '../hooks/useSEO';
import StructuredData from '../components/common/StructuredData';
import ContactHeroSection from '../components/contact/ContactHeroSection';
import ContactFormCard from '../components/contact/ContactFormCard';
import ContactInfoCards from '../components/contact/ContactInfoCards';
import ContactMapSection from '../components/contact/ContactMapSection';
import FAQSection from '../components/contact/FAQSection';
import OtherWaysSection from '../components/contact/OtherWaysSection';
import NewsletterBanner from '../components/contact/NewsletterBanner';

const FAQ_ITEMS = [
  {
    question: 'How does the AI matching process work?',
    answer: 'Our proprietary algorithm analyzes over 50 data points from your preferences and lifestyle inputs to suggest properties that align with your unique needs, often uncovering options you might have missed.',
  },
  {
    question: 'What areas do you currently cover?',
    answer: 'We currently cover major metropolitan areas including Ahmedabad, Mumbai, Delhi, Bangalore, and Pune. We\'re expanding to more cities across India and will update our coverage area regularly.',
  },
  {
    question: 'Can I list my property exclusively with BuildEstate?',
    answer: 'Yes, we offer exclusive listing agreements with premium marketing benefits including professional photography, virtual tours, AI-powered listing optimization, and dedicated property consultant support throughout the selling process.',
  },
  {
    question: 'How do I schedule a virtual tour?',
    answer: 'You can schedule a virtual tour directly from any property listing page by clicking the \'Schedule Virtual Tour\' button. Choose your preferred date and time, and our team will send you a confirmation with the video conference link.',
  },
];

const ContactPage: React.FC = () => {
  useSEO({
    title: 'Contact Us',
    description: 'Get in touch with BuildEstate. We\'re here to help you find your dream property.',
    url: 'https://buildestate.vercel.app/contact',
  });

  return (
    <div className="bg-white min-h-screen">
      <StructuredData type="faqPage" data={{ faqs: FAQ_ITEMS }} />

      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <ContactHeroSection />

      {/* Contact Form & Info Cards Section */}
      <section className="bg-white py-16">
        <div className="max-w-[1280px] mx-auto px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left - Contact Form (2/3 width) */}
            <div className="lg:col-span-2">
              <ContactFormCard />
            </div>

            {/* Right - Contact Info Cards (1/3 width) */}
            <div className="lg:col-span-1">
              <ContactInfoCards />
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <ContactMapSection />

      {/* FAQ Section */}
      <FAQSection />

      {/* Other Ways to Connect */}
      <OtherWaysSection />

      {/* Newsletter Banner */}
      <NewsletterBanner />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ContactPage;
