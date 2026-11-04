import { PropertyImage } from "@/components/media/property-image";
import { lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Building2,
  ClipboardCheck,
  CalendarClock,
  Inbox,
  ArrowUpRight,
  Plus,
  RefreshCw,
} from "lucide-react";
import type { AppointmentPage, LeadPage } from "@buildestate/contracts";
import { api } from "@/lib/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, EmptyResults } from "@/components/feedback/states";
import { StatusBadge } from "@/components/feedback/status-badge";
import { propertiesAPI } from "@/features/properties/api";
import { dateLabel } from "@/features/properties/helpers";
const RequestChart = lazy(() => import("./chart"));
type Stats = {
  data: {
    totalProperties: number;
    activeListings: number;
    totalUsers: number;
    pendingListings: number;
    pendingAppointments: number;
    viewsData: {
      labels: string[];
      datasets: { data: number[] }[];
      timeZone: string;
    };
  };
};
export default function Dashboard() {
  const overview = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: ({ signal }) =>
      api.request<Stats>("/api/admin/stats/overview", { signal }),
  });
  const pending = useQuery({
    queryKey: ["reviews", "preview"],
    queryFn: ({ signal }) =>
      propertiesAPI.pending({ page: 1, limit: 4 }, signal),
  });
  const bookings = useQuery({
    queryKey: ["dashboard", "bookings"],
    queryFn: ({ signal }) =>
      api.request<AppointmentPage>(
        "/api/admin/appointments?limit=4&page=1&status=pending",
        { signal },
      ),
  });
  const leads = useQuery({
    queryKey: ["dashboard", "leads"],
    queryFn: ({ signal }) =>
      api.request<LeadPage>("/api/admin/leads?limit=1&page=1&status=new", {
        signal,
      }),
  });
  const stats = overview.data?.data;
  const chart = stats?.viewsData;
  const metrics = [
    {
      title: "Pending reviews",
      value: pending.data?.pagination.total,
      icon: ClipboardCheck,
      description: "Listings awaiting a decision",
      error: pending.error,
    },
    {
      title: "Upcoming viewings",
      value: bookings.data?.upcomingCount,
      icon: CalendarClock,
      description: "Future pending & confirmed requests",
      error: bookings.error,
    },
    {
      title: "New inquiries",
      value: leads.data?.pagination.total,
      icon: Inbox,
      description: "Contact messages needing attention",
      error: leads.error,
    },
    {
      title: "Public listings",
      value: stats?.activeListings,
      icon: Building2,
      description: "Visible after expiry & moderation",
      error: overview.error,
    },
  ];
  function refresh() {
    void Promise.all([
      overview.refetch(),
      pending.refetch(),
      bookings.refetch(),
      leads.refetch(),
    ]);
  }
  return (
    <div className="management-page">
      <div className="management-heading">
        <div>
          <p className="eyebrow">Overview · Asia/Kolkata</p>
          <h1>Your property workspace</h1>
          <p>Start with what needs a decision. Keep the rest in view.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={refresh}
            disabled={[overview, pending, bookings, leads].some(
              (query) => query.isFetching,
            )}
          >
            <RefreshCw data-icon="inline-start" />
            Refresh
          </Button>
          <Button asChild>
            <Link to="/properties/new">
              <Plus data-icon="inline-start" />
              Add property
            </Link>
          </Button>
        </div>
      </div>
      <section className="metric-grid" aria-label="Operational totals">
        {metrics.map(({ title, value, icon: Icon, description, error }) => (
          <Card key={title}>
            <CardHeader>
              <div className="metric-label">
                <CardDescription>{title}</CardDescription>
                <Icon />
              </div>
              <CardTitle>
                {error ? (
                  <span className="metric-unavailable">Unavailable</span>
                ) : value === undefined ? (
                  <Skeleton className="h-9 w-14" />
                ) : (
                  <span className="metric-value">
                    {value.toLocaleString("en-IN")}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs leading-5 text-muted-foreground">
                {description}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>
      <div className="dashboard-columns">
        <Card>
          <CardHeader>
            <div className="card-heading-row">
              <div>
                <CardTitle>Ready for review</CardTitle>
                <CardDescription>
                  Oldest submissions first. Give owners a clear next step.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/reviews">
                  Open queue
                  <ArrowUpRight data-icon="inline-end" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {pending.isError ? (
              <ErrorState
                error={pending.error}
                retry={() => void pending.refetch()}
              />
            ) : pending.isPending ? (
              <Skeleton className="h-56 w-full" />
            ) : pending.data.properties.length ? (
              <div className="dashboard-list">
                {pending.data.properties.map((row) => (
                  <Link
                    key={row._id}
                    className="review-preview"
                    to={`/reviews/${row._id}`}
                  >
                    <PropertyImage src={row.image[0]} alt="" />
                    <span>
                      <strong>{row.title}</strong>
                      <small>
                        {row.location} ·{" "}
                        {row.owner?.name ||
                          (row.ownerId ? "Unavailable owner" : "Administrator")}
                      </small>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {dateLabel(row.createdAt)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyResults
                title="Review queue is clear"
                description="New property submissions will appear here."
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Latest pending viewing requests</CardTitle>
            <CardDescription>
              Ordered by submission, not appointment date. Includes overdue
              requests.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bookings.isError ? (
              <ErrorState
                error={bookings.error}
                retry={() => void bookings.refetch()}
              />
            ) : bookings.isPending ? (
              <Skeleton className="h-56 w-full" />
            ) : bookings.data.appointments.length ? (
              <div className="dashboard-list">
                {bookings.data.appointments.map((row) => (
                  <div className="viewing-preview" key={row._id}>
                    <div>
                      <strong>
                        {row.contactSnapshot?.name ||
                          row.guestInfo?.name ||
                          row.userId?.name ||
                          "Unavailable contact"}
                      </strong>
                      <p>
                        {row.propertySnapshot?.title ||
                          row.propertyId?.title ||
                          "Unavailable listing"}
                      </p>
                      <small>
                        {dateLabel(row.date)} · {row.time} IST
                      </small>
                    </div>
                    <StatusBadge status={row.status} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyResults
                title="No pending requests"
                description="New viewing requests will appear here."
              />
            )}
          </CardContent>
        </Card>
      </div>
      <div className="dashboard-columns">
        <Card>
          <CardHeader>
            <CardTitle>Property detail requests</CardTitle>
            <CardDescription>
              Last 30 UTC days · successful API requests, not unique visitors.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overview.isError ? (
              <ErrorState
                error={overview.error}
                retry={() => void overview.refetch()}
              />
            ) : !chart ? (
              <Skeleton className="h-60 w-full" />
            ) : (
              <>
                <Suspense fallback={<Skeleton className="h-60 w-full" />}>
                  <RequestChart
                    rows={chart.labels.map((date, index) => ({
                      date,
                      requests: chart.datasets[0].data[index],
                    }))}
                  />
                </Suspense>
                <details className="chart-values">
                  <summary>View daily values</summary>
                  <dl>
                    {chart.labels.map((date, index) => (
                      <div key={date}>
                        <dt>{date}</dt>
                        <dd>{chart.datasets[0].data[index]}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Catalog at a glance</CardTitle>
            <CardDescription>
              Stored history and public visibility measure different things.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overview.isError ? (
              <ErrorState
                error={overview.error}
                retry={() => void overview.refetch()}
              />
            ) : !stats ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <dl className="overview-facts">
                <div>
                  <dt>All property records</dt>
                  <dd>{stats.totalProperties.toLocaleString("en-IN")}</dd>
                </div>
                <div>
                  <dt>Public listings</dt>
                  <dd>{stats.activeListings.toLocaleString("en-IN")}</dd>
                </div>
                <div>
                  <dt>Non-archived accounts</dt>
                  <dd>{stats.totalUsers.toLocaleString("en-IN")}</dd>
                </div>
                <div>
                  <dt>Pending viewing requests</dt>
                  <dd>{stats.pendingAppointments.toLocaleString("en-IN")}</dd>
                </div>
              </dl>
            )}
            <div className="mt-6 flex items-center gap-3">
              <Badge variant="outline">Live backend data</Badge>
              <Button variant="link" asChild>
                <Link to="/properties">Browse properties</Link>
              </Button>
            </div>
            {leads.isError ? (
              <ErrorState
                error={leads.error}
                retry={() => void leads.refetch()}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
