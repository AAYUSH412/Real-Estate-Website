import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Users, Search, Filter, ChevronDown, MoreVertical,
  Calendar, Mail, Shield, Clock, Trash2, Eye,
  AlertCircle, RefreshCw, UserCheck, Ban
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "../services/apiClient";
import { cn, formatDate } from "../lib/utils";

// Components
import UserStatusBadge from "../components/UserStatusBadge";
import SuspendUserModal from "../components/SuspendUserModal";
import BanUserModal from "../components/BanUserModal";
import BulkActionBar from "../components/BulkActionBar";

const UsersManagement = () => {
  // State
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [statusCounts, setStatusCounts] = useState({});

  // Selection & Actions
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [selectedUser, setSelectedUser] = useState(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch users with filters
  const fetchUsers = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit: 15,
        sortBy,
        sortOrder,
      };

      if (statusFilter !== 'all') params.status = statusFilter;
      if (debouncedSearchTerm) params.search = debouncedSearchTerm;

      const response = await apiClient.get('/api/admin/users', { params });

      if (response.data.success) {
        setUsers(response.data.users);
        setPagination(response.data.pagination);
        setStatusCounts(response.data.statusCounts);
        setSelectedUsers(new Set());
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Unable to load users. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, statusFilter, debouncedSearchTerm, sortBy, sortOrder]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // User Actions
  const handleSuspendUser = async (suspendData) => {
    try {
      setActionLoading(true);
      const response = await apiClient.put(
        `/api/admin/users/${selectedUser._id}/suspend`,
        suspendData
      );

      if (response.data.success) {
        toast.success(`User suspended for ${suspendData.days} days`);
        setShowSuspendModal(false);
        setSelectedUser(null);
        fetchUsers(true);
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      console.error("Error suspending user:", err);
      toast.error("Failed to suspend user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBanUser = async (banData) => {
    try {
      setActionLoading(true);
      const response = await apiClient.put(
        `/api/admin/users/${selectedUser._id}/ban`,
        banData
      );

      if (response.data.success) {
        toast.success("User banned successfully");
        setShowBanModal(false);
        setSelectedUser(null);
        fetchUsers(true);
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      console.error("Error banning user:", err);
      toast.error("Failed to ban user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnbanUser = async (user) => {
    try {
      setActionLoading(true);
      const response = await apiClient.put(
        `/api/admin/users/${user._id}/unban`,
        {}
      );

      if (response.data.success) {
        toast.success("User account reactivated");
        fetchUsers(true);
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      console.error("Error reactivating user:", err);
      toast.error("Failed to reactivate user");
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk Actions
  const handleBulkSuspend = async (suspendData) => {
    try {
      setActionLoading(true);
      const response = await apiClient.post('/api/admin/users/bulk-suspend', {
        userIds: Array.from(selectedUsers),
        ...suspendData,
      });

      if (response.data.success) {
        toast.success(`${response.data.count} users suspended`);
        setSelectedUsers(new Set());
        fetchUsers(true);
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      console.error("Error bulk suspending users:", err);
      toast.error("Failed to suspend selected users");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkBan = async (banData) => {
    try {
      setActionLoading(true);
      const response = await apiClient.post('/api/admin/users/bulk-ban', {
        userIds: Array.from(selectedUsers),
        ...banData,
      });

      if (response.data.success) {
        toast.success(`${response.data.count} users banned`);
        setSelectedUsers(new Set());
        fetchUsers(true);
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      console.error("Error bulk banning users:", err);
      toast.error("Failed to ban selected users");
    } finally {
      setActionLoading(false);
    }
  };

  // Selection Handlers
  const handleSelectUser = (userId) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u._id)));
    }
  };

  // Filter Tabs
  const filterTabs = [
    { key: 'all', label: 'All Users', count: statusCounts.total },
    { key: 'active', label: 'Active', count: statusCounts.active },
    { key: 'suspended', label: 'Suspended', count: statusCounts.suspended },
    { key: 'banned', label: 'Banned', count: statusCounts.banned },
  ];

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen pt-8 pb-12 px-4 bg-[#FAF8F4]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-8 w-48 bg-[#E6D5C3] rounded-xl animate-pulse mb-2" />
            <div className="h-4 w-64 bg-[#E6D5C3] rounded-lg animate-pulse" />
          </div>
          <div className="grid grid-cols-1 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-[#E6D5C3] animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#E6D5C3] rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 w-32 bg-[#E6D5C3] rounded mb-2" />
                    <div className="h-3 w-48 bg-[#E6D5C3] rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen pt-8 flex items-center justify-center bg-[#FAF8F4]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-[#1C1B1A] mb-2">Failed to load users</h3>
          <p className="text-[#5A5856] mb-6 text-sm">{error}</p>
          <button
            onClick={() => fetchUsers()}
            className="px-6 py-3 bg-[#D4755B] text-white rounded-xl font-semibold text-sm hover:bg-[#C05E44] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-8 pb-12 px-4 bg-[#FAF8F4]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-[#1C1B1A] mb-1">User Management</h1>
            <p className="text-[#5A5856] text-sm">
              Manage registered users, suspensions, and account status
            </p>
          </div>
          <motion.button
            onClick={() => fetchUsers(true)}
            disabled={refreshing}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E6D5C3] text-[#1C1B1A] rounded-xl text-sm font-medium hover:border-[#D4755B] hover:text-[#D4755B] transition-all duration-200 shadow-card disabled:opacity-60"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </motion.button>
        </motion.div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl border border-[#E6D5C3] shadow-card mb-6">
          <div className="border-b border-[#E6D5C3] px-6 py-4">
            <div className="flex flex-wrap gap-2">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setStatusFilter(tab.key);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                    statusFilter === tab.key
                      ? "bg-[#D4755B] text-white"
                      : "bg-[#F5F1E8] text-[#5A5856] hover:bg-[#E6D5C3]"
                  )}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="ml-2 px-2 py-0.5 bg-black/10 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Search & Sort */}
          <div className="p-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 border border-[#E6D5C3] rounded-xl bg-white text-[#1C1B1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#D4755B]/20 focus:border-[#D4755B] transition-all"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2.5 border border-[#E6D5C3] rounded-xl bg-white text-[#1C1B1A] focus:outline-none focus:ring-2 focus:ring-[#D4755B]/20 focus:border-[#D4755B] transition-all"
              >
                <option value="createdAt">Date Joined</option>
                <option value="lastActive">Last Active</option>
                <option value="name">Name</option>
              </select>
              <button
                onClick={() => {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  setCurrentPage(1);
                }}
                className="px-4 py-2.5 border border-[#E6D5C3] rounded-xl bg-white text-[#1C1B1A] hover:bg-[#F5F1E8] transition-colors"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-[#E6D5C3] shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F5F1E8] border-b border-[#E6D5C3]">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedUsers.size === users.length && users.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-[#D4755B] rounded border-[#E6D5C3] focus:ring-[#D4755B]/20"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#1C1B1A]">User</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#1C1B1A]">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#1C1B1A]">Properties</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#1C1B1A]">Joined</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#1C1B1A]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <motion.tr
                    key={user._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-[#E6D5C3] hover:bg-[#FAF8F4] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user._id)}
                        onChange={() => handleSelectUser(user._id)}
                        className="w-4 h-4 text-[#D4755B] rounded border-[#E6D5C3] focus:ring-[#D4755B]/20"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#D4755B]/10 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-[#D4755B]" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#1C1B1A]">{user.name}</p>
                          <p className="text-sm text-[#5A5856]">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <UserStatusBadge status={user.status} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[#1C1B1A]">{user.propertyCount || 0}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[#5A5856]">
                        {formatDate(user.createdAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {user.status === 'active' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowSuspendModal(true);
                              }}
                              className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Suspend User"
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowBanModal(true);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Ban User"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {(user.status === 'suspended' || user.status === 'banned') && (
                          <button
                            onClick={() => handleUnbanUser(user)}
                            disabled={actionLoading}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Reactivate User"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/users/${user._id}`)}
                          className="p-2 text-[#5A5856] hover:bg-[#F5F1E8] rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-[#E6D5C3] flex items-center justify-between">
              <p className="text-sm text-[#5A5856]">
                Showing {pagination.currentPage} of {pagination.totalPages} pages
                ({pagination.totalUsers} total users)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={!pagination.hasPreviousPage}
                  className="px-3 py-2 border border-[#E6D5C3] rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F5F1E8] transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="px-3 py-2 border border-[#E6D5C3] rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F5F1E8] transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {users.length === 0 && !loading && (
            <div className="px-6 py-12 text-center">
              <Users className="w-12 h-12 text-[#E6D5C3] mx-auto mb-4" />
              <p className="text-[#5A5856] mb-2">No users found</p>
              <p className="text-sm text-[#9CA3AF]">
                {searchTerm || statusFilter !== 'all'
                  ? "Try adjusting your filters or search terms"
                  : "Users will appear here once they register"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedUsers.size}
        onClearSelection={() => setSelectedUsers(new Set())}
        onSuspendAll={() => {
          // Show bulk suspend modal (would need to create this)
          toast.info('Bulk suspend functionality coming soon');
        }}
        onBanAll={() => {
          // Show bulk ban modal (would need to create this)
          toast.info('Bulk ban functionality coming soon');
        }}
        context="users"
        isVisible={selectedUsers.size > 0}
      />

      {/* Modals */}
      <SuspendUserModal
        isOpen={showSuspendModal}
        onClose={() => {
          setShowSuspendModal(false);
          setSelectedUser(null);
        }}
        onConfirm={handleSuspendUser}
        user={selectedUser}
        isLoading={actionLoading}
      />

      <BanUserModal
        isOpen={showBanModal}
        onClose={() => {
          setShowBanModal(false);
          setSelectedUser(null);
        }}
        onConfirm={handleBanUser}
        user={selectedUser}
        isLoading={actionLoading}
      />
    </div>
  );
};

export default UsersManagement;