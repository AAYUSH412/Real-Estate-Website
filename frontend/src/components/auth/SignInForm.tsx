import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';

interface SignInFormProps {
  onSubmit: (data: any) => void;
}

const SignInForm: React.FC<SignInFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = React.useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Email Input */}
      <div>
        <label className="block font-manrope font-extralight text-xs text-[#64748B] uppercase tracking-wider mb-2">
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="john.doe@example.com"
            className="w-full bg-[#F5F1E8] border border-[#E6E0DA] rounded-lg pl-12 pr-4 py-3.5 font-manrope font-extralight text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#D4755B] transition-[border-color]"
            required
          />
        </div>
      </div>

      {/* Password Input */}
      <div>
        <label className="block font-manrope font-extralight text-xs text-[#64748B] uppercase tracking-wider mb-2">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Enter your password"
            className="w-full bg-[#F5F1E8] border border-[#E6E0DA] rounded-lg pl-12 pr-12 py-3.5 font-manrope font-extralight text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#D4755B] transition-[border-color]"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#D4755B] transition-[color]"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Remember Me & Forgot Password */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="rememberMe"
            checked={formData.rememberMe}
            onChange={handleInputChange}
            className="w-4 h-4 rounded border-[#E6E0DA] text-[#D4755B] focus:ring-[#D4755B]"
          />
          <span className="font-manrope font-extralight text-sm text-[#4B5563]">
            Remember me
          </span>
        </label>
        <Link
          to="/forgot-password"
          className="font-manrope font-medium text-sm text-[#D4755B] hover:text-[#C05621] transition-[color]"
        >
          Forgot Password?
        </Link>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full bg-[#D4755B] hover:bg-[#C05621] text-white font-manrope font-bold text-base py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl"
      >
        Sign In
      </button>
    </form>
  );
};

export default SignInForm;