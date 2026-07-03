import { useEffect } from 'react';

const SITE_URL = 'https://buildestate.vercel.app';
const DEFAULT_TITLE = 'BuildEstate - AI-Powered Luxury Real Estate | Find Your Dream Home';
const DEFAULT_DESCRIPTION = 'Find your perfect property with AI-powered insights, market analysis, and personalized recommendations across India.';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

interface SEOProps {
  title?: string;
  description?: string;
  /** Absolute URL to the OG/Twitter card image. Defaults to /og-image.png */
  image?: string;
  /** Canonical URL. Defaults to current window.location.href */
  url?: string;
  type?: 'website' | 'article';
}

function setMeta(selector: string, attr: string, value: string, content: string) {
  let el = document.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, value);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setOG(property: string, content: string) {
  setMeta(`meta[property="${property}"]`, 'property', property, content);
}

function setTwitter(name: string, content: string) {
  setMeta(`meta[name="${name}"]`, 'name', name, content);
}

function setCanonical(url: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = url;
}

export function useSEO({ title, description, image, url, type = 'website' }: SEOProps) {
  useEffect(() => {
    const fullTitle = title ? `${title} | BuildEstate` : DEFAULT_TITLE;
    const desc = description || DEFAULT_DESCRIPTION;
    const ogImage = image || DEFAULT_IMAGE;
    const canonical = url || window.location.href;

    // <title>
    document.title = fullTitle;

    // <meta name="description">
    setMeta('meta[name="description"]', 'name', 'description', desc);

    // Open Graph
    setOG('og:title', fullTitle);
    setOG('og:description', desc);
    setOG('og:image', ogImage);
    setOG('og:url', canonical);
    setOG('og:type', type);

    // Twitter Card
    setTwitter('twitter:title', fullTitle);
    setTwitter('twitter:description', desc);
    setTwitter('twitter:image', ogImage);

    // Canonical URL
    setCanonical(canonical);

    return () => {
      document.title = DEFAULT_TITLE;
      setMeta('meta[name="description"]', 'name', 'description', DEFAULT_DESCRIPTION);
      setOG('og:title', 'BuildEstate - AI-Powered Luxury Real Estate');
      setOG('og:description', DEFAULT_DESCRIPTION);
      setOG('og:image', DEFAULT_IMAGE);
      setOG('og:url', SITE_URL);
      setOG('og:type', 'website');
      setTwitter('twitter:title', 'BuildEstate - AI-Powered Luxury Real Estate');
      setTwitter('twitter:description', DEFAULT_DESCRIPTION);
      setTwitter('twitter:image', DEFAULT_IMAGE);
      setCanonical(SITE_URL);
    };
  }, [title, description, image, url, type]);
}
