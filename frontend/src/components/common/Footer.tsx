import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Linkedin, Youtube, MapPin, Phone, Mail } from 'lucide-react';

const Footer: React.FC = () => {
  const [email, setEmail] = useState('');

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Newsletter signup:', email);
    // TODO: Submit to backend
    setEmail('');
  };

  return (
    <footer className="bg-[#111827] text-white">
      <div className="max-w-[1280px] mx-auto px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Column */}
          <div>
            <Link to="/" className="flex items-center gap-3 mb-6">
              <img src="/logo.png" alt="BuildEstate" loading="lazy" decoding="async" width="40" height="40" className="h-10 w-auto brightness-0 invert" />
              <span className="font-fraunces text-2xl font-bold">BuildEstate</span>
            </Link>
            <p className="font-manrope font-extralight text-[#9ca3af] text-sm leading-relaxed mb-6">
              AI-powered luxury real estate platform connecting you with your dream home through intelligent matching and personalized recommendations.
            </p>
            {/* Social Links */}
            <div className="flex gap-3">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[rgba(255,255,255,0.05)] hover:bg-[#D4755B] border border-[rgba(255,255,255,0.1)] rounded-lg flex items-center justify-center transition-all group"
              >
                <Facebook className="w-5 h-5 text-[#9ca3af] group-hover:text-white transition-colors" />
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[rgba(255,255,255,0.05)] hover:bg-[#D4755B] border border-[rgba(255,255,255,0.1)] rounded-lg flex items-center justify-center transition-all group"
              >
                <Twitter className="w-5 h-5 text-[#9ca3af] group-hover:text-white transition-colors" />
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[rgba(255,255,255,0.05)] hover:bg-[#D4755B] border border-[rgba(255,255,255,0.1)] rounded-lg flex items-center justify-center transition-all group"
              >
                <Instagram className="w-5 h-5 text-[#9ca3af] group-hover:text-white transition-colors" />
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[rgba(255,255,255,0.05)] hover:bg-[#D4755B] border border-[rgba(255,255,255,0.1)] rounded-lg flex items-center justify-center transition-all group"
              >
                <Linkedin className="w-5 h-5 text-[#9ca3af] group-hover:text-white transition-colors" />
              </a>
              <a 
                href="https://youtube.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[rgba(255,255,255,0.05)] hover:bg-[#D4755B] border border-[rgba(255,255,255,0.1)] rounded-lg flex items-center justify-center transition-all group"
              >
                <Youtube className="w-5 h-5 text-[#9ca3af] group-hover:text-white transition-colors" />
              </a>
            </div>
          </div>

          {/* Quick Links Column */}
          <div>
            <h4 className="font-syne font-bold text-white text-lg mb-6">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/properties" className="font-manrope font-extralight text-[#9ca3af] text-sm hover:text-white hover:pl-2 transition-all inline-block">
                  Browse Properties
                </Link>
              </li>
              <li>
                <Link to="/ai-hub" className="font-manrope font-extralight text-[#9ca3af] text-sm hover:text-white hover:pl-2 transition-all inline-block">
                  AI Property Hub
                </Link>
              </li>
              <li>
                <Link to="/about" className="font-manrope font-extralight text-[#9ca3af] text-sm hover:text-white hover:pl-2 transition-all inline-block">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="font-manrope font-extralight text-[#9ca3af] text-sm hover:text-white hover:pl-2 transition-all inline-block">
                  Contact
                </Link>
              </li>
              <li>
                <a href="#" className="font-manrope font-extralight text-[#9ca3af] text-sm hover:text-white hover:pl-2 transition-all inline-block">
                  Careers
                </a>
              </li>
              <li>
                <a href="#" className="font-manrope font-extralight text-[#9ca3af] text-sm hover:text-white hover:pl-2 transition-all inline-block">
                  Blog
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info Column */}
          <div>
            <h4 className="font-syne font-bold text-white text-lg mb-6">Contact Info</h4>
            <ul className="space-y-4">
              <li>
                <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 font-manrope font-extralight text-[#9ca3af] text-sm hover:text-white transition-colors group">
                  <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0 text-[#D4755B]" />
                  <span className="leading-relaxed">
                    502, Devpath Building,<br />
                    Near Torrent Lab,<br />
                    Ashram Road, Ahmedabad
                  </span>
                </a>
              </li>
              <li>
                <a href="tel:+919876543210" className="flex items-center gap-3 font-manrope font-extralight text-[#9ca3af] text-sm hover:text-white transition-colors">
                  <Phone className="w-5 h-5 flex-shrink-0 text-[#D4755B]" />
                  <span>+91 98765 43210</span>
                </a>
              </li>
              <li>
                <a href="mailto:hello@buildestate.com" className="flex items-center gap-3 font-manrope font-extralight text-[#9ca3af] text-sm hover:text-white transition-colors">
                  <Mail className="w-5 h-5 flex-shrink-0 text-[#D4755B]" />
                  <span>hello@buildestate.com</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter Column */}
          <div>
            <h4 className="font-syne font-bold text-white text-lg mb-6">Stay Updated</h4>
            <p className="font-manrope font-extralight text-[#9ca3af] text-sm mb-4 leading-relaxed">
              Subscribe to our newsletter for the latest listings, market insights, and exclusive offers.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-3 font-manrope font-extralight text-sm text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#D4755B] transition-colors"
                required
              />
              <button 
                type="submit"
                className="w-full bg-[#D4755B] hover:bg-[#C05621] text-white font-manrope font-bold text-sm px-4 py-3 rounded-lg transition-all shadow-lg hover:shadow-xl"
              >
                Subscribe
              </button>
            </form>
            <p className="font-manrope font-extralight text-[#6b7280] text-xs mt-3">
              We respect your privacy. Unsubscribe anytime.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[rgba(255,255,255,0.1)] pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="font-manrope font-extralight text-[#6b7280] text-sm text-center md:text-left">
              © 2026 BuildEstate. All rights reserved. Powered by AI.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <a href="#" className="font-manrope font-extralight text-[#6b7280] text-sm hover:text-white transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="font-manrope font-extralight text-[#6b7280] text-sm hover:text-white transition-colors">
                Terms of Service
              </a>
              <a href="#" className="font-manrope font-extralight text-[#6b7280] text-sm hover:text-white transition-colors">
                Cookie Policy
              </a>
              <a href="#" className="font-manrope font-extralight text-[#6b7280] text-sm hover:text-white transition-colors">
                Sitemap
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;