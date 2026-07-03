import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  RefreshCw, AlertTriangle, ArrowRight, AlertCircle,
  Building2, Users, Calendar, DollarSign, Activity,
  CheckCircle2, XCircle, Clock, TrendingUp,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import apiClient from "../services/apiClient";
import { cn } from "../lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const timeAgo = (dateStr) => {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const today = new Date().toLocaleDateString("en-IN", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
});

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label, unit = "" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111110] rounded-lg px-3 py-2 shadow-xl border border-white/10">
      <p className="text-[10px] text-white/40 font-manrope mb-0.5">{label}</p>
      <p className="text-sm font-bold text-white tabular-nums">
        {payload[0].value}{unit}
      </p>
    </div>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KPICard = ({ label, value, sub, icon: Icon, accent, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.06, duration: 0.3 }}
    className={cn(
      "bg-white rounded-xl p-5 border transition-shadow duration-200 hover:shadow-sm",
      accent ? "border-[#D4755B]/25 shadow-[inset_0_0_0_1px_rgba(212,117,91,0.15)]" : "border-[#E8E7E5]"
    )}
  >
    <div className="flex items-start justify-between mb-3">
      <p className="text-xs font-medium text-[#9B9B99] uppercase tracking-wider">{label}</p>
      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", accent ? "bg-[#D4755B]/10" : "bg-[#F5F5F3]")}>
        <Icon className={cn("w-3.5 h-3.5", accent ? "text-[#D4755B]" : "text-[#9B9B99]")} />
      </div>
    </div>
    <p className="font-space-mono text-3xl font-bold text-[#111110] tabular-nums leading-none mb-1.5">
      {value ?? <span className="text-[#CCCCC9] text-xl">—</span>}
    </p>
    {sub && <p className="text-xs text-[#9B9B99]">{sub}</p>}
  </motion.div>
);

// ─── Activity Timeline ────────────────────────────────────────────────────────
const activityConfig = (item) => {
  const a = item.action || "";
  if (a.includes("approve")) return { color: "#10B981", Icon: CheckCircle2, label: "Approved" };
  if (a.includes("reject")) return { color: "#EF4444", Icon: XCircle, label: "Rejected" };
  if (a.includes("suspend") || a.includes("ban")) return { color: "#F59E0B", Icon: AlertTriangle, label: "Suspended" };
  if (a.includes("user")) return { color: "#3B82F6", Icon: Users, label: "User" };
  return { color: "#D4755B", Icon: Activity, label: "Action" };
};

const ActivityTimeline = ({ items }) => {
  if (!items?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Activity className="w-8 h-8 text-[#D0CEC9] mb-2" />
        <p className="text-sm text-[#9B9B99]">No recent activity</p>
      </div>
    );
  }
  return (
    <div className="relative">
      <div className="absolute left-3 top-0 bottom-4 w-px bg-[#EBEBEA]" />
      <div className="space-y-0">
        {items.slice(0, 8).map((item, i) => {
          const { color, Icon } = activityConfig(item);
          const actionText = (item.action || "").split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
          const desc = item.targetName
            ? `${actionText}: "${item.targetName}"`
            : item.description || actionText || "Admin action";
          return (
            <div key={item._id || i} className="relative flex gap-3.5 pb-5 last:pb-0">
              <div
                className="relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: color + "18" }}
              >
                <Icon className="w-3 h-3" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#111110] leading-snug line-clamp-2">{desc}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-[#9B9B99]">{timeAgo(item.createdAt || item.timestamp)}</span>
                  {item.adminEmail && (
                    <>
                      <span className="text-[#D0CEC9] text-xs">·</span>
                      <span className="text-xs text-[#9B9B99] truncate max-w-[120px]">{item.adminEmail}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Stat Bar ─────────────────────────────────────────────────────────────────
const StatBar = ({ label, value, total, color }) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-[#6B6B6A]">{label}</span>
        <span className="font-space-mono text-xs tabular-nums text-[#111110] font-semibold">{value ?? 0}</span>
      </div>
      <div className="h-1.5 bg-[#F0EFED] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.2, 0, 0, 1] }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
};

// ─── Listing Review Bar ───────────────────────────────────────────────────────
const ReviewBar = ({ label, value, total, color, Icon }) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + "15" }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between mb-1">
          <span className="text-xs text-[#6B6B6A]">{label}</span>
          <span className="font-space-mono text-xs tabular-nums text-[#111110] font-semibold">{value}</span>
        </div>
        <div className="h-1.5 bg-[#F0EFED] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, delay: 0.4, ease: [0.2, 0, 0, 1] }}
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>
        <p className="text-[10px] text-[#9B9B99] mt-0.5">{pct}% of submissions</p>
      </div>
    </div>
  );
};

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
const Skeleton = ({ className }) => (
  <div className={cn("bg-[#EBEBEA] rounded-lg animate-pulse", className)} />
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [propertyStats, setPropertyStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [inFlight, setInFlight] = useState(false);

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (inFlight) return;
    try {
      setInFlight(true);
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [overviewRes, userRes, propertyRes, activityRes] = await Promise.allSettled([
        apiClient.get("/api/admin/stats/overview"),
        apiClient.get("/api/admin/stats/users"),
        apiClient.get("/api/admin/stats/properties"),
        apiClient.get("/api/admin/activity-logs?limit=10"),
      ]);

      let overviewData = null;
      if (overviewRes.status === "fulfilled" && overviewRes.value.data.success) {
        overviewData = overviewRes.value.data.data;
        setStats(overviewData);
      }
      if (userRes.status === "fulfilled" && userRes.value.data.success)
        setUserStats(userRes.value.data.data);
      if (propertyRes.status === "fulfilled" && propertyRes.value.data.success)
        setPropertyStats(propertyRes.value.data.data);

      // Activity: try dedicated endpoint first, fall back to overview's recentActivity
      if (activityRes.status === "fulfilled" && activityRes.value.data.success) {
        const logs = activityRes.value.data.data || activityRes.value.data.logs || [];
        if (logs.length > 0) {
          setRecentActivity(logs);
        } else if (overviewData?.recentActivity?.length) {
          setRecentActivity(overviewData.recentActivity);
        }
      } else if (overviewData?.recentActivity?.length) {
        setRecentActivity(overviewData.recentActivity);
      }

      setError(null);
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setInFlight(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, []);

  // Transform data for Recharts
  const viewsData = (stats?.viewsData?.labels || []).map((d, i) => ({
    date: new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    views: stats.viewsData.datasets?.[0]?.data?.[i] ?? 0,
  }));

  const usersData = (userStats?.newUsersByDay || []).map((item) => ({
    date: new Date(item._id).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    users: item.count,
  }));

  const pendingListings = stats?.pendingListings ?? 0;
  const pendingAppts = stats?.pendingAppointments ?? 0;
  const hasActions = pendingListings > 0 || pendingAppts > 0;

  const reviewTotal = (propertyStats?.approvedCount ?? 0) + (propertyStats?.rejectedCount ?? 0) + (propertyStats?.pendingCount ?? 0);

  const kpis = [
    {
      label: "Total Properties",
      value: stats?.totalProperties,
      sub: "All listed properties",
      icon: Building2,
      accent: false,
    },
    {
      label: "Total Users",
      value: userStats?.Total || stats?.totalUsers,
      sub: `${userStats?.Active ?? 0} active`,
      icon: Users,
      accent: false,
    },
    {
      label: "Pending Appointments",
      value: stats?.pendingAppointments,
      sub: "Awaiting confirmation",
      icon: Calendar,
      accent: (stats?.pendingAppointments ?? 0) > 0,
    },
    {
      label: "Avg Property Price",
      value: stats?.avgPropertyPrice
        ? `₹${(stats.avgPropertyPrice / 100000).toFixed(1)}L`
        : null,
      sub: "Average listing price",
      icon: DollarSign,
      accent: false,
    },
  ];

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] px-6 lg:px-8 pt-8 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <Skeleton className="h-7 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <Skeleton className="h-72 rounded-xl mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="text-base font-semibold text-[#111110] mb-1">Failed to load</h3>
          <p className="text-sm text-[#9B9B99] mb-5">{error}</p>
          <button
            onClick={() => fetchStats()}
            className="px-5 py-2.5 bg-[#D4755B] text-white rounded-lg text-sm font-medium hover:bg-[#C05E44] active:scale-[0.98] transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F3] px-6 lg:px-8 pt-8 pb-16">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between mb-6"
        >
          <div>
            <h1 className="text-2xl font-bold text-[#111110] tracking-tight">Overview</h1>
            <p className="text-sm text-[#9B9B99] mt-0.5">{today}</p>
          </div>
          <button
            onClick={() => fetchStats(true)}
            disabled={refreshing || inFlight}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E8E7E5] text-[#6B6B6A] rounded-lg text-sm font-medium hover:border-[#D4755B] hover:text-[#D4755B] active:scale-[0.97] transition-all duration-150 disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", (refreshing || inFlight) && "animate-spin")} />
            {refreshing || inFlight ? "Refreshing…" : "Refresh"}
          </button>
        </motion.div>

        {/* ── Action Banner ── */}
        <AnimatePresence>
          {hasActions && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-amber-50 border border-amber-200/70 rounded-xl px-5 py-3.5 flex items-center gap-3 overflow-hidden"
            >
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="flex flex-wrap gap-x-5 gap-y-1 flex-1">
                {pendingListings > 0 && (
                  <Link
                    to="/pending-listings"
                    className="flex items-center gap-1.5 text-sm text-amber-800 hover:text-amber-900 font-medium transition-colors"
                  >
                    <span className="font-bold">{pendingListings}</span> listings need review
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
                {pendingAppts > 0 && (
                  <Link
                    to="/appointments"
                    className="flex items-center gap-1.5 text-sm text-amber-800 hover:text-amber-900 font-medium transition-colors"
                  >
                    <span className="font-bold">{pendingAppts}</span> appointments unconfirmed
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpis.map((kpi, i) => (
            <KPICard key={kpi.label} {...kpi} index={i} />
          ))}
        </div>

        {/* ── Hero Chart — Property Views ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="bg-white rounded-xl border border-[#E8E7E5] p-6 mb-6"
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-[#111110]">Property Views</h2>
              <p className="text-xs text-[#9B9B99] mt-0.5">Daily view activity</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#D4755B]">
              <TrendingUp className="w-3.5 h-3.5" />
              Last 30 days
            </div>
          </div>

          <div className="h-56">
            {viewsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={viewsData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D4755B" stopOpacity={0.14} />
                      <stop offset="100%" stopColor="#D4755B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="#F0EFED" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#9B9B99", fontSize: 11, fontFamily: "Manrope, sans-serif" }}
                    axisLine={false} tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: "#9B9B99", fontSize: 11, fontFamily: "Manrope, sans-serif" }}
                    axisLine={false} tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip unit=" views" />} cursor={{ stroke: "#E8E7E5", strokeWidth: 1 }} />
                  <Area
                    type="monotone" dataKey="views"
                    stroke="#D4755B" strokeWidth={1.5}
                    fill="url(#viewsGradient)"
                    dot={false}
                    activeDot={{ r: 3.5, fill: "#D4755B", strokeWidth: 0 }}
                    animationDuration={900}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-[#9B9B99]">No view data yet</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Bottom 3-Column Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Col 1 — User Growth + Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.33 }}
            className="bg-white rounded-xl border border-[#E8E7E5] p-6"
          >
            <h2 className="text-base font-semibold text-[#111110] mb-0.5">New Users</h2>
            <p className="text-xs text-[#9B9B99] mb-5">Last 30 days</p>

            <div className="h-36">
              {usersData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={usersData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                    <defs>
                      <linearGradient id="usersGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#64748B" stopOpacity={0.1} />
                        <stop offset="100%" stopColor="#64748B" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="#F0EFED" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#9B9B99", fontSize: 10, fontFamily: "Manrope, sans-serif" }}
                      axisLine={false} tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: "#9B9B99", fontSize: 10, fontFamily: "Manrope, sans-serif" }}
                      axisLine={false} tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip unit=" users" />} cursor={{ stroke: "#E8E7E5", strokeWidth: 1 }} />
                    <Area
                      type="monotone" dataKey="users"
                      stroke="#64748B" strokeWidth={1.5}
                      fill="url(#usersGradient)"
                      dot={false}
                      activeDot={{ r: 3, fill: "#64748B", strokeWidth: 0 }}
                      animationDuration={900}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-[#9B9B99]">No data yet</p>
                </div>
              )}
            </div>

            {/* User status bars */}
            <div className="mt-5 pt-5 border-t border-[#F0EFED] space-y-3.5">
              <p className="text-xs font-medium text-[#9B9B99] uppercase tracking-wider mb-3">Account Status</p>
              <StatBar label="Active" value={userStats?.Active} total={userStats?.Total || 1} color="#10B981" />
              <StatBar label="Suspended" value={userStats?.Suspended} total={userStats?.Total || 1} color="#F59E0B" />
              <StatBar label="Banned" value={userStats?.Banned} total={userStats?.Total || 1} color="#EF4444" />
            </div>
          </motion.div>

          {/* Col 2 — Listing Review */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
            className="bg-white rounded-xl border border-[#E8E7E5] p-6"
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-[#111110] mb-0.5">Listing Review</h2>
                <p className="text-xs text-[#9B9B99]">Property submission outcomes</p>
              </div>
              {propertyStats?.approvalRate != null && (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {propertyStats.approvalRate}% approved
                </span>
              )}
            </div>

            <div className="space-y-4">
              <ReviewBar
                label="Approved"
                value={propertyStats?.approvedCount ?? 0}
                total={reviewTotal}
                color="#10B981"
                Icon={CheckCircle2}
              />
              <ReviewBar
                label="Pending"
                value={propertyStats?.pendingCount ?? 0}
                total={reviewTotal}
                color="#F59E0B"
                Icon={Clock}
              />
              <ReviewBar
                label="Rejected"
                value={propertyStats?.rejectedCount ?? 0}
                total={reviewTotal}
                color="#EF4444"
                Icon={XCircle}
              />
            </div>

            {/* Additional property stats */}
            <div className="mt-6 pt-5 border-t border-[#F0EFED]">
              <p className="text-xs font-medium text-[#9B9B99] uppercase tracking-wider mb-3">Portfolio</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#F8F7F5] rounded-lg p-3">
                  <p className="font-space-mono text-xl font-bold text-[#111110] tabular-nums">
                    {stats?.totalProperties ?? "—"}
                  </p>
                  <p className="text-xs text-[#9B9B99] mt-0.5">Total</p>
                </div>
                <div className="bg-[#F8F7F5] rounded-lg p-3">
                  <p className="font-space-mono text-xl font-bold text-emerald-600 tabular-nums">
                    {stats?.activeListings ?? "—"}
                  </p>
                  <p className="text-xs text-[#9B9B99] mt-0.5">Active</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Col 3 — Activity Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.43 }}
            className="bg-white rounded-xl border border-[#E8E7E5] p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-[#111110] mb-0.5">Recent Activity</h2>
                <p className="text-xs text-[#9B9B99]">Admin actions</p>
              </div>
              <Link
                to="/activity-logs"
                className="text-xs text-[#D4755B] hover:text-[#C05E44] font-medium transition-colors flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <ActivityTimeline items={recentActivity.length ? recentActivity : stats?.recentActivity} />
          </motion.div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
