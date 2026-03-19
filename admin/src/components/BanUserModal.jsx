import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, AlertTriangle } from 'lucide-react';

/**
 * BanUserModal Component
 *
 * Modal for permanently banning a user account
 * Shows strong warning about permanent nature of the action
 */
const BanUserModal = ({
  isOpen,
  onClose,
  onConfirm,
  user,
  isLoading = false
}) => {
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState({});
  const [confirmText, setConfirmText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    const newErrors = {};
    if (!reason.trim()) {
      newErrors.reason = 'Ban reason is required';
    }
    if (confirmText !== 'PERMANENTLY BAN') {
      newErrors.confirmText = 'Please type "PERMANENTLY BAN" to confirm';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onConfirm({ reason: reason.trim() });
    }
  };

  const handleClose = () => {
    setReason('');
    setConfirmText('');
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
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1C1B1A]">Ban User</h3>
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
            {/* Danger Warning */}
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800 mb-1">
                  ⚠️ This action is permanent and cannot be undone
                </p>
                <ul className="text-xs text-red-700 space-y-1">
                  <li>• User will lose access to their account immediately</li>
                  <li>• All their listings will be removed from the platform</li>
                  <li>• They cannot create new accounts</li>
                </ul>
              </div>
            </div>

            {/* Reason Input */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-[#1C1B1A] mb-2">
                Reason for Ban <span className="text-red-500">*</span>
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
                placeholder="Provide detailed explanation for the permanent ban..."
              />
              {errors.reason && (
                <p className="text-xs text-red-600 mt-1">{errors.reason}</p>
              )}
            </div>

            {/* Confirmation Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-[#1C1B1A] mb-2">
                Type "PERMANENTLY BAN" to confirm <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl bg-white text-[#1C1B1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 transition-all ${
                  errors.confirmText
                    ? 'border-red-300 focus:ring-red-500/20'
                    : 'border-[#E6E0DA] focus:border-[#D4755B] focus:ring-[#D4755B]/20'
                }`}
                placeholder="PERMANENTLY BAN"
              />
              {errors.confirmText && (
                <p className="text-xs text-red-600 mt-1">{errors.confirmText}</p>
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
                disabled={isLoading || confirmText !== 'PERMANENTLY BAN'}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Banning...
                  </>
                ) : (
                  'Ban Permanently'
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default BanUserModal;