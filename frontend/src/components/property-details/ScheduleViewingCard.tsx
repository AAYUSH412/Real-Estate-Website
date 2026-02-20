import React, { useState } from 'react';
import { toast } from 'sonner';
import { appointmentsAPI } from '../../services/api';

interface ScheduleViewingCardProps {
  property: {
    name: string;
    id: string;
  };
}

const ScheduleViewingCard: React.FC<ScheduleViewingCardProps> = ({ property }) => {
  const imgBackground = "https://cdn-icons-png.flaticon.com/512/1067/1067566.png";
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    date: '',
    timeSlot: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await appointmentsAPI.schedule({
        propertyId: property.id,
        date: formData.date,
        time: formData.timeSlot,
        name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        message: `Viewing request for ${property.name}`,
      });
      setSuccess(true);
      toast.success('Visit Scheduled Successfully!', {
        description: "We'll confirm your appointment within 24 hours."
      });
      setFormData({ fullName: '', email: '', phone: '', date: '', timeSlot: '' });
    } catch (err: any) {
      console.error('Failed to schedule viewing:', err);
      const msg = err.response?.data?.message || 'Failed to schedule. Please try again.';
      setError(msg);
      toast.error('Scheduling Failed', {
        description: msg
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white border border-[#E6E0DA] rounded-2xl p-8 shadow-lg sticky top-8 text-center">
        <span className="material-icons text-5xl text-[#22C55E] mb-4">check_circle</span>
        <h3 className="font-syne text-xl text-[#0F172A] mb-2">Visit Scheduled!</h3>
        <p className="font-manrope font-extralight text-sm text-[#64748B] mb-6">
          We'll confirm your appointment within 24 hours.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="text-[#D4755B] font-manrope font-semibold text-sm hover:underline"
        >
          Schedule another visit
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E6E0DA] rounded-2xl p-8 shadow-lg sticky top-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <span className="material-icons text-[#D4755B] text-xl">
          calendar_today
        </span>
        <h3 className="font-syne text-xl text-[#0F172A]">
          Schedule a Viewing
        </h3>
      </div>

      {/* Agent Info */}
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#E6E0DA]">
        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
          <img 
            src={imgBackground}
            alt="Agent"
            className="w-full h-full object-cover mt-2"
          />
        </div>
        <div>
          <p className="font-manrope font-medium text-sm text-[#0F172A] mb-0.5">
            Agent Name
          </p>
          <p className="font-manrope font-extralight text-xs text-[#64748B]">
            Senior Property Consultant
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block font-manrope font-extralight text-xs text-[#64748B] uppercase tracking-wider mb-2">
            Full Name
          </label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            placeholder="Enter your full name"
            className="w-full bg-[#F5F1E8] border border-[#E6E0DA] rounded-lg px-4 py-3 font-manrope font-extralight text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#D4755B] transition-colors"
            required
          />
        </div>

        {/* Email */}
        <div>
          <label className="block font-manrope font-extralight text-xs text-[#64748B] uppercase tracking-wider mb-2">
            Email Address
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="your.email@example.com"
            className="w-full bg-[#F5F1E8] border border-[#E6E0DA] rounded-lg px-4 py-3 font-manrope font-extralight text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#D4755B] transition-colors"
            required
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block font-manrope font-extralight text-xs text-[#64748B] uppercase tracking-wider mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="+91 98765 43210"
            className="w-full bg-[#F5F1E8] border border-[#E6E0DA] rounded-lg px-4 py-3 font-manrope font-extralight text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#D4755B] transition-colors"
            required
          />
        </div>

        {/* Date */}
        <div>
          <label className="block font-manrope font-extralight text-xs text-[#64748B] uppercase tracking-wider mb-2">
            Preferred Date
          </label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            className="w-full bg-[#F5F1E8] border border-[#E6E0DA] rounded-lg px-4 py-3 font-manrope font-extralight text-sm text-[#0F172A] focus:outline-none focus:border-[#D4755B] transition-colors"
            required
          />
        </div>

        {/* Time Slot */}
        <div>
          <label className="block font-manrope font-extralight text-xs text-[#64748B] uppercase tracking-wider mb-2">
            Time Slot
          </label>
          <select
            name="timeSlot"
            value={formData.timeSlot}
            onChange={handleInputChange}
            className="w-full bg-[#F5F1E8] border border-[#E6E0DA] rounded-lg px-4 py-3 font-manrope font-extralight text-sm text-[#0F172A] focus:outline-none focus:border-[#D4755B] transition-colors appearance-none cursor-pointer"
            required
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%230F172A' d='M6 8L2 4h8z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 1rem center'
            }}
          >
            <option value="">Select time slot</option>
            <option value="09:00">09:00 AM - 10:00 AM</option>
            <option value="10:00">10:00 AM - 11:00 AM</option>
            <option value="11:00">11:00 AM - 12:00 PM</option>
            <option value="14:00">02:00 PM - 03:00 PM</option>
            <option value="15:00">03:00 PM - 04:00 PM</option>
            <option value="16:00">04:00 PM - 05:00 PM</option>
          </select>
        </div>

        {/* Error Message */}
        {error && (
          <p className="text-center font-manrope text-xs text-red-500 mt-2">{error}</p>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#D4755B] hover:bg-[#C05621] disabled:opacity-60 disabled:cursor-not-allowed text-white font-manrope font-bold text-base py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl mt-6"
        >
          {submitting ? 'Scheduling...' : 'Schedule Visit'}
        </button>

        {/* Info Text */}
        <p className="text-center font-manrope font-extralight text-xs text-[#94A3B8] mt-4">
          We'll confirm your appointment within 24 hours
        </p>
      </form>
    </div>
  );
};

export default ScheduleViewingCard;