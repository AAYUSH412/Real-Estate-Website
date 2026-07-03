import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import AuthHeader from '../components/auth/AuthHeader';
import { userAPI } from '../services/api';

const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const calculatePasswordStrength = (pwd: string): number => {
    let strength = 0;
    if (pwd.length >= 8) strength += 1;
    if (/[A-Z]/.test(pwd)) strength += 1;
    if (/[a-z]/.test(pwd)) strength += 1;
    if (/\d/.test(pwd)) strength += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) strength += 1;
    return strength;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordStrength(calculatePasswordStrength(newPassword));
  };

  const getStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-500';
    if (passwordStrength === 2) return 'bg-yellow-500';
    if (passwordStrength === 3) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = () => {
    if (passwordStrength <= 1) return 'Weak';
    if (passwordStrength === 2) return 'Fair';
    if (passwordStrength === 3) return 'Good';
    return 'Strong';
  };

  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const isFormValid = password && confirmPassword && passwordsMatch && passwordStrength >= 3;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      toast.error('Please ensure passwords match and meet strength requirements.');
      return;
    }

    if (!token) {
      toast.error('Invalid reset link. Please request a new one.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await userAPI.resetPassword(token, password);
      if (data.success) {
        setIsSuccess(true);
        toast.success('Password reset successful!');
        setTimeout(() => navigate('/signin'), 3000);
      } else {
        toast.error(data.message || 'Failed to reset password');
      }
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(error.response?.data?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center py-12 px-4">
      <div className="max-w-[480px] w-full">
        {/* Logo */}
        <AuthHeader />

        {/* Card */}
        <div className="bg-white border border-[#E6E0DA] rounded-2xl p-8 shadow-xl">
          {isSuccess ? (
            /* Success State */
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="font-syne font-bold text-2xl text-[#221410] mb-3">
                Password Reset!
              </h1>
              <p className="font-manrope font-extralight text-sm text-[#4B5563] mb-6">
                Your password has been reset successfully. Redirecting you to sign in...
              </p>
              <Link
                to="/signin"
                className="w-full inline-block bg-[#D4755B] text-white font-manrope font-bold py-3 rounded-xl hover:bg-[#C05621] transition-all text-center"
              >
                Sign In Now
              </Link>
            </div>
          ) : (
            /* Form State */
            <>
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-[#FFF7ED] rounded-full flex items-center justify-center mx-auto mb-5">
                  <Lock className="w-7 h-7 text-[#D4755B]" />
                </div>
                <h1 className="font-syne font-bold text-3xl text-[#221410] mb-2">
                  Reset Password
                </h1>
                <p className="font-manrope font-extralight text-sm text-[#4B5563]">
                  Create a new secure password for your account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* New Password */}
                <div>
                  <label className="block font-manrope font-medium text-sm text-[#374151] mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={handlePasswordChange}
                      placeholder="Enter new password"
                      className="w-full bg-[#F5F1E8] border border-[#EBE5DE] rounded-xl pl-12 pr-12 py-3.5 font-manrope text-sm text-[#221410] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#D4755B] focus:ring-1 focus:ring-[#D4755B] transition-all"
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

                  {/* Password Strength Indicator */}
                  {password && (
                    <div className="mt-3">
                      <div className="flex gap-1 mb-1.5">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={`h-1.5 flex-1 rounded-full transition-[background-color] ${
                              level <= passwordStrength ? getStrengthColor() : 'bg-[#E6E0DA]'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="font-manrope text-xs text-[#6B7280]">
                        Password strength: <span className="font-medium">{getStrengthLabel()}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block font-manrope font-medium text-sm text-[#374151] mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full bg-[#F5F1E8] border border-[#EBE5DE] rounded-xl pl-12 pr-12 py-3.5 font-manrope text-sm text-[#221410] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#D4755B] focus:ring-1 focus:ring-[#D4755B] transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#D4755B] transition-[color]"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Match Indicator */}
                  {confirmPassword && (
                    <div className="flex items-center gap-1.5 mt-2">
                      {passwordsMatch ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="font-manrope text-xs text-green-600">Passwords match</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <span className="font-manrope text-xs text-red-600">Passwords don't match</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Requirements */}
                <div className="bg-[#F5F1E8] rounded-xl p-4">
                  <p className="font-manrope font-medium text-xs text-[#374151] mb-2">Password Requirements:</p>
                  <ul className="space-y-1">
                    {[
                      { text: 'At least 8 characters', met: password.length >= 8 },
                      { text: 'One uppercase letter', met: /[A-Z]/.test(password) },
                      { text: 'One lowercase letter', met: /[a-z]/.test(password) },
                      { text: 'One number', met: /\d/.test(password) },
                      { text: 'One special character', met: /[^A-Za-z0-9]/.test(password) },
                    ].map((req, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle className={`w-3.5 h-3.5 ${req.met ? 'text-green-500' : 'text-[#D1D5DB]'}`} />
                        <span className={`font-manrope text-xs ${req.met ? 'text-green-600' : 'text-[#9CA3AF]'}`}>
                          {req.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !isFormValid}
                  className="w-full bg-[#D4755B] hover:bg-[#C05621] disabled:opacity-60 disabled:cursor-not-allowed text-white font-manrope font-bold text-base py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>

              {/* Back to Sign In */}
              <Link
                to="/signin"
                className="flex items-center justify-center gap-2 mt-6 font-manrope font-medium text-sm text-[#64748B] hover:text-[#D4755B] transition-[color]"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
