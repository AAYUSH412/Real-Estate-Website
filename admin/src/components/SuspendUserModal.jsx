import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, AlertTriangle } from 'lucide-react';

/**
 * SuspendUserModal Component
 *
 * Modal for suspending a user account with reason and duration
 * Follows the existing modal patterns from PendingListings.jsx
 */
const SuspendUserModal = ({
  isOpen,
  onClose,
  onConfirm,
  user,
  isLoading = false
}) => {
  const [days, setDays] = useState(7);
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    const newErrors = {};
    if (!days || days < 1 || days > 365) {
      newErrors.days = 'Days must be between 1 and 365';
    }
    if (!reason.trim()) {
      newErrors.reason = 'Suspension reason is required';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onConfirm({ days: parseInt(days), reason: reason.trim() });
    }
  };

  const handleClose = () => {
    setDays(7);
    setReason('');
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl w-full max-w-md shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#E6E0DA]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1C1B1A]">Suspend User</h3>
                <p className="text-sm text-[#5A5856]">{user?.name}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-[#F5F1E8] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            {/* Warning */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800 mb-1">
                  This will temporarily suspend the user's account
                </p>
                <p className="text-xs text-amber-700">
                  Their listings will be hidden and they won't be able to log in during the suspension period.
                </p>
              </div>
            </div>

            {/* Days Input */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-[#1C1B1A] mb-2">
                Suspension Duration
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl bg-white text-[#1C1B1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 transition-all ${
                    errors.days
                      ? 'border-red-300 focus:ring-red-500/20'
                      : 'border-[#E6E0DA] focus:border-[#D4755B] focus:ring-[#D4755B]/20'
                  }`}
                  placeholder="Number of days"
                />
                <div className="absolute inset-y-0 right-3 flex items-center text-sm text-[#5A5856]">
                  day{days != 1 ? 's' : ''}
                </div>
              </div>
              {errors.days && (
                <p className="text-xs text-red-600 mt-1">{errors.days}</p>
              )}
            </div>

            {/* Reason Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-[#1C1B1A] mb-2">
                Reason for Suspension
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className={`w-full px-4 py-3 border rounded-xl bg-white text-[#1C1B1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 resize-none transition-all ${
                  errors.reason
                    ? 'border-red-300 focus:ring-red-500/20'
                    : 'border-[#E6E0DA] focus:border-[#D4755B] focus:ring-[#D4755B]/20'
                }`}
                placeholder="Explain why this user is being suspended..."
              />
              {errors.reason && (
                <p className="text-xs text-red-600 mt-1">{errors.reason}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1 px-4 py-3 border border-[#E6E0DA] text-[#1C1B1A] rounded-xl font-semibold text-sm hover:bg-[#F5F1E8] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl font-semibold text-sm hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Suspending...
                  </>
                ) : (
                  'Suspend User'
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SuspendUserModal;