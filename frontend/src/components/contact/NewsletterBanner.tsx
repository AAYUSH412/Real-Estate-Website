import React, { useState } from 'react';
import { toast } from 'sonner';
import { newsAPI } from '../../services/api';

type BannerState = 'idle' | 'loading' | 'success';

const NewsletterBanner: React.FC = () => {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<BannerState>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('loading');
    try {
      await newsAPI.subscribe(email);
      setState('success');
      setEmail('');
      toast.success('Subscribed! Check your inbox for a confirmation email.');
    } catch (err: any) {
      setState('idle');
      const msg = err?.response?.data?.message || 'Failed to subscribe. Please try again.';
      toast.error(msg);
    }
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
            {state === 'success' ? (
              <div className="bg-white/10 border border-white/20 rounded-xl px-5 py-4 text-white text-center">
                <p className="font-manrope font-semibold text-sm">You're subscribed!</p>
                <p className="font-manrope font-extralight text-xs opacity-80 mt-1">Check your inbox to confirm your subscription.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  autoComplete="email"
                  className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-5 py-3.5 font-manrope font-extralight text-sm text-white placeholder:text-white/60 focus:outline-none focus:border-white/40 transition-[border-color]"
                  required
                />
                <button
                  type="submit"
                  disabled={state === 'loading'}
                  className="bg-white hover:bg-[#F2EFE9] disabled:opacity-60 disabled:cursor-not-allowed text-[#C05621] font-manrope font-bold text-base px-8 py-3.5 rounded-xl transition-[background-color] shadow-lg hover:shadow-xl whitespace-nowrap"
                >
                  {state === 'loading' ? 'Subscribing...' : 'Subscribe'}
                </button>
              </form>
            )}
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
