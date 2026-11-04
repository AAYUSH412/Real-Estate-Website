import { Link } from "react-router-dom";
import { exportSummary } from "./export";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import type { PageDTO } from "@buildestate/contracts";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { queryString } from "@/features/properties/api";

import {
  PageHeading,
  RecordTable,
  useListView,
  SafeMetadata,
} from "@/features/management/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { ErrorState } from "@/components/feedback/states";
type Log = {
  _id: string;
  action: string;
  actorEmail?: string;
  adminEmail?: string;
  actorType?: string;
  targetType: string;
  targetId?: string;
  targetName?: string;
  createdAt: string;
  metadata?: unknown;
  requestId?: string;
};
function eventTime(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      }).format(date)
    : "Not recorded";
}
const entityRoutes: Record<string, string> = {
  user: "users",
  property: "properties",
  appointment: "appointments",
  lead: "leads",
};
const targets = [
  "user",
  "property",
  "appointment",
  "aiModel",
  "session",
  "lead",
  "subscriber",
];
export default function Activity() {
  const view = useListView();
  return <ActivityList key={view.stamp} view={view} />;
}
function ActivityList({ view }: { view: ReturnType<typeof useListView> }) {
  const values = Object.fromEntries(
    [
      "action",
      "actorType",
      "actorEmail",
      "targetType",
      "targetId",
      "startDate",
      "endDate",
    ].map((key) => [key, view.params.get(key) || ""]),
  );
  const query = useQuery({
    queryKey: ["activity", "list", { ...values, page: view.page }],
    queryFn: ({ signal }) =>
      api.request<{ logs: Log[]; pagination: PageDTO }>(
        `/api/admin/activity-logs?${queryString({ ...values, page: view.page, limit: 15 })}`,
        { signal },
      ),
  });
  const [target, setTarget] = useState<Log | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [note, setNote] = useState("");
  async function download() {
    setBusy(true);
    setError(null);
    try {
      const data = await api.request<{ blob: Blob; headers: Headers }>(
        `/api/admin/activity-logs/export?${queryString(values)}`,
        { responseType: "blob", signal: AbortSignal.timeout(60000) },
      );
      const summary = exportSummary(data.headers);
      setNote(summary.text);
      if (summary.truncated) toast.warning(summary.text);
      else toast.success("CSV downloaded");
      const url = URL.createObjectURL(data.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "buildestate-activity.csv";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  const columns: ColumnDef<Log>[] = [
    {
      id: "date",
      header: "Date (IST)",
      cell: ({ row }) => eventTime(row.original.createdAt),
    },
    { accessorKey: "action", header: "Action" },
    {
      id: "actor",
      header: "Actor",
      cell: ({ row }) => (
        <div className="table-stack">
          <strong>
            {row.original.actorEmail || row.original.adminEmail || "System"}
          </strong>
          <span>{row.original.actorType || "Not recorded"}</span>
        </div>
      ),
    },
    {
      id: "target",
      header: "Target",
      cell: ({ row }) => (
        <div className="table-stack">
          <strong>{row.original.targetName || row.original.targetType}</strong>
          <span>
            {row.original.targetType} ·{" "}
            {row.original.targetId || "Aggregate event"}
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "Details",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTarget(row.original)}
        >
          Inspect event
        </Button>
      ),
    },
  ];
  return (
    <div className="management-page">
      <PageHeading
        title="Activity logs"
        description="Actor-aware records of administrative and domain changes."
      >
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void download()}
        >
          {busy ? "Exporting…" : "Export CSV · max 10,000"}
        </Button>
      </PageHeading>
      <form
        className="filter-panel"
        onSubmit={(event) => {
          event.preventDefault();
          const data = Object.fromEntries(
            [...new FormData(event.currentTarget)].map(([key, value]) => [
              key,
              String(value).trim(),
            ]),
          );
          if (data.targetId && !data.targetType) {
            setError(
              new Error("Choose a target type when filtering by record ID."),
            );
            return;
          }
          view.change(data);
        }}
      >
        <FieldGroup className="grid grid-cols-4 gap-4">
          <Field>
            <FieldLabel htmlFor="action">Action</FieldLabel>
            <Input
              id="action"
              name="action"
              defaultValue={values.action}
              maxLength={100}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="actorType">Actor type</FieldLabel>
            <NativeSelect
              id="actorType"
              name="actorType"
              defaultValue={values.actorType}
            >
              <NativeSelectOption value="">All actors</NativeSelectOption>
              {["admin", "user", "system"].map((value) => (
                <NativeSelectOption key={value} value={value}>
                  {value}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="actorEmail">Exact actor email</FieldLabel>
            <Input
              id="actorEmail"
              name="actorEmail"
              defaultValue={values.actorEmail}
              maxLength={254}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="targetType">Target type</FieldLabel>
            <NativeSelect
              id="targetType"
              name="targetType"
              defaultValue={values.targetType}
            >
              <NativeSelectOption value="">All types</NativeSelectOption>
              {targets.map((value) => (
                <NativeSelectOption key={value} value={value}>
                  {value}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="targetId">Target record ID</FieldLabel>
            <Input
              id="targetId"
              name="targetId"
              defaultValue={values.targetId}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="startDate">From date (UTC)</FieldLabel>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={values.startDate}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="endDate">Through date (UTC)</FieldLabel>
            <Input
              id="endDate"
              name="endDate"
              type="date"
              defaultValue={values.endDate}
            />
          </Field>
          <div className="filter-actions">
            <Button variant="outline" type="submit">
              Apply
            </Button>
            <Button
              variant="ghost"
              type="button"
              onClick={() =>
                view.change(
                  Object.fromEntries(
                    Object.keys(values).map((key) => [key, ""]),
                  ),
                )
              }
            >
              Reset
            </Button>
          </div>
        </FieldGroup>
      </form>
      {error ? <ErrorState error={error} /> : null}
      {note ? (
        <p role="status" className="text-sm text-muted-foreground">
          {note}
        </p>
      ) : null}
      <RecordTable
        query={query}
        rows={query.data?.logs || []}
        page={query.data?.pagination}
        columns={columns}
        view={view}
      />
      {target ? (
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open) setTarget(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{target.action}</AlertDialogTitle>
              <AlertDialogDescription>
                {target.actorEmail || target.adminEmail || "System"} ·{" "}
                {eventTime(target.createdAt)} · {target.targetType}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {target.targetId && entityRoutes[target.targetType] ? (
              <Button variant="outline" asChild>
                <Link
                  to={`/${entityRoutes[target.targetType]}/${target.targetId}`}
                >
                  Open target record
                </Link>
              </Button>
            ) : null}
            <SafeMetadata
              value={{
                targetId: target.targetId,
                requestId: target.requestId,
                metadata: target.metadata,
              }}
            />
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}
