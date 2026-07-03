import React, { useState } from 'react';

const NewsletterBanner: React.FC = () => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Newsletter signup:', email);
    // TODO: Submit to backend
    setEmail('');
  };

  return (
    <section className="bg-[#C05621] py-16">
      <div className="max-w-[1280px] mx-auto px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Left - Text Content */}
          <div className="flex-1 text-white">
            <h2 className="font-syne font-bold text-3xl mb-3">
              Latest Assistance? Reach Us!
            </h2>
            <p className="font-manrope font-extralight text-lg opacity-90">
              Sign up for our newsletter to get the latest listings, tips, and exclusive offers.
            </p>
          </div>

          {/* Right - Email Form */}
          <div className="flex-1 max-w-[500px] w-full">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-5 py-3.5 font-manrope font-extralight text-sm text-white placeholder:text-white/60 focus:outline-none focus:border-white/40 transition-[border-color]"
                required
              />
              <button
                type="submit"
                className="bg-white hover:bg-[#F2EFE9] text-[#C05621] font-manrope font-bold text-base px-8 py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl whitespace-nowrap"
              >
                Subscribe
              </button>
            </form>
            <p className="font-manrope font-extralight text-xs text-white/70 mt-3 ml-1">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewsletterBanner;
