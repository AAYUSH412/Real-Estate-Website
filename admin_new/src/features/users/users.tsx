import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import type {
  UserDTO,
  UserPage,
  PropertyDTO,
  AppointmentDTO,
  PageDTO,
} from "@buildestate/contracts";
import { api } from "@/lib/api";
import { queryString } from "@/features/properties/api";
import { dateLabel } from "@/features/properties/helpers";
import {
  PageHeading,
  BackLink,
  Filters,
  RecordTable,
  StateBadge,
  selectionColumn,
  useListView,
  CommandDialog,
  DetailPager,
} from "@/features/management/shared";
import { moderateUsers } from "@/features/management/commands";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { ErrorState, PageLoading } from "@/components/feedback/states";
type Action = {
  action: "suspend" | "ban" | "unban" | "archive";
  records: UserDTO[];
};
export default function Users() {
  const view = useListView(["active", "suspended", "banned"]);
  return <UserList key={view.stamp} view={view} />;
}
function UserList({ view }: { view: ReturnType<typeof useListView> }) {
  const sortBy = view.params.get("sortBy") === "name" ? "name" : "createdAt";
  const sortOrder = view.params.get("sortOrder") === "asc" ? "asc" : "desc";
  const filters = { ...view.filters, sortBy, sortOrder };
  const query = useQuery({
    queryKey: ["users", "list", filters],
    queryFn: ({ signal }) =>
      api.request<UserPage>(`/api/admin/users?${queryString(filters)}`, {
        signal,
      }),
  });
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [command, setCommand] = useState<Action | null>(null);
  const rows = query.data?.users || [];
  const selected = rows.filter((row) => selection[row._id]);
  const columns: ColumnDef<UserDTO>[] = [
    selectionColumn(rows, selection, setSelection),
    {
      id: "account",
      header: "Account",
      enableHiding: false,
      cell: ({ row }) => (
        <Link className="table-stack" to={`/users/${row.id}`}>
          <strong>{row.original.name}</strong>
          <span>{row.original.email}</span>
        </Link>
      ),
    },
    {
      id: "state",
      header: "State",
      cell: ({ row }) => <StateBadge status={row.original.status} />,
    },
    {
      id: "verified",
      header: "Email",
      cell: ({ row }) =>
        row.original.isEmailVerified ? "Verified" : "Unverified",
    },
    {
      id: "listings",
      header: "Non-archived listings",
      cell: ({ row }) => row.original.propertyCount ?? "Not available",
    },
    {
      id: "created",
      header: "Joined",
      cell: ({ row }) => dateLabel(row.original.createdAt),
    },
    {
      id: "actions",
      header: "Actions",
      enableHiding: false,
      cell: ({ row }) => (
        <Button size="sm" variant="ghost" asChild>
          <Link to={`/users/${row.id}`}>Open account</Link>
        </Button>
      ),
    },
  ];
  return (
    <div className="management-page">
      <PageHeading
        title="Users"
        description="Review accounts, listings and moderation history. No permanent purge."
      />
      <Filters view={view} statuses={["active", "suspended", "banned"]}>
        <Field>
          <FieldLabel htmlFor="sortBy">Sort by</FieldLabel>
          <NativeSelect id="sortBy" name="sortBy" defaultValue={sortBy}>
            <NativeSelectOption value="createdAt">
              Joined date
            </NativeSelectOption>
            <NativeSelectOption value="name">Name</NativeSelectOption>
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="sortOrder">Direction</FieldLabel>
          <NativeSelect
            id="sortOrder"
            name="sortOrder"
            defaultValue={sortOrder}
          >
            <NativeSelectOption value="desc">Descending</NativeSelectOption>
            <NativeSelectOption value="asc">Ascending</NativeSelectOption>
          </NativeSelect>
        </Field>
      </Filters>
      {selected.length ? (
        <div className="selection-bar">
          <span>{selected.length} selected on this page</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!selected.every((row) => row.status === "active")}
              onClick={() =>
                setCommand({ action: "suspend", records: selected })
              }
            >
              Suspend
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={
                !selected.every((row) =>
                  ["active", "suspended"].includes(row.status),
                )
              }
              onClick={() => setCommand({ action: "ban", records: selected })}
            >
              Ban
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelection({})}>
              Clear
            </Button>
          </div>
        </div>
      ) : null}
      <RecordTable
        query={query}
        rows={rows}
        columns={columns}
        page={query.data?.pagination}
        view={view}
        selection={selection}
        onSelectionChange={setSelection}
      />
      {command ? (
        <UserCommand
          command={command}
          close={() => {
            setCommand(null);
            setSelection({});
          }}
        />
      ) : null}
    </div>
  );
}
export function UserDetail() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const propertyPage = Math.max(1, Number(params.get("propertyPage")) || 1);
  const appointmentPage = Math.max(
    1,
    Number(params.get("appointmentPage")) || 1,
  );
  const query = useQuery({
    queryKey: ["users", "detail", id, propertyPage, appointmentPage],
    queryFn: ({ signal }) =>
      api.request<{
        user: UserDTO & { suspendReason?: string; banReason?: string };
        properties: PropertyDTO[];
        appointments: AppointmentDTO[];
        propertyPagination: PageDTO;
        appointmentPagination: PageDTO;
      }>(
        `/api/admin/users/${id}?propertyPage=${propertyPage}&appointmentPage=${appointmentPage}`,
        { signal },
      ),
  });
  const [command, setCommand] = useState<Action | null>(null);
  if (query.isPending) return <PageLoading />;
  if (query.isError)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  const {
    user,
    properties,
    appointments,
    propertyPagination,
    appointmentPagination,
  } = query.data;
  function page(key: string, value: number) {
    const next = new URLSearchParams(params);
    next.set(key, String(value));
    setParams(next);
  }
  return (
    <div className="management-page">
      <BackLink to="/users" label="Back to users" />
      <PageHeading title={user.name} description={user.email}>
        <div className="flex flex-wrap gap-2">
          {user.status === "active" ? (
            <>
              <Button
                variant="outline"
                onClick={() =>
                  setCommand({ action: "suspend", records: [user] })
                }
              >
                Suspend
              </Button>
              <Button
                variant="outline"
                onClick={() => setCommand({ action: "ban", records: [user] })}
              >
                Ban
              </Button>
            </>
          ) : ["suspended", "banned"].includes(user.status) ? (
            <Button
              onClick={() => setCommand({ action: "unban", records: [user] })}
            >
              Reactivate
            </Button>
          ) : null}
          {user.status !== "deleted" ? (
            <Button
              variant="outline"
              onClick={() => setCommand({ action: "archive", records: [user] })}
            >
              Archive account
            </Button>
          ) : null}
        </div>
      </PageHeading>
      <Card>
        <CardHeader>
          <CardTitle>Account state</CardTitle>
          <CardDescription>
            Stored moderation state; eligibility is rechecked by the server.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="overview-facts">
            <div>
              <dt>Status</dt>
              <dd>
                <StateBadge status={user.status} />
              </dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user.isEmailVerified ? "Verified" : "Unverified"}</dd>
            </div>
            <div>
              <dt>Suspended until</dt>
              <dd>{dateLabel(user.suspendedUntil)}</dd>
            </div>
            <div>
              <dt>Joined</dt>
              <dd>{dateLabel(user.createdAt)}</dd>
            </div>
            <div>
              <dt>Reason</dt>
              <dd>{user.suspendReason || user.banReason || "Not recorded"}</dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd>{user.version}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      <Button variant="outline" className="self-start" asChild>
        <Link to={`/activity?targetType=user&targetId=${id}`}>
          View account activity
        </Link>
      </Button>
      <div className="dashboard-columns">
        <Card>
          <CardHeader>
            <CardTitle>Property history</CardTitle>
            <CardDescription>Includes archived records.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="detail-record-list">
              {properties.length ? (
                properties.map((row) => (
                  <Link to={`/properties/${row._id}`} key={row._id}>
                    <strong>{row.title}</strong>
                    <StateBadge status={row.status} />
                  </Link>
                ))
              ) : (
                <p>No property records.</p>
              )}
            </div>
            <DetailPager
              page={propertyPagination}
              onPage={(value) => page("propertyPage", value)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Viewing history</CardTitle>
            <CardDescription>
              Separate pagination from property history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="detail-record-list">
              {appointments.length ? (
                appointments.map((row) => (
                  <Link to={`/appointments/${row._id}`} key={row._id}>
                    <span>
                      {row.propertySnapshot?.title ||
                        row.propertyId?.title ||
                        "Unavailable listing"}{" "}
                      · {dateLabel(row.date)}
                    </span>
                    <StateBadge status={row.status} />
                  </Link>
                ))
              ) : (
                <p>No appointments.</p>
              )}
            </div>
            <DetailPager
              page={appointmentPagination}
              onPage={(value) => page("appointmentPage", value)}
            />
          </CardContent>
        </Card>
      </div>
      {command ? (
        <UserCommand command={command} close={() => setCommand(null)} />
      ) : null}
    </div>
  );
}
function UserCommand({
  command,
  close,
}: {
  command: Action;
  close: () => void;
}) {
  const [reason, setReason] = useState("");
  const [days, setDays] = useState(7);
  const label = {
    suspend: "Suspend",
    ban: "Ban",
    unban: "Reactivate",
    archive: "Archive",
  }[command.action];
  return (
    <CommandDialog
      title={`${label} ${command.records.length === 1 ? "account" : `${command.records.length} accounts`}?`}
      description={
        command.action === "unban"
          ? "Restore account access and eligible listing visibility. Cancelled bookings are not reopened."
          : command.action === "archive"
            ? "Archive this account and its listings, revoke sessions and cancel open bookings. History is retained; there is no permanent purge or restore control."
            : "This revokes sessions, hides affected listings and cancels open bookings. Bulk changes are atomic and limited to the selected current-page records. Notification delivery is best-effort."
      }
      close={close}
      label={`${label} account${command.records.length > 1 ? "s" : ""}`}
      execute={() => {
        if (["suspend", "ban"].includes(command.action) && !reason.trim())
          return Promise.reject(new Error("A moderation reason is required."));
        if (
          command.action === "suspend" &&
          (!Number.isInteger(days) || days < 1 || days > 365)
        )
          return Promise.reject(new Error("Choose 1–365 whole days."));
        return moderateUsers(
          command.action,
          command.records,
          reason.trim(),
          days,
        );
      }}
    >
      {["suspend", "ban"].includes(command.action) ? (
        <Field>
          <FieldLabel htmlFor="reason">Reason</FieldLabel>
          <Textarea
            id="reason"
            maxLength={2000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
      ) : null}
      {command.action === "suspend" ? (
        <Field>
          <FieldLabel htmlFor="days">Days (1–365)</FieldLabel>
          <Input
            id="days"
            type="number"
            min={1}
            max={365}
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
          />
        </Field>
      ) : null}
    </CommandDialog>
  );
}
