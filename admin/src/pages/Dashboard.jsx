import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Home, Users, Calendar, TrendingUp, RefreshCw, Activity,
  Building2, Eye, BarChart3, AlertCircle, UserCheck, UserX,
  UserMinus, DollarSign, ClipboardList, ExternalLink
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import apiClient from "../services/apiClient";
import { cn, formatDate } from "../lib/utils";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
);

// ─── Stat Card ───────────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon: Icon, accent, description, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.08 }}
    className="bg-white rounded-2xl p-6 border border-[#E6D5C3] shadow-card hover:shadow-card-hover transition-all duration-300 group"
  >
    <div className="flex items-start justify-between mb-4">
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110", accent.bg)}>
        <Icon className={cn("w-5 h-5", accent.icon)} />
      </div>
    </div>
    <div className="text-3xl font-bold text-[#1C1B1A] mb-1 tabular-nums">
      {value ?? <span className="text-[#9CA3AF] text-xl">—</span>}
    </div>
    <div className="text-sm font-semibold text-[#1C1B1A] mb-0.5">{title}</div>
    <div className="text-xs text-[#9CA3AF]">{description}</div>
  </motion.div>
);

// ─── Quick Action Card ────────────────────────────────────────────────────────
const QuickActionCard = ({ title, count, icon: Icon, accent, to, index }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.1 }}
  >
    <Link
      to={to}
      className="block bg-white rounded-xl p-4 border border-[#E6D5C3] shadow-card hover:shadow-card-hover hover:border-[#D4755B] transition-all duration-200 group"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-[#1C1B1A] mb-1 tabular-nums">
            {count ?? <span className="text-[#9CA3AF] text-base">—</span>}
          </div>
          <div className="text-sm font-medium text-[#1C1B1A] mb-0.5">{title}</div>
        </div>
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110", accent.bg)}>
          <Icon className={cn("w-5 h-5", accent.icon)} />
        </div>
      </div>
      <div className="mt-3 flex items-center text-xs font-medium text-[#D4755B] group-hover:text-[#C05E44] transition-colors">
        View details
        <ExternalLink className="w-3 h-3 ml-1 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  </motion.div>
);

// ─── Activity Item ────────────────────────────────────────────────────────────
const ActivityItem = ({ item }) => {
  // Handle both old format and new AdminActivity format
  const isAdminLog = item.action && item.adminEmail;
  const isProperty = item.type === "property" || (isAdminLog && item.targetType === "property");
  const isUser = isAdminLog && item.targetType === "user";

  const getActionIcon = () => {
    if (isAdminLog) {
      if (item.action.includes('approve')) return <Building2 className="w-4 h-4 text-green-600" />;
      if (item.action.includes('reject')) return <Building2 className="w-4 h-4 text-red-600" />;
      if (item.action.includes('suspend') || item.action.includes('ban')) return <UserMinus className="w-4 h-4 text-amber-600" />;
      if (item.action.includes('user')) return <Users className="w-4 h-4 text-blue-600" />;
      if (item.action.includes('property')) return <Building2 className="w-4 h-4 text-[#D4755B]" />;
    }

    return isProperty
      ? <Building2 className="w-4 h-4 text-[#D4755B]" />
      : <Calendar className="w-4 h-4 text-blue-500" />;
  };

  const getActionColor = () => {
    if (isAdminLog) {
      if (item.action.includes('approve')) return "bg-green-50";
      if (item.action.includes('reject')) return "bg-red-50";
      if (item.action.includes('suspend') || item.action.includes('ban')) return "bg-amber-50";
      if (item.action.includes('user')) return "bg-blue-50";
      if (item.action.includes('property')) return "bg-[#D4755B]/10";
    }

    return isProperty ? "bg-[#D4755B]/10" : "bg-blue-50";
  };

  const formatActionText = (action) => {
    return action.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getDescription = () => {
    if (isAdminLog) {
      const actionText = formatActionText(item.action);
      const target = item.targetName ? `"${item.targetName}"` : `${item.targetType}`;
      return `${actionText}: ${target}`;
    }
    return item.description;
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#F5F1E8] last:border-0">
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
        getActionColor()
      )}>
        {getActionIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1C1B1A] truncate">{getDescription()}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-[#9CA3AF]">
            {formatDate(item.createdAt || item.timestamp)}
          </p>
          {isAdminLog && (
            <span className="text-xs text-[#9CA3AF]">
              by {item.adminEmail}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [propertyStats, setPropertyStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isRequestInProgress, setIsRequestInProgress] = useState(false);

  const fetchStats = useCallback(async (isRefresh = false) => {
    // Prevent multiple simultaneous requests
    if (isRequestInProgress) {
      console.log('Request already in progress, skipping...');
      return;
    }

    try {
      setIsRequestInProgress(true);
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      let hasBasicStats = false;

      // Try enhanced stats first, with graceful fallbacks
      try {
        const [overviewRes, userRes, propertyRes, activityRes] = await Promise.allSettled([
          apiClient.get('/api/admin/stats/overview'),
          apiClient.get('/api/admin/stats/users'),
          apiClient.get('/api/admin/stats/properties'),
          apiClient.get('/api/admin/activity-logs?limit=10')
        ]);

        // Process results with fallbacks
        if (overviewRes.status === 'fulfilled' && overviewRes.value.data.success) {
          setStats(overviewRes.value.data.data);
          hasBasicStats = true;
        }

        if (userRes.status === 'fulfilled' && userRes.value.data.success) {
          setUserStats(userRes.value.data.data);
        }

        if (propertyRes.status === 'fulfilled' && propertyRes.value.data.success) {
          setPropertyStats(propertyRes.value.data.data);
        }

        if (activityRes.status === 'fulfilled' && activityRes.value.data.success) {
          setRecentActivity(activityRes.value.data.data || []);
        }
      } catch (enhancedError) {
        console.log('Enhanced stats failed, falling back to basic stats');
      }

      // Fallback to basic stats only if we don't have enhanced stats
      if (!hasBasicStats) {
        try {
          const response = await apiClient.get('/api/admin/stats');

          if (response.data.success) {
            setStats(response.data.stats);
          }
        } catch (basicError) {
          console.error('Basic stats also failed:', basicError);
        }
      }

      setError(null);
    } catch (err) {
      console.error("Dashboard stats error:", err);
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsRequestInProgress(false);
    }
  }, []); // ✅ Empty dependency array - no circular dependency

  useEffect(() => {
    fetchStats();
  }, []); // ✅ Run only once on mount

  const statCards = [
    {
      title: "Total Properties",
      value: stats?.totalProperties,
      icon: Home,
      accent: { bg: "bg-[#D4755B]/10", icon: "text-[#D4755B]" },
      description: "All listed properties",
    },
    {
      title: "Active Listings",
      value: stats?.activeListings,
      icon: Building2,
      accent: { bg: "bg-emerald-50", icon: "text-emerald-600" },
      description: "Currently active",
    },
    {
      title: "Total Users",
      value: userStats?.Total || stats?.totalUsers,
      icon: Users,
      accent: { bg: "bg-blue-50", icon: "text-blue-600" },
      description: "Registered accounts",
    },
    {
      title: "Active Users",
      value: userStats?.Active,
      icon: UserCheck,
      accent: { bg: "bg-green-50", icon: "text-green-600" },
      description: "Currently active users",
    },
    {
      title: "Suspended Users",
      value: userStats?.Suspended,
      icon: UserMinus,
      accent: { bg: "bg-amber-50", icon: "text-amber-600" },
      description: "Temporarily suspended",
    },
    {
      title: "Banned Users",
      value: userStats?.Banned,
      icon: UserX,
      accent: { bg: "bg-red-50", icon: "text-red-600" },
      description: "Permanently banned",
    },
    {
      title: "Avg Property Price",
      value: stats?.avgPropertyPrice ? `₹${(stats.avgPropertyPrice / 100000).toFixed(1)}L` : null,
      icon: DollarSign,
      accent: { bg: "bg-purple-50", icon: "text-purple-600" },
      description: "Average listing price",
    },
    {
      title: "Pending Appointments",
      value: stats?.pendingAppointments,
      icon: Calendar,
      accent: { bg: "bg-cyan-50", icon: "text-cyan-600" },
      description: "Awaiting confirmation",
    },
  ];

  const quickActions = [
    {
      title: "Review Queue",
      count: stats?.pendingListings || 0,
      icon: ClipboardList,
      accent: { bg: "bg-[#D4755B]/10", icon: "text-[#D4755B]" },
      to: "/pending-listings"
    },
    {
      title: "Suspended Users",
      count: userStats?.Suspended || 0,
      icon: UserMinus,
      accent: { bg: "bg-amber-50", icon: "text-amber-600" },
      to: "/users?status=suspended"
    }
  ];

  // Chart data
  const viewsChartData = {
    labels: stats?.viewsData?.labels?.map(dateStr => {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }) ?? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Property Views",
        data: stats?.viewsData?.datasets?.[0]?.data ?? [0, 0, 0, 0, 0, 0, 0],
        backgroundColor: "rgba(212, 117, 91, 0.15)",
        borderColor: "#D4755B",
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  // New Users Over Time (Line Chart)
  const newUsersChartData = {
    labels: userStats?.newUsersByDay?.map(item => {
      const date = new Date(item._id);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }) ?? [],
    datasets: [
      {
        label: "New Users",
        data: userStats?.newUsersByDay?.map(item => item.count) ?? [],
        borderColor: "#3B82F6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: "#3B82F6",
        pointBorderColor: "#FFFFFF",
        pointBorderWidth: 2,
      },
    ],
  };

  // User Status Breakdown (Doughnut Chart)
  const userStatusChartData = {
    labels: ["Active Users", "Suspended Users", "Banned Users"],
    datasets: [
      {
        data: [
          userStats?.Active ?? 0,
          userStats?.Suspended ?? 0,
          userStats?.Banned ?? 0,
        ],
        backgroundColor: ["#10B981", "#F59E0B", "#EF4444"],
        borderColor: ["#059669", "#D97706", "#DC2626"],
        borderWidth: 1,
        hoverOffset: 6,
      },
    ],
  };

  // Property Approval Rate (Bar Chart)
  const approvalRateData = {
    labels: ["Approved", "Rejected", "Pending"],
    datasets: [
      {
        label: "Properties",
        data: [
          propertyStats?.approvedCount ?? 0,
          propertyStats?.rejectedCount ?? 0,
          propertyStats?.pendingCount ?? 0,
        ],
        backgroundColor: ["#10B981", "#EF4444", "#F59E0B"],
        borderColor: ["#059669", "#DC2626", "#D97706"],
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  // Doughnut chart representing ONLY properties status to avoid mixing totally different metrics
  const doughnutData = {
    labels: ["Active Properties", "Inactive Properties"],
    datasets: [
      {
        data: [
          stats?.activeListings ?? 0,
          Math.max(0, (stats?.totalProperties ?? 0) - (stats?.activeListings ?? 0)),
        ],
        backgroundColor: ["#D4755B", "#E6D5C3"],
        borderColor: ["#C05E44", "#D4B99A"],
        borderWidth: 1,
        hoverOffset: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1C1B1A",
        titleColor: "#FAF8F4",
        bodyColor: "#9CA3AF",
        padding: 12,
        cornerRadius: 8,
        titleFont: { family: "Manrope", size: 12, weight: "600" },
        bodyFont: { family: "Manrope", size: 11 },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, precision: 0, color: "#9CA3AF", font: { family: "Manrope", size: 11 } },
        grid: { color: "#F5F1E8" },
        border: { display: false },
      },
      x: {
        ticks: { color: "#9CA3AF", font: { family: "Manrope", size: 11 } },
        grid: { display: false },
        border: { display: false },
      },
    },
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1C1B1A",
        titleColor: "#FAF8F4",
        bodyColor: "#9CA3AF",
        padding: 12,
        cornerRadius: 8,
        titleFont: { family: "Manrope", size: 12, weight: "600" },
        bodyFont: { family: "Manrope", size: 11 },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, precision: 0, color: "#9CA3AF", font: { family: "Manrope", size: 11 } },
        grid: { color: "#F5F1E8" },
        border: { display: false },
      },
      x: {
        ticks: { color: "#9CA3AF", font: { family: "Manrope", size: 11 } },
        grid: { display: false },
        border: { display: false },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 8,
          color: "#5A5856",
          font: { family: "Manrope", size: 12 },
        },
      },
      tooltip: {
        backgroundColor: "#1C1B1A",
        titleColor: "#FAF8F4",
        bodyColor: "#9CA3AF",
        padding: 12,
        cornerRadius: 8,
      },
    },
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen pb-12 px-4 bg-[#FAF8F4]">
        <div className="max-w-7xl mx-auto pt-8">
          <div className="mb-8">
            <div className="h-8 w-48 bg-[#E6D5C3] rounded-xl animate-pulse mb-2" />
            <div className="h-4 w-64 bg-[#E6D5C3] rounded-lg animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-[#E6D5C3] animate-pulse">
                <div className="w-11 h-11 bg-[#E6D5C3] rounded-xl mb-4" />
                <div className="h-8 w-16 bg-[#E6D5C3] rounded-lg mb-2" />
                <div className="h-4 w-24 bg-[#E6D5C3] rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F4] pt-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-[#1C1B1A] mb-2">Failed to load dashboard</h3>
          <p className="text-[#5A5856] mb-6 text-sm">{error}</p>
          <button onClick={() => fetchStats()}
            className="px-6 py-3 bg-[#D4755B] text-white rounded-xl font-semibold text-sm hover:bg-[#C05E44] transition-colors">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 px-4 bg-[#FAF8F4]">
      <div className="max-w-7xl mx-auto pt-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1C1B1A] mb-1">Dashboard</h1>
            <p className="text-[#5A5856] text-sm">Welcome back — here's what's happening today</p>
          </div>
          <motion.button
            onClick={() => fetchStats(true)}
            disabled={refreshing || isRequestInProgress}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E6D5C3] text-[#1C1B1A] rounded-xl text-sm font-medium hover:border-[#D4755B] hover:text-[#D4755B] transition-all duration-200 shadow-card disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw className={cn("w-4 h-4", (refreshing || isRequestInProgress) && "animate-spin")} />
            {refreshing || isRequestInProgress ? "Refreshing..." : "Refresh"}
          </motion.button>
        </motion.div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card, index) => (
            <StatCard key={card.title} {...card} index={index} />
          ))}
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-[#D4755B]" />
            <h3 className="text-lg font-bold text-[#1C1B1A]">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <QuickActionCard key={action.title} {...action} index={index} />
            ))}
          </div>
        </motion.div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Bar Chart — Views */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="lg:col-span-2 bg-white rounded-2xl p-6 border border-[#E6D5C3] shadow-card"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-[#1C1B1A]">Property Views</h3>
                <p className="text-xs text-[#9CA3AF] mt-0.5">Weekly view activity</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#D4755B] font-medium">
                <BarChart3 className="w-4 h-4" />
                This Week
              </div>
            </div>
            <div className="h-52">
              <Bar data={viewsChartData} options={chartOptions} />
            </div>
          </motion.div>

          {/* Doughnut — Portfolio */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-6 border border-[#E6D5C3] shadow-card"
          >
            <div className="mb-6">
              <h3 className="text-base font-bold text-[#1C1B1A]">Portfolio Status</h3>
              <p className="text-xs text-[#9CA3AF] mt-0.5">Listing breakdown</p>
            </div>
            <div className="h-52">
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
          </motion.div>
        </div>

        {/* Charts Row 2 - Enhanced Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Line Chart — New Users */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-white rounded-2xl p-6 border border-[#E6D5C3] shadow-card"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-[#1C1B1A]">New Users</h3>
                <p className="text-xs text-[#9CA3AF] mt-0.5">Last 30 days</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                <Users className="w-4 h-4" />
                Daily Growth
              </div>
            </div>
            <div className="h-52">
              {userStats?.newUsersByDay?.length > 0 ? (
                <Line data={newUsersChartData} options={lineChartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <Users className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">No data available</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* User Status Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl p-6 border border-[#E6D5C3] shadow-card"
          >
            <div className="mb-6">
              <h3 className="text-base font-bold text-[#1C1B1A]">User Status</h3>
              <p className="text-xs text-[#9CA3AF] mt-0.5">Account breakdown</p>
            </div>
            <div className="h-52">
              {userStats ? (
                <Doughnut data={userStatusChartData} options={doughnutOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <UserCheck className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Loading data...</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Approval Rate Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="bg-white rounded-2xl p-6 border border-[#E6D5C3] shadow-card"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-[#1C1B1A]">Approval Rate</h3>
                <p className="text-xs text-[#9CA3AF] mt-0.5">Property submissions</p>
              </div>
              {propertyStats?.approvalRate && (
                <div className="text-xs font-medium text-green-600">
                  {propertyStats.approvalRate}% approved
                </div>
              )}
            </div>
            <div className="h-52">
              {propertyStats ? (
                <Bar data={approvalRateData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <ClipboardList className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Loading data...</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl p-6 border border-[#E6D5C3] shadow-card"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#D4755B]" />
              <h3 className="text-base font-bold text-[#1C1B1A]">Recent Admin Activity</h3>
            </div>
            <Link
              to="/activity-logs"
              className="text-xs text-[#D4755B] hover:text-[#C05E44] font-medium transition-colors"
            >
              View all
            </Link>
          </div>

          {recentActivity?.length > 0 ? (
            <div>
              {recentActivity.slice(0, 10).map((item, index) => (
                <ActivityItem key={item._id || index} item={item} />
              ))}
            </div>
          ) : stats?.recentActivity?.length > 0 ? (
            // Fallback to basic activity if enhanced activity logs fail
            <div>
              {stats.recentActivity.map((item, index) => (
                <ActivityItem key={index} item={item} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Eye className="w-10 h-10 text-[#E6D5C3] mx-auto mb-3" />
              <p className="text-sm text-[#9CA3AF]">No recent activity to display</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;