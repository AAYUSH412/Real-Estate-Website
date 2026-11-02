import { useState, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { ErrorBoundary } from "react-error-boundary";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "./lib/utils";

// Context
import { AuthProvider } from "./contexts/AuthContext";

// Components
import Sidebar from "./components/Sidebar";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorFallback from "./components/ErrorFallback";

// Pages
import Login from "./components/login";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const PropertyListings = lazy(() => import("./pages/List"));
const Add = lazy(() => import("./pages/Add"));
const Update = lazy(() => import("./pages/Update"));
const Appointments = lazy(() => import("./pages/Appointments"));
const PendingListings = lazy(() => import("./pages/PendingListings"));
const Users = lazy(() => import("./pages/Users"));
const UserDetails = lazy(() => import("./pages/UserDetails"));
const ActivityLogs = lazy(() => import("./pages/ActivityLogs"));
const AIModels = lazy(() => import("./pages/AIModels"));

const Engagement = lazy(() => import('./pages/Engagement'));

// Page transition variants
const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

// App Layout component
const AppLayout = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });

  return (
    <div className="min-h-screen bg-[#FAF8F4] flex">
      {/* Sidebar */}
      {!isLoginPage && (
        <Sidebar
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />
      )}

      {/* Main Content */}
      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300",
          !isLoginPage && "lg:ml-64", // Default margin for expanded sidebar
          !isLoginPage && isSidebarCollapsed && "lg:ml-20" // Smaller margin for collapsed sidebar
        )}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1"
          >
            <Suspense fallback={<p role="status" className="p-8">Loading page…</p>}>
            <Routes location={location}>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/list" element={<PropertyListings />} />
                <Route path="/add" element={<Add />} />
                <Route path="/update/:id" element={<Update />} />
                <Route path="/appointments" element={<Appointments />} />
                <Route path="/pending-listings" element={<PendingListings />} />
                <Route path="/leads" element={<Engagement key="leads" kind="leads" />} />
                <Route path="/subscribers" element={<Engagement key="subscribers" kind="subscribers" />} />
                <Route path="/users" element={<Users />} />
                <Route path="/users/:id" element={<UserDetails />} />
                <Route path="/activity-logs" element={<ActivityLogs />} />
                <Route path="/ai-models" element={<AIModels />} />
              </Route>

              {/* 404 Route */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => window.location.reload()}
    >
      <AuthProvider>
        <AppLayout />

        {/* Toast Notifications — Sonner */}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontFamily: 'Manrope, sans-serif',
              fontSize: '14px',
            },
          }}
        />
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;