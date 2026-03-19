import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Calendar, User, Target, Info } from 'lucide-react';
import { useState } from 'react';

/**
 * ActivityLogDetailModal Component
 *
 * Shows comprehensive details about a specific admin activity log entry
 * Includes metadata display and copy-to-clipboard functionality
 */
const ActivityLogDetailModal = ({
  isOpen,
  onClose,
  log
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyMetadata = async () => {
    if (log?.metadata) {
      try {
        await navigator.clipboard.writeText(JSON.stringify(log.metadata, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy metadata:', err);
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  };

  const getActionColor = (action) => {
    if (action.includes('ban') || action.includes('delete')) return 'text-red-600 bg-red-50';
    if (action.includes('suspend') || action.includes('reject')) return 'text-amber-600 bg-amber-50';
    if (action.includes('approve') || action.includes('unban')) return 'text-emerald-600 bg-emerald-50';
    return 'text-blue-600 bg-blue-50';
  };

  const DetailRow = ({ label, value, icon: Icon }) => (
    <div className="flex items-start gap-3 py-3 border-b border-[#F5F1E8] last:border-0">
      {Icon && (
        <div className="w-8 h-8 bg-[#F5F1E8] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-[#5A5856]" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <dt className="text-xs font-medium text-[#5A5856] uppercase tracking-wider mb-1">
          {label}
        </dt>
        <dd className="text-sm text-[#1C1B1A] break-words">
          {value || 'N/A'}
        </dd>
      </div>
    </div>
  );

  if (!isOpen || !log) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#E6E0DA]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#D4755B]/10 rounded-xl flex items-center justify-center">
                <Info className="w-5 h-5 text-[#D4755B]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1C1B1A]">Activity Details</h3>
                <p className="text-sm text-[#5A5856]">Complete log information</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#F5F1E8] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
            {/* Action Badge */}
            <div className="mb-6">
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getActionColor(log.action)}`}>
                {log.action.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>

            {/* Basic Details */}
            <div className="space-y-0 mb-6">
              <DetailRow
                label="Timestamp"
                value={formatDate(log.createdAt)}
                icon={Calendar}
              />
              <DetailRow
                label="Admin"
                value={log.adminEmail}
                icon={User}
              />
              <DetailRow
                label="Target Type"
                value={log.targetType}
                icon={Target}
              />
              <DetailRow
                label="Target Name"
                value={log.targetName}
              />
              <DetailRow
                label="IP Address"
                value={log.ipAddress}
              />
              <DetailRow
                label="User Agent"
                value={log.userAgent}
              />
            </div>

            {/* Metadata Section */}
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div className="border border-[#E6E0DA] rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-[#1C1B1A]">Additional Details</h4>
                  <button
                    onClick={handleCopyMetadata}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs border border-[#E6E0DA] rounded-lg hover:bg-[#F5F1E8] transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy JSON
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-3">
                  {Object.entries(log.metadata).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-xs font-medium text-[#5A5856] uppercase tracking-wider mb-1">
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </dt>
                      <dd className="text-sm text-[#1C1B1A]">
                        {Array.isArray(value) ? (
                          <div className="space-y-1">
                            {value.slice(0, 10).map((item, index) => (
                              <div key={index} className="text-xs font-mono bg-[#F5F1E8] px-2 py-1 rounded">
                                {String(item)}
                              </div>
                            ))}
                            {value.length > 10 && (
                              <p className="text-xs text-[#5A5856] italic">
                                ... and {value.length - 10} more items
                              </p>
                            )}
                          </div>
                        ) : typeof value === 'object' ? (
                          <pre className="text-xs font-mono bg-[#F5F1E8] p-2 rounded overflow-x-auto">
                            {JSON.stringify(value, null, 2)}
                          </pre>
                        ) : (
                          String(value)
                        )}
                      </dd>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-[#E6E0DA] bg-[#FAF8F4]">
            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-[#D4755B] text-white rounded-xl font-semibold text-sm hover:bg-[#C05E44] transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ActivityLogDetailModal;