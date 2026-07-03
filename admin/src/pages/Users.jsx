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

  // ── User initials avatar ──
  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(" ").filter(Boolean);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  const statusStyles = {
    active: "text-emerald-700 bg-emerald-50 border-emerald-200/60",
    suspended: "text-amber-700 bg-amber-50 border-amber-200/60",
    banned: "text-red-700 bg-red-50 border-red-200/60",
  };

  const avatarColors = [
    "bg-violet-100 text-violet-700",
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
  ];

  const getAvatarColor = (name = "") => {
    const idx = name.charCodeAt(0) % avatarColors.length;
    return avatarColors[idx];
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="h-7 w-44 bg-[#EBEBEA] rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-[#EBEBEA] rounded animate-pulse mb-8" />
          <div className="bg-white rounded-2xl border border-[#E8E7E5] overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-[#F0EFED] last:border-0">
                <div className="w-4 h-4 bg-[#EBEBEA] rounded animate-pulse" />
                <div className="w-9 h-9 bg-[#EBEBEA] rounded-full animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 w-36 bg-[#EBEBEA] rounded animate-pulse mb-1.5" />
                  <div className="h-3 w-48 bg-[#EBEBEA] rounded animate-pulse" />
                </div>
                <div className="h-5 w-16 bg-[#EBEBEA] rounded-full animate-pulse" />
                <div className="h-4 w-20 bg-[#EBEBEA] rounded animate-pulse" />
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
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="font-semibold text-[#111110] mb-1">Failed to load users</h3>
          <p className="text-sm text-[#9B9B99] mb-5">{error}</p>
          <button onClick={() => fetchUsers()}
            className="px-5 py-2.5 bg-[#D4755B] text-white rounded-lg text-sm font-medium hover:bg-[#C05E44] active:scale-[0.98] transition-all">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F3] px-6 py-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#111110] tracking-tight mb-0.5">Users</h1>
            <p className="text-sm text-[#9B9B99]">
              {pagination.totalUsers ?? users.length} registered accounts
            </p>
          </div>
          <button
            onClick={() => fetchUsers(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E8E7E5] text-[#6B6B6A] rounded-lg text-sm font-medium hover:border-[#D4755B] hover:text-[#D4755B] active:scale-[0.97] transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {/* Filter + Search bar */}
        <div className="bg-white rounded-2xl border border-[#E8E7E5] mb-5 overflow-hidden">
          {/* Status tabs */}
          <div className="flex border-b border-[#F0EFED]">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setStatusFilter(tab.key); setCurrentPage(1); }}
                className={cn(
                  "px-5 py-3.5 text-sm font-medium transition-all border-b-2 -mb-px",
                  statusFilter === tab.key
                    ? "border-[#D4755B] text-[#D4755B]"
                    : "border-transparent text-[#9B9B99] hover:text-[#111110]"
                )}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className={cn(
                    "ml-2 px-1.5 py-0.5 rounded text-xs tabular-nums",
                    statusFilter === tab.key ? "bg-[#D4755B]/10 text-[#D4755B]" : "bg-[#F5F5F3] text-[#9B9B99]"
                  )}>
                    {tab.count ?? 0}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search + sort */}
          <div className="flex gap-3 px-5 py-3.5">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9B99]" />
              <input
                type="text"
                placeholder="Search by name or email…"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-[#E8E7E5] rounded-lg text-sm text-[#111110] placeholder:text-[#9B9B99] focus:outline-none focus:ring-2 focus:ring-[#D4755B]/15 focus:border-[#D4755B] transition-all"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 border border-[#E8E7E5] rounded-lg bg-white text-sm text-[#6B6B6A] focus:outline-none focus:border-[#D4755B] transition-all"
            >
              <option value="createdAt">Date Joined</option>
              <option value="lastActive">Last Active</option>
              <option value="name">Name</option>
            </select>
            <button
              onClick={() => { setSortOrder(sortOrder === "asc" ? "desc" : "asc"); setCurrentPage(1); }}
              className="px-3 py-2 border border-[#E8E7E5] rounded-lg bg-white text-sm text-[#6B6B6A] hover:bg-[#F5F5F3] transition-colors font-space-mono"
              title={sortOrder === "asc" ? "Sort descending" : "Sort ascending"}
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>

        {/* Users table */}
        <div className="bg-white rounded-2xl border border-[#E8E7E5] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#F0EFED]">
                  <th className="pl-5 pr-3 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedUsers.size === users.length && users.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-[#D0CFCE] accent-[#D4755B] cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#9B9B99] uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#9B9B99] uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#9B9B99] uppercase tracking-wider">Properties</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#9B9B99] uppercase tracking-wider">Joined</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#9B9B99] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <motion.tr
                    key={user._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b border-[#F8F8F7] last:border-0 hover:bg-[#FAFAF9] transition-colors"
                  >
                    <td className="pl-5 pr-3 py-3.5">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user._id)}
                        onChange={() => handleSelectUser(user._id)}
                        className="w-4 h-4 rounded border-[#D0CFCE] accent-[#D4755B] cursor-pointer"
                      />
                    </td>

                    {/* User cell */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                          getAvatarColor(user.name)
                        )}>
                          {getInitials(user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#111110] truncate">{user.name}</p>
                          <p className="text-xs text-[#9B9B99] truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span className={cn(
                        "inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border capitalize",
                        statusStyles[user.status] || "text-[#6B6B6A] bg-[#F5F5F3] border-[#E8E7E5]"
                      )}>
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          user.status === "active" ? "bg-emerald-500" :
                          user.status === "suspended" ? "bg-amber-500" : "bg-red-500"
                        )} />
                        {user.status}
                      </span>
                    </td>

                    {/* Properties */}
                    <td className="px-4 py-3.5">
                      <span className="font-space-mono text-sm text-[#111110] tabular-nums">
                        {user.propertyCount || 0}
                      </span>
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-[#9B9B99]">{formatDate(user.createdAt)}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {user.status === "active" && (
                          <>
                            <button
                              onClick={() => { setSelectedUser(user); setShowSuspendModal(true); }}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200/60"
                              title="Suspend"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Suspend</span>
                            </button>
                            <button
                              onClick={() => { setSelectedUser(user); setShowBanModal(true); }}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200/60"
                              title="Ban"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Ban</span>
                            </button>
                          </>
                        )}
                        {(user.status === "suspended" || user.status === "banned") && (
                          <button
                            onClick={() => handleUnbanUser(user)}
                            disabled={actionLoading}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200/60 disabled:opacity-50"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Reactivate</span>
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/users/${user._id}`)}
                          className="p-1.5 text-[#9B9B99] hover:text-[#111110] hover:bg-[#F5F5F3] rounded-lg transition-colors"
                          title="View profile"
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

          {/* Empty */}
          {users.length === 0 && (
            <div className="py-16 text-center">
              <Users className="w-10 h-10 text-[#D0CFCE] mx-auto mb-3" />
              <p className="text-sm font-medium text-[#6B6B6A] mb-1">No users found</p>
              <p className="text-xs text-[#9B9B99]">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your filters or search"
                  : "Users will appear here once they register"}
              </p>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-5 py-3.5 border-t border-[#F0EFED] flex items-center justify-between">
              <p className="text-xs text-[#9B9B99]">
                Page {pagination.currentPage} of {pagination.totalPages}
                <span className="ml-1 text-[#6B6B6A]">({pagination.totalUsers} users)</span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={!pagination.hasPreviousPage}
                  className="px-3 py-1.5 text-xs font-medium border border-[#E8E7E5] rounded-lg disabled:opacity-40 hover:bg-[#F5F5F3] transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="px-3 py-1.5 text-xs font-medium border border-[#E8E7E5] rounded-lg disabled:opacity-40 hover:bg-[#F5F5F3] transition-colors"
                >
                  Next
                </button>
              </div>
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