/* Route configuration includes its local loading and error boundaries. */
/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useRouteError,
} from "react-router-dom";
import { ProtectedRoute } from "@/features/auth/session";
import { PageLoading, ErrorState } from "@/components/feedback/states";
const Login = lazy(() => import("@/features/auth/login"));
const Shell = lazy(() => import("@/components/layout/shell"));
const Dashboard = lazy(() => import("@/features/dashboard/dashboard"));
const Catalog = lazy(() => import("@/features/properties/catalog"));
const PropertyDetail = lazy(() => import("@/features/properties/detail"));
const PropertyForm = lazy(() => import("@/features/properties/form"));
const Reviews = lazy(() => import("@/features/reviews/reviews"));
const Users = lazy(() => import("@/features/users/users"));
const UserDetail = lazy(() =>
  import("@/features/users/users").then((module) => ({
    default: module.UserDetail,
  })),
);
const Appointments = lazy(() => import("@/features/appointments/appointments"));
const AppointmentDetail = lazy(() =>
  import("@/features/appointments/appointments").then((module) => ({
    default: module.AppointmentDetail,
  })),
);
const Leads = lazy(() => import("@/features/leads/leads"));
const LeadDetail = lazy(() =>
  import("@/features/leads/leads").then((module) => ({
    default: module.LeadDetail,
  })),
);
const Subscribers = lazy(() => import("@/features/subscribers/subscribers"));
const Models = lazy(() => import("@/features/ai-models/models"));
const Activity = lazy(() => import("@/features/activity/activity"));
const NotFound = lazy(() =>
  import("@/components/layout/shell").then((module) => ({
    default: module.NotFound,
  })),
);
function LoadingBoundary() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Outlet />
    </Suspense>
  );
}
function RouteError() {
  const error = useRouteError();
  return (
    <main className="mx-auto max-w-lg p-8">
      <ErrorState error={error} retry={() => window.location.reload()} />
    </main>
  );
}
export const router = createBrowserRouter([
  {
    element: <LoadingBoundary />,
    errorElement: <RouteError />,
    children: [
      { path: "/login", element: <Login /> },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <Shell />,
            children: [
              { index: true, element: <Navigate to="/dashboard" replace /> },
              {
                path: "/workspace",
                element: <Navigate to="/dashboard" replace />,
              },
              { path: "/dashboard", element: <Dashboard /> },
              { path: "/properties", element: <Catalog /> },
              { path: "/properties/new", element: <PropertyForm /> },
              { path: "/properties/:id", element: <PropertyDetail /> },
              { path: "/properties/:id/edit", element: <PropertyForm /> },
              { path: "/reviews", element: <Reviews /> },
              { path: "/reviews/:id", element: <Reviews /> },
              { path: "/users", element: <Users /> },
              { path: "/users/:id", element: <UserDetail /> },
              { path: "/appointments", element: <Appointments /> },
              { path: "/appointments/:id", element: <AppointmentDetail /> },
              { path: "/leads", element: <Leads /> },
              { path: "/leads/:id", element: <LeadDetail /> },
              { path: "/subscribers", element: <Subscribers /> },
              { path: "/ai-models", element: <Models /> },
              { path: "/activity", element: <Activity /> },
              { path: "*", element: <NotFound /> },
            ],
          },
        ],
      },
    ],
  },
]);
