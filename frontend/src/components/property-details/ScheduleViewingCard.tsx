import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { appointmentsAPI } from '../../services/api';

interface ScheduleViewingCardProps {
  property: { name: string; id: string };
  price?: string;
}

const INPUT = "w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 font-manrope text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#D4755B] transition-[border-color]";
const LABEL = "block font-manrope text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5";

const ScheduleViewingCard: React.FC<ScheduleViewingCardProps> = ({ property, price }) => {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', date: '', timeSlot: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await appointmentsAPI.schedule({
        propertyId: property.id,
        date: form.date,
        time: form.timeSlot,
        name: form.fullName,
        email: form.email,
        phone: form.phone,
        message: `Viewing request for ${property.name}`,
      });
      setSuccess(true);
      toast.success('Visit Scheduled!', { description: "We'll confirm within 24 hours." });
      setForm({ fullName: '', email: '', phone: '', date: '', timeSlot: '' });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to schedule. Please try again.';
      setError(msg);
      toast.error('Scheduling Failed', { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sticky top-24 bg-[#221410] rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
      {/* Price header */}
      <div className="px-6 pt-6 pb-5 border-b border-white/10">
        <p className="font-manrope text-xs text-white/50 uppercase tracking-wider mb-1">Listed Price</p>
        {price && (
          <p className="font-fraunces text-3xl font-bold text-[#D4755B] tabular-nums leading-none">
            {price}
          </p>
        )}
      </div>

      <div className="px-6 py-5">
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center py-8"
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h3 className="font-fraunces text-xl text-white mb-2">Visit Scheduled!</h3>
              <p className="font-manrope text-sm text-white/50 mb-6">
                We'll confirm your appointment within 24 hours.
              </p>
              <button
                onClick={() => setSuccess(false)}
                className="font-manrope text-sm text-[#D4755B] hover:text-[#E8917A] transition-colors"
              >
                Schedule another visit
              </button>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex items-center gap-2 mb-5">
                <Calendar className="w-4 h-4 text-[#D4755B]" />
                <h3 className="font-manrope font-semibold text-sm text-white">Schedule a Viewing</h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className={LABEL}>Full Name</label>
                  <input
                    type="text" name="fullName" value={form.fullName} onChange={handleChange}
                    placeholder="Your full name" className={INPUT} required
                  />
                </div>
                <div>
                  <label className={LABEL}>Email</label>
                  <input
                    type="email" name="email" value={form.email} onChange={handleChange}
                    placeholder="your@email.com" className={INPUT} required
                  />
                </div>
                <div>
                  <label className={LABEL}>Phone</label>
                  <input
                    type="tel" name="phone" value={form.phone} onChange={handleChange}
                    placeholder="+91 98765 43210" className={INPUT} required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL}>Date</label>
                    <input
                      type="date" name="date" value={form.date} onChange={handleChange}
                      className={INPUT + ' [color-scheme:dark]'} required
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Time</label>
                    <select
                      name="timeSlot" value={form.timeSlot} onChange={handleChange}
                      className={INPUT + ' appearance-none cursor-pointer'} required
                    >
                      <option value="" className="bg-[#221410]">Pick time</option>
                      {['09:00','10:00','11:00','14:00','15:00','16:00'].map(t => (
                        <option key={t} value={t} className="bg-[#221410]">
                          {t.replace('09:','9:')}
                          {+t.split(':')[0] < 12 ? ' AM' : ' PM'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {error && (
                  <p className="font-manrope text-xs text-red-400">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-2 bg-[#D4755B] hover:bg-[#C05621] disabled:opacity-50 text-white font-manrope font-bold text-sm py-3.5 rounded-xl transition-all active:scale-[0.98] shadow-lg"
                >
                  {submitting ? 'Scheduling…' : 'Schedule Visit'}
                </button>

                <p className="text-center font-manrope text-xs text-white/30 pt-1">
                  Confirmed within 24 hours · No spam
                </p>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ScheduleViewingCard;
