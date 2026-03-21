import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import ActivityLogDetailModal from '../components/ActivityLogDetailModal';
import apiClient from '../services/apiClient';

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});
  const [selectedLog, setSelectedLog] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    action: '',
    targetType: '',
    adminEmail: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 20
  });
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Action and target type options
  const actionOptions = [
    { value: '', label: 'All Actions' },
    { value: 'approve_property', label: 'Approve Property' },
    { value: 'reject_property', label: 'Reject Property' },
    { value: 'delete_property', label: 'Delete Property' },
    { value: 'bulk_approve_properties', label: 'Bulk Approve Properties' },
    { value: 'bulk_reject_properties', label: 'Bulk Reject Properties' },
    { value: 'bulk_delete_properties', label: 'Bulk Delete Properties' },
    { value: 'suspend_user', label: 'Suspend User' },
    { value: 'ban_user', label: 'Ban User' },
    { value: 'unban_user', label: 'Unban User' },
    { value: 'delete_user', label: 'Delete User' },
    { value: 'bulk_suspend_users', label: 'Bulk Suspend Users' },
    { value: 'bulk_ban_users', label: 'Bulk Ban Users' }
  ];

  const targetTypeOptions = [
    { value: '', label: 'All Types' },
    { value: 'property', label: 'Property' },
    { value: 'user', label: 'User' },
    { value: 'appointment', label: 'Appointment' }
  ];

  // Fetch activity logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await apiClient.get(`/api/admin/activity-logs?${queryParams}`);
      const data = response.data;
      setLogs(data.logs || []);
      setPagination(data.pagination || {});
    } catch (err) {
      console.error('Error fetching activity logs:', err);
      setError(`Failed to load activity logs. ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Export CSV
  const handleExport = async () => {
    try {
      setExporting(true);

      const queryParams = new URLSearchParams();
      // Remove pagination for export (get all matching records)
      const exportFilters = { ...filters };
      delete exportFilters.page;
      delete exportFilters.limit;

      Object.entries(exportFilters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await apiClient.get(`/api/admin/activity-logs/export?${queryParams}`, {
        responseType: 'blob',
      });

      // Download file
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting logs:', err);
      setError('Failed to export logs. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      action: '',
      targetType: '',
      adminEmail: '',
      startDate: '',
      endDate: '',
      page: 1,
      limit: 20
    });
  };

  // Get action badge color
  const getActionBadgeColor = (action) => {
    if (action.includes('approve')) return 'bg-green-100 text-green-800 border-green-200';
    if (action.includes('reject')) return 'bg-red-100 text-red-800 border-red-200';
    if (action.includes('delete')) return 'bg-red-100 text-red-800 border-red-200';
    if (action.includes('suspend') || action.includes('ban')) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (action.includes('unban')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (action.includes('bulk')) return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Get target type badge color
  const getTargetTypeBadgeColor = (targetType) => {
    switch (targetType) {
      case 'property': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'user': return 'bg-green-100 text-green-800 border-green-200';
      case 'appointment': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Format action display name
  const formatActionName = (action) => {
    return action.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  // Report error to parent/toast system
  useEffect(() => {
    if (error) {
      // Here we'd typically show a toast notification
      console.error('Activity Logs Error:', error);
    }
  }, [error]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1C1B1A]">Activity Logs</h1>
            <p className="text-gray-600 mt-1">
              Comprehensive audit trail of all administrative actions
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border transition-colors duration-200 ${
                showFilters
                  ? 'bg-[#D4755B] text-white border-[#D4755B]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FunnelIcon className="w-4 h-4 inline mr-2" />
              Filters
            </button>

            <button
              onClick={handleExport}
              disabled={exporting || logs.length === 0}
              className="px-4 py-2 bg-[#D4755B] text-white rounded-lg hover:bg-[#C06549]
                       disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <ArrowDownTrayIcon className="w-4 h-4 inline mr-2" />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-6 bg-white rounded-lg border border-[#E6D5C3] p-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Action Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Action
                </label>
                <select
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2
                           focus:ring-[#D4755B] focus:border-transparent"
                >
                  {actionOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Type
                </label>
                <select
                  value={filters.targetType}
                  onChange={(e) => handleFilterChange('targetType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2
                           focus:ring-[#D4755B] focus:border-transparent"
                >
                  {targetTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Admin Email Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Email
                </label>
                <input
                  type="email"
                  value={filters.adminEmail}
                  onChange={(e) => handleFilterChange('adminEmail', e.target.value)}
                  placeholder="admin@buildestate.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2
                           focus:ring-[#D4755B] focus:border-transparent"
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2
                           focus:ring-[#D4755B] focus:border-transparent"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2
                           focus:ring-[#D4755B] focus:border-transparent"
                />
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-md
                           hover:bg-gray-200 transition-colors duration-200"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-lg border border-[#E6D5C3] p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-4 bg-[#E6D5C3] rounded w-24"></div>
                <div className="h-4 bg-[#E6D5C3] rounded w-32"></div>
                <div className="h-4 bg-[#E6D5C3] rounded w-20"></div>
                <div className="h-4 bg-[#E6D5C3] rounded w-40"></div>
                <div className="h-4 bg-[#E6D5C3] rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="bg-white rounded-lg border border-[#E6D5C3] p-6">
          <div className="text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Logs</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => fetchLogs()}
              className="px-4 py-2 bg-[#D4755B] text-white rounded-lg hover:bg-[#C06549]
                       transition-colors duration-200"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E6D5C3] p-6">
          <div className="text-center">
            <MagnifyingGlassIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Logs Found</h3>
            <p className="text-gray-600 mb-4">
              {Object.values(filters).some(v => v && v !== 1 && v !== 20)
                ? 'No logs match your current filters.'
                : 'No administrative actions have been recorded yet.'
              }
            </p>
            {Object.values(filters).some(v => v && v !== 1 && v !== 20) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-[#D4755B] text-white rounded-lg hover:bg-[#C06549]
                         transition-colors duration-200"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[#E6D5C3] overflow-hidden">
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#FAF8F4] border-b border-[#E6D5C3]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Target
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6D5C3]">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-[#FAF8F4] transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.adminEmail}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getActionBadgeColor(log.action)}`}>
                        {formatActionName(log.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getTargetTypeBadgeColor(log.targetType)}`}>
                          {log.targetType}
                        </span>
                        {log.targetName && (
                          <span className="text-sm text-gray-600 max-w-40 truncate">
                            {log.targetName}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {log.metadata?.reason && (
                        <span className="max-w-40 truncate block">
                          {log.metadata.reason}
                        </span>
                      )}
                      {log.metadata?.count && (
                        <span className="text-xs text-gray-500">
                          {log.metadata.count} items
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-[#D4755B] hover:text-[#C06549] font-medium"
                      >
                        <EyeIcon className="w-4 h-4 inline mr-1" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-[#FAF8F4] px-6 py-3 border-t border-[#E6D5C3] flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.currentPage * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage <= 1}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md
                           hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <span className="px-3 py-1 text-sm text-gray-700">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>

                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage >= pagination.totalPages}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md
                           hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activity Log Detail Modal */}
      {selectedLog && (
        <ActivityLogDetailModal
          isOpen={!!selectedLog}
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
};

export default ActivityLogs;