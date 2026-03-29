import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Users, Home, Calendar, Activity, Mail, Phone,
  MapPin, Clock, Shield, Ban, UserCheck, Trash2, Eye,
  AlertCircle, RefreshCw, ExternalLink, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "../services/apiClient";
import { cn, formatDate } from "../lib/utils";

// Components
import UserStatusBadge from "../components/UserStatusBadge";
import SuspendUserModal from "../components/SuspendUserModal";
import BanUserModal from "../components/BanUserModal";

const UserDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // State
  const [user, setUser] = useState(null);
  const [properties, setProperties] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Modals
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch user details
  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(`/api/admin/users/${id}`);

      if (response.data.success) {
        setUser(response.data.user);
        setProperties(response.data.properties || []);
        setAppointments(response.data.appointments || []);
      } else {
        setError(response.data.message || "User not found");
      }
    } catch (err) {
      console.error("Error fetching user details:", err);
      setError("Unable to load user details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchUserDetails();
    }
  }, [id]);

  // User Actions
  const handleSuspendUser = async (suspendData) => {
    try {
      setActionLoading(true);
      const response = await apiClient.put(
        `/api/admin/users/${user._id}/suspend`,
        suspendData
      );

      if (response.data.success) {
        toast.success(`User suspended for ${suspendData.days} days`);
        setShowSuspendModal(false);
        fetchUserDetails();
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      toast.error("Failed to suspend user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBanUser = async (banData) => {
    try {
      setActionLoading(true);
      const response = await apiClient.put(
        `/api/admin/users/${user._id}/ban`,
        banData
      );

      if (response.data.success) {
        toast.success("User banned successfully");
        setShowBanModal(false);
        fetchUserDetails();
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      toast.error("Failed to ban user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnbanUser = async () => {
    try {
      setActionLoading(true);
      const response = await apiClient.put(
        `/api/admin/users/${user._id}/unban`,
        {}
      );

      if (response.data.success) {
        toast.success("User account reactivated");
        fetchUserDetails();
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      toast.error("Failed to reactivate user");
    } finally {
      setActionLoading(false);
    }
  };

  // Tabs
  const tabs = [
    { key: 'overview', label: 'Overview', icon: Users },
    { key: 'properties', label: `Properties (${properties.length})`, icon: Home },
    { key: 'appointments', label: `Appointments (${appointments.length})`, icon: Calendar },
  ];

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen pt-8 pb-12 px-4 bg-[#FAF8F4]">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="h-8 w-48 bg-[#E6D5C3] rounded-xl animate-pulse mb-4" />
            <div className="bg-white rounded-2xl p-8 border border-[#E6D5C3] animate-pulse">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-[#E6D5C3] rounded-full" />
                <div className="flex-1">
                  <div className="h-6 w-48 bg-[#E6D5C3] rounded mb-2" />
                  <div className="h-4 w-64 bg-[#E6D5C3] rounded mb-2" />
                  <div className="h-4 w-32 bg-[#E6D5C3] rounded" />
                </div>
              </div>
            </div>
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
          <h3 className="text-lg font-bold text-[#1C1B1A] mb-2">User not found</h3>
          <p className="text-[#5A5856] mb-6 text-sm">{error}</p>
          <button
            onClick={() => navigate('/admin/users')}
            className="px-6 py-3 bg-[#D4755B] text-white rounded-xl font-semibold text-sm hover:bg-[#C05E44] transition-colors"
          >
            Back to Users
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-8 pb-12 px-4 bg-[#FAF8F4]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <button
            onClick={() => navigate('/admin/users')}
            className="p-2 hover:bg-white rounded-lg border border-[#E6D5C3] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-[#1C1B1A]">User Details</h1>
            <p className="text-[#5A5856] text-sm">Complete user information and management</p>
          </div>
        </motion.div>

        {/* User Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-[#E6D5C3] shadow-card p-8 mb-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* Avatar & Basic Info */}
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-[#D4755B]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-10 h-10 text-[#D4755B]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#1C1B1A] mb-2">{user.name}</h2>
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-[#5A5856]" />
                  <span className="text-[#5A5856]">{user.email}</span>
                </div>
                <UserStatusBadge status={user.status} />
              </div>
            </div>

            {/* Actions */}
            <div className="lg:ml-auto flex flex-wrap gap-3">
              {user.status === 'active' && (
                <>
                  <button
                    onClick={() => setShowSuspendModal(true)}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-medium text-sm hover:bg-amber-100 transition-colors disabled:opacity-50"
                  >
                    <Clock className="w-4 h-4" />
                    Suspend
                  </button>
                  <button
                    onClick={() => setShowBanModal(true)}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-xl font-medium text-sm hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <Ban className="w-4 h-4" />
                    Ban
                  </button>
                </>
              )}
              {(user.status === 'suspended' || user.status === 'banned') && (
                <button
                  onClick={handleUnbanUser}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-medium text-sm hover:bg-emerald-100 transition-colors disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" />
                  Reactivate
                </button>
              )}
              <button
                onClick={fetchUserDetails}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2.5 border border-[#E6D5C3] text-[#5A5856] rounded-xl font-medium text-sm hover:bg-[#F5F1E8] transition-colors disabled:opacity-50"
              >
                <RefreshCw className={cn("w-4 h-4", actionLoading && "animate-spin")} />
                Refresh
              </button>
            </div>
          </div>

          {/* User Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-8 border-t border-[#E6D5C3]">
            <div>
              <p className="text-sm text-[#5A5856] mb-1">Member Since</p>
              <p className="font-semibold text-[#1C1B1A]">{formatDate(user.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-[#5A5856] mb-1">Properties Listed</p>
              <p className="font-semibold text-[#1C1B1A]">{user.propertyCount || 0}</p>
            </div>
            <div>
              <p className="text-sm text-[#5A5856] mb-1">Total Appointments</p>
              <p className="font-semibold text-[#1C1B1A]">{user.appointmentCount || 0}</p>
            </div>
          </div>

          {/* Status-specific Info */}
          {user.status === 'suspended' && user.suspendedUntil && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="font-medium text-amber-800">Suspension Details</span>
              </div>
              <p className="text-sm text-amber-700 mb-1">
                <strong>Reason:</strong> {user.suspendReason || 'Not specified'}
              </p>
              <p className="text-sm text-amber-700">
                <strong>Expires:</strong> {new Date(user.suspendedUntil).toLocaleString()}
              </p>
            </div>
          )}

          {user.status === 'banned' && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Ban className="w-4 h-4 text-red-600" />
                <span className="font-medium text-red-800">Ban Details</span>
              </div>
              <p className="text-sm text-red-700 mb-1">
                <strong>Reason:</strong> {user.banReason || 'Not specified'}
              </p>
              <p className="text-sm text-red-700">
                <strong>Banned on:</strong> {formatDate(user.bannedAt)}
              </p>
            </div>
          )}
        </motion.div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-[#E6D5C3] shadow-card overflow-hidden">
          <div className="border-b border-[#E6D5C3] px-6 py-4">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                      activeTab === tab.key
                        ? "bg-[#D4755B] text-white"
                        : "bg-[#F5F1E8] text-[#5A5856] hover:bg-[#E6D5C3]"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-[#1C1B1A]">Account Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-[#5A5856] mb-1">Email Address</p>
                      <p className="text-[#1C1B1A]">{user.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#5A5856] mb-1">Account Status</p>
                      <UserStatusBadge status={user.status} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-[#5A5856] mb-1">Registration Date</p>
                      <p className="text-[#1C1B1A]">{new Date(user.createdAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#5A5856] mb-1">Last Updated</p>
                      <p className="text-[#1C1B1A]">{new Date(user.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'properties' && (
              <div>
                <h3 className="text-lg font-bold text-[#1C1B1A] mb-4">User's Properties</h3>
                {properties.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {properties.map((property) => (
                      <div
                        key={property._id}
                        className="border border-[#E6D5C3] rounded-xl p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-semibold text-[#1C1B1A] line-clamp-2">{property.title}</h4>
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            property.status === 'active' && "bg-emerald-50 text-emerald-700",
                            property.status === 'pending' && "bg-amber-50 text-amber-700",
                            property.status === 'rejected' && "bg-red-50 text-red-700",
                            property.status === 'expired' && "bg-gray-50 text-gray-700"
                          )}>
                            {property.status}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm text-[#5A5856]">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {property.location}
                          </div>
                          <div>₹{property.price?.toLocaleString()}</div>
                          <div className="text-xs">{formatDate(property.createdAt)}</div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => window.open(`/property/${property._id}`, '_blank')}
                            className="flex items-center gap-1 px-2 py-1 text-xs border border-[#E6D5C3] rounded hover:bg-[#F5F1E8] transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Home className="w-12 h-12 text-[#E6D5C3] mx-auto mb-4" />
                    <p className="text-[#5A5856]">No properties listed yet</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'appointments' && (
              <div>
                <h3 className="text-lg font-bold text-[#1C1B1A] mb-4">User's Appointments</h3>
                {appointments.length > 0 ? (
                  <div className="space-y-4">
                    {appointments.map((appointment) => (
                      <div
                        key={appointment._id}
                        className="border border-[#E6D5C3] rounded-xl p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-[#1C1B1A] mb-1">
                              {appointment.propertyId?.title || 'Property Unavailable'}
                            </h4>
                            <p className="text-sm text-[#5A5856]">
                              {appointment.propertyId?.location}
                            </p>
                          </div>
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            appointment.status === 'confirmed' && "bg-emerald-50 text-emerald-700",
                            appointment.status === 'pending' && "bg-amber-50 text-amber-700",
                            appointment.status === 'cancelled' && "bg-red-50 text-red-700",
                            appointment.status === 'completed' && "bg-blue-50 text-blue-700"
                          )}>
                            {appointment.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-[#5A5856]">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(appointment.date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {appointment.time}
                          </div>
                        </div>
                        {appointment.notes && (
                          <p className="text-sm text-[#5A5856] mt-2 bg-[#F5F1E8] p-3 rounded-lg">
                            {appointment.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-[#E6D5C3] mx-auto mb-4" />
                    <p className="text-[#5A5856]">No appointments booked yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <SuspendUserModal
        isOpen={showSuspendModal}
        onClose={() => setShowSuspendModal(false)}
        onConfirm={handleSuspendUser}
        user={user}
        isLoading={actionLoading}
      />

      <BanUserModal
        isOpen={showBanModal}
        onClose={() => setShowBanModal(false)}
        onConfirm={handleBanUser}
        user={user}
        isLoading={actionLoading}
      />
    </div>
  );
};

export default UserDetailsPage;