import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  Home, Users, Calendar, TrendingUp, RefreshCw, Activity,
  Building2, Eye, BarChart3, AlertCircle
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { backendurl } from "../config/constants";
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

// ─── Activity Item ────────────────────────────────────────────────────────────
const ActivityItem = ({ item }) => {
  const isProperty = item.type === "property";
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#F5F1E8] last:border-0">
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
        isProperty ? "bg-[#D4755B]/10" : "bg-blue-50"
      )}>
        {isProperty
          ? <Building2 className="w-4 h-4 text-[#D4755B]" />
          : <Calendar className="w-4 h-4 text-blue-500" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1C1B1A] truncate">{item.description}</p>
        <p className="text-xs text-[#9CA3AF] mt-0.5">
          {formatDate(item.timestamp)}
        </p>
      </div>
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await axios.get(`${backendurl}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (response.data.success) {
        setStats(response.data.stats);
        setError(null);
      } else {
        setError(response.data.message || "Failed to load stats");
      }
    } catch (err) {
      console.error("Dashboard stats error:", err);
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

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
      value: stats?.totalUsers,
      icon: Users,
      accent: { bg: "bg-blue-50", icon: "text-blue-600" },
      description: "Registered accounts",
    },
    {
      title: "Pending Appointments",
      value: stats?.pendingAppointments,
      icon: Calendar,
      accent: { bg: "bg-amber-50", icon: "text-amber-600" },
      description: "Awaiting confirmation",
    },
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
      <div className="min-h-screen pt-24 pb-12 px-4 bg-[#FAF8F4]">
        <div className="max-w-7xl mx-auto">
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
      <div className="min-h-screen pt-24 flex items-center justify-center bg-[#FAF8F4]">
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
    <div className="min-h-screen pt-24 pb-12 px-4 bg-[#FAF8F4]">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1C1B1A] mb-1">Dashboard</h1>
            <p className="text-[#5A5856] text-sm">Welcome back — here's what's happening today</p>
          </div>
          <motion.button
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E6D5C3] text-[#1C1B1A] rounded-xl text-sm font-medium hover:border-[#D4755B] hover:text-[#D4755B] transition-all duration-200 shadow-card disabled:opacity-60"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </motion.button>
        </motion.div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card, index) => (
            <StatCard key={card.title} {...card} index={index} />
          ))}
        </div>

        {/* Charts Row */}
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

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-white rounded-2xl p-6 border border-[#E6D5C3] shadow-card"
        >
          <div className="flex items-center gap-2 mb-5">
            <Activity className="w-5 h-5 text-[#D4755B]" />
            <h3 className="text-base font-bold text-[#1C1B1A]">Recent Activity</h3>
          </div>

          {stats?.recentActivity?.length > 0 ? (
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