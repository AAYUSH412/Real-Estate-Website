import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import {
  BOOKING_STATUSES,
  safeUrl,
  type AppointmentDTO,
  type AppointmentPage,
} from "@buildestate/contracts";
import { api } from "@/lib/api";
import { queryString } from "@/features/properties/api";
import { dateLabel } from "@/features/properties/helpers";
import {
  bookingActions,
  setBookingStatus,
} from "@/features/management/commands";
import {
  PageHeading,
  BackLink,
  Filters,
  RecordTable,
  StateBadge,
  useListView,
  CommandDialog,
} from "@/features/management/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorState, PageLoading } from "@/components/feedback/states";
const contact = (row: AppointmentDTO) =>
  row.contactSnapshot || row.guestInfo || row.userId;
const propertyTitle = (row: AppointmentDTO) =>
  row.propertySnapshot?.title || row.propertyId?.title || "Unavailable listing";
export default function Appointments() {
  const view = useListView(BOOKING_STATUSES);
  return <AppointmentList key={view.stamp} view={view} />;
}
function AppointmentList({ view }: { view: ReturnType<typeof useListView> }) {
  const query = useQuery({
    queryKey: ["appointments", "list", view.filters],
    queryFn: ({ signal }) =>
      api.request<AppointmentPage>(
        `/api/admin/appointments?${queryString(view.filters)}`,
        { signal },
      ),
  });
  const columns: ColumnDef<AppointmentDTO>[] = [
    {
      id: "property",
      header: "Property",
      cell: ({ row }) => (
        <div className="table-stack">
          <strong>{propertyTitle(row.original)}</strong>
          <span>
            {row.original.propertySnapshot?.location ||
              row.original.propertyId?.location}
          </span>
        </div>
      ),
    },
    {
      id: "contact",
      header: "Contact",
      cell: ({ row }) => (
        <div className="table-stack">
          <strong>
            {contact(row.original)?.name || "Unavailable contact"}
          </strong>
          <span>{contact(row.original)?.email}</span>
          {!row.original.userId ? (
            <Badge variant="secondary">Guest</Badge>
          ) : null}
        </div>
      ),
    },
    {
      id: "date",
      header: "Scheduled (IST)",
      cell: ({ row }) =>
        `${dateLabel(row.original.date)} · ${row.original.time}`,
    },
    {
      id: "status",
      header: "State",
      cell: ({ row }) => <StateBadge status={row.original.status} />,
    },
    {
      id: "meeting",
      header: "Meeting",
      cell: ({ row }) =>
        row.original.meetingLink ? (
          <a
            href={row.original.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open meeting
          </a>
        ) : (
          "Not added"
        ),
    },
    {
      id: "actions",
      header: "Actions",
      enableHiding: false,
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/appointments/${row.id}`}>Open viewing</Link>
        </Button>
      ),
    },
  ];
  return (
    <div className="management-page">
      <PageHeading
        title="Appointments"
        description="Viewing requests from guests and account holders. Newest submissions first."
      />
      <Filters view={view} statuses={BOOKING_STATUSES} />
      <RecordTable
        query={query}
        rows={query.data?.appointments || []}
        page={query.data?.pagination}
        columns={columns}
        view={view}
      />
    </div>
  );
}
export function AppointmentDetail() {
  const { id = "" } = useParams();
  const query = useQuery({
    queryKey: ["appointments", "detail", id],
    queryFn: ({ signal }) =>
      api.request<{ appointment: AppointmentDTO }>(
        `/api/admin/appointments/${id}`,
        { signal },
      ),
  });
  const [command, setCommand] = useState<{
    record: AppointmentDTO;
    action: string;
  } | null>(null);
  if (query.isPending) return <PageLoading />;
  if (query.isError)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  const record = query.data.appointment;
  const person = contact(record);
  return (
    <div className="management-page">
      <BackLink to="/appointments" label="Back to appointments" />
      <PageHeading
        title={propertyTitle(record)}
        description={`${dateLabel(record.date)} · ${record.time} · Asia/Kolkata`}
      >
        <Button
          variant="outline"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Refresh
        </Button>
      </PageHeading>
      <Button variant="outline" className="self-start" asChild>
        <Link to={`/activity?targetType=appointment&targetId=${id}`}>
          View appointment activity
        </Link>
      </Button>
      <div className="dashboard-columns">
        <Card>
          <CardHeader>
            <CardTitle>Viewing details</CardTitle>
            <CardDescription>
              Historical snapshots remain available after listing/account
              changes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="overview-facts">
              <div>
                <dt>Status</dt>
                <dd>
                  <StateBadge status={record.status} />
                </dd>
              </div>
              <div>
                <dt>Contact</dt>
                <dd>{person?.name || "Unavailable contact"}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{person?.email || "Not recorded"}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{record.userId ? "Account holder" : "Guest"}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>
                  {record.propertySnapshot?.location ||
                    record.propertyId?.location ||
                    "Not recorded"}
                </dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>
                  {record.contactSnapshot?.phone ||
                    record.guestInfo?.phone ||
                    "Not recorded"}
                </dd>
              </div>
              <div>
                <dt>Version</dt>
                <dd>{record.version}</dd>
              </div>
            </dl>
            {record.propertyId ? (
              <Button variant="link" asChild>
                <Link to={`/properties/${record.propertyId._id}`}>
                  Open property record
                </Link>
              </Button>
            ) : null}
            <p className="mt-5 whitespace-pre-wrap text-sm leading-6">
              {record.notes || "No viewing notes."}
            </p>
            {record.cancelReason ? (
              <p className="mt-4 text-sm">
                Cancellation: {record.cancelReason}
              </p>
            ) : null}
            {record.feedback ? (
              <p className="mt-4 text-sm">
                Feedback: {record.feedback.rating}/5 · {record.feedback.comment}
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Manage this viewing</CardTitle>
            <CardDescription>
              Terminal bookings cannot be reopened. There is no reschedule or
              availability editor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {bookingActions(record, query.dataUpdatedAt).map((action) => (
                <Button
                  key={action.status}
                  variant="outline"
                  disabled={action.disabled}
                  title={
                    action.disabled
                      ? "Completion is available only after a known scheduled end. Refresh after the viewing ends."
                      : undefined
                  }
                  onClick={() => setCommand({ record, action: action.status })}
                >
                  {action.status === "confirmed"
                    ? "Confirm"
                    : action.status === "completed"
                      ? "Complete"
                      : "Cancel"}
                </Button>
              ))}
            </div>
            {record.status === "confirmed" ? (
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Completion requires a recorded scheduled end in the past.
                Refresh after the viewing ends.
              </p>
            ) : null}
            <div className="mt-6 flex flex-col items-start gap-3">
              {record.meetingLink ? (
                <a
                  href={record.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-primary"
                >
                  {record.meetingLink}
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No meeting link.
                </p>
              )}
              {["pending", "confirmed"].includes(record.status) ? (
                <Button
                  variant="outline"
                  onClick={() => setCommand({ record, action: "meeting" })}
                >
                  Update meeting link
                </Button>
              ) : null}
            </div>
            <p className="mt-5 text-xs text-muted-foreground">
              Successful updates do not guarantee notification delivery.
            </p>
          </CardContent>
        </Card>
      </div>
      {command ? (
        <BookingCommand command={command} close={() => setCommand(null)} />
      ) : null}
    </div>
  );
}
function BookingCommand({
  command,
  close,
}: {
  command: { record: AppointmentDTO; action: string };
  close: () => void;
}) {
  const [value, setValue] = useState(
    command.action === "meeting" ? command.record.meetingLink || "" : "",
  );
  return (
    <CommandDialog
      title={
        command.action === "meeting"
          ? "Update meeting link"
          : `Set viewing ${command.action}?`
      }
      description="Save against the displayed version. The server rechecks state and completion time; stale requests fail without silently overwriting another change."
      close={close}
      execute={() => {
        if (command.action === "meeting") {
          const link = safeUrl(value, "meetingLink");
          if (!link)
            return Promise.reject(new Error("A meeting URL is required."));
          return api.request("/api/appointments/update-meeting", {
            method: "PUT",
            body: JSON.stringify({
              appointmentId: command.record._id,
              expectedVersion: command.record.version,
              meetingLink: link,
            }),
          });
        }
        return setBookingStatus(command.record, command.action, value.trim());
      }}
    >
      {command.action === "meeting" ? (
        <Field>
          <FieldLabel htmlFor="meeting">Meeting URL</FieldLabel>
          <Input
            id="meeting"
            type="url"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </Field>
      ) : command.action === "cancelled" ? (
        <Field>
          <FieldLabel htmlFor="cancel-reason">Cancellation reason</FieldLabel>
          <Textarea
            id="cancel-reason"
            maxLength={2000}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </Field>
      ) : null}
    </CommandDialog>
  );
}
