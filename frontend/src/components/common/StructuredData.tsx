import React from 'react';
import { useLocation } from 'react-router-dom';

const SITE_URL = 'https://buildestate.vercel.app';

interface StructuredDataProps {
  type: 'website' | 'organization' | 'property' | 'aiHub' | 'localBusiness' | 'breadcrumb' | 'faqPage' | 'howTo' | 'speakable';
  data?: {
    // property listing
    title?: string;
    description?: string;
    location?: string;
    region?: string;
    price?: number;
    sqft?: number;
    beds?: number;
    baths?: number;
    createdAt?: string;
    image?: string;
    // breadcrumb
    breadcrumbs?: Array<{ name: string; url: string }>;
    // faqPage
    faqs?: Array<{ question: string; answer: string }>;
    // howTo
    howToName?: string;
    howToDescription?: string;
    steps?: Array<{ name: string; text: string }>;
    // speakable
    cssSelector?: string[];
  };
}

const AREA_SERVED = ['Ahmedabad', 'Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Hyderabad', 'Chennai'];

const StructuredData: React.FC<StructuredDataProps> = ({ type, data }) => {
  const location = useLocation();
  const currentUrl = `${SITE_URL}${location.pathname}`;

  const schemas: Record<string, object> = {
    website: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: 'BuildEstate',
      url: SITE_URL,
      description: 'AI-powered luxury real estate platform for finding your perfect property in India.',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_URL}/properties?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },

    organization: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'BuildEstate',
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      areaServed: AREA_SERVED,
      sameAs: [
        'https://github.com/AAYUSH412/Real-Estate-Website',
        'https://linkedin.com/in/AAYUSH412',
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        availableLanguage: ['English', 'Hindi'],
      },
    },

    localBusiness: {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      '@id': `${SITE_URL}/#localbusiness`,
      name: 'BuildEstate',
      description: 'AI-powered real estate platform for finding luxury properties in India.',
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      image: `${SITE_URL}/og-image.png`,
      areaServed: AREA_SERVED.map((city) => ({ '@type': 'City', name: city })),
      priceRange: '₹₹₹',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'IN',
      },
      sameAs: [
        'https://github.com/AAYUSH412/Real-Estate-Website',
        'https://linkedin.com/in/AAYUSH412',
      ],
    },

    property: {
      '@context': 'https://schema.org',
      '@type': 'RealEstateListing',
      name: data?.title || 'Property Listing',
      description: data?.description || 'Property details',
      url: currentUrl,
      datePosted: data?.createdAt || new Date().toISOString(),
      image: data?.image || `${SITE_URL}/og-image.png`,
      address: {
        '@type': 'PostalAddress',
        addressLocality: data?.location || 'City',
        addressRegion: data?.region || 'Region',
        addressCountry: 'IN',
      },
      ...(data?.price && { price: `₹${data.price}`, priceCurrency: 'INR' }),
      ...(data?.sqft && {
        floorSize: { '@type': 'QuantitativeValue', unitText: 'SQFT', value: data.sqft },
      }),
      ...(data?.beds && { numberOfRooms: data.beds }),
      ...(data?.baths && { numberOfBathroomsTotal: data.baths }),
    },

    aiHub: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'AI Property Hub - BuildEstate',
      applicationCategory: 'RealEstateApplication',
      description: 'AI-powered real estate analytics, property search, and investment insights.',
      url: `${SITE_URL}/ai-hub`,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'INR',
        availability: 'https://schema.org/InStock',
      },
    },

    breadcrumb: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: (data?.breadcrumbs || []).map((crumb, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: crumb.name,
        item: crumb.url.startsWith('http') ? crumb.url : `${SITE_URL}${crumb.url}`,
      })),
    },

    faqPage: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: (data?.faqs || []).map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    },

    speakable: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      url: currentUrl,
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: data?.cssSelector || ['h1', '[data-speakable]'],
      },
    },

    howTo: {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: data?.howToName || 'How to Buy Property with BuildEstate',
      description: data?.howToDescription || 'AI-assisted steps to find and buy your perfect home in India.',
      step: (data?.steps || []).map((step) => ({
        '@type': 'HowToStep',
        name: step.name,
        text: step.text,
      })),
    },
  };

  const schemaData = schemas[type] || schemas.website;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
};

export default StructuredData;
