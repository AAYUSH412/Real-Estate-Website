import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useBlocker, useBeforeUnload } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import type { LeadDTO, LeadPage } from "@buildestate/contracts";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { queryString } from "@/features/properties/api";
import { dateLabel } from "@/features/properties/helpers";
import {
  PageHeading,
  BackLink,
  Filters,
  RecordTable,
  StateBadge,
  useListView,
  invalidateManagement,
} from "@/features/management/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { ConfirmAction } from "@/components/feedback/confirm-action";
import { ErrorState, PageLoading } from "@/components/feedback/states";
const statuses = ["new", "in_progress", "resolved"];
export default function Leads() {
  const view = useListView(statuses);
  return <LeadList key={view.stamp} view={view} />;
}
function LeadList({ view }: { view: ReturnType<typeof useListView> }) {
  const query = useQuery({
    queryKey: ["leads", "list", view.filters],
    queryFn: ({ signal }) =>
      api.request<LeadPage>(`/api/admin/leads?${queryString(view.filters)}`, {
        signal,
      }),
  });
  const columns: ColumnDef<LeadDTO>[] = [
    {
      id: "contact",
      header: "Contact",
      cell: ({ row }) => (
        <div className="table-stack">
          <strong>{row.original.name}</strong>
          <span>{row.original.email}</span>
        </div>
      ),
    },
    {
      id: "message",
      header: "Message preview",
      cell: ({ row }) => (
        <p className="line-clamp-2 max-w-sm whitespace-normal">
          {row.original.message}
        </p>
      ),
    },
    {
      id: "status",
      header: "State",
      cell: ({ row }) => <StateBadge status={row.original.status} />,
    },
    {
      id: "date",
      header: "Received",
      cell: ({ row }) => dateLabel(row.original.createdAt),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button size="sm" variant="ghost" asChild>
          <Link to={`/leads/${row.id}`}>Read inquiry</Link>
        </Button>
      ),
    },
  ];
  return (
    <div className="management-page">
      <PageHeading
        title="Contact inbox"
        description="Read inquiries and maintain one internal note and resolution state. Search matches email."
      />
      <Filters view={view} statuses={statuses} />
      <RecordTable
        query={query}
        rows={query.data?.leads || []}
        page={query.data?.pagination}
        columns={columns}
        view={view}
      />
    </div>
  );
}
export function LeadDetail() {
  const { id = "" } = useParams();
  const query = useQuery({
    queryKey: ["leads", "detail", id],
    queryFn: ({ signal }) =>
      api.request<{ lead: LeadDTO }>(`/api/admin/leads/${id}`, { signal }),
  });
  if (query.isPending) return <PageLoading />;
  if (query.isError && !query.data)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  return query.data ? <LeadEditor key={id} initial={query.data.lead} /> : null;
}
function LeadEditor({ initial }: { initial: LeadDTO }) {
  const [record, setRecord] = useState(initial);
  const [status, setStatus] = useState(record.status);
  const [note, setNote] = useState(record.adminNote || "");
  const dirty = status !== record.status || note !== (record.adminNote || "");
  const blocker = useBlocker(dirty);
  useBeforeUnload((event) => {
    if (dirty) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  const mutation = useMutation({
    mutationFn: () =>
      api.request<{ lead: LeadDTO }>(`/api/admin/leads/${record._id}`, {
        method: "PUT",
        body: JSON.stringify({
          expectedVersion: record.version,
          status,
          adminNote: note,
        }),
      }),
    onSuccess: async (result) => {
      setRecord(result.lead);
      setStatus(result.lead.status);
      setNote(result.lead.adminNote || "");
      await invalidateManagement();
      toast.success("Inquiry updated");
    },
  });
  return (
    <div className="management-page">
      <BackLink to="/leads" label="Back to inbox" />
      <PageHeading
        title={record.name}
        description={`${record.email} · ${dateLabel(record.createdAt)}`}
      />
      <Button variant="outline" className="self-start" asChild>
        <Link to={`/activity?targetType=lead&targetId=${record._id}`}>
          View inquiry activity
        </Link>
      </Button>
      <div className="dashboard-columns">
        <Card>
          <CardHeader>
            <CardTitle>Inquiry</CardTitle>
            <CardDescription>
              {record.phone || "Phone not recorded"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap leading-7">{record.message}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Internal resolution</CardTitle>
            <CardDescription>
              No assignment, reply sending or threaded conversation is
              implemented.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                mutation.mutate();
              }}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="lead-status">Status</FieldLabel>
                  <NativeSelect
                    id="lead-status"
                    value={status}
                    disabled={mutation.isPending}
                    onChange={(event) =>
                      setStatus(event.target.value as LeadDTO["status"])
                    }
                  >
                    {statuses.map((value) => (
                      <NativeSelectOption key={value} value={value}>
                        {value.replaceAll("_", " ")}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor="lead-note">Internal note</FieldLabel>
                  <Textarea
                    id="lead-note"
                    rows={7}
                    maxLength={2000}
                    value={note}
                    disabled={mutation.isPending}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </Field>
                {mutation.isError ? (
                  <ErrorState error={mutation.error} />
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Version {record.version}.{" "}
                  {dirty ? "Unsaved changes." : "Up to date."} A conflict
                  preserves your note; leave/reopen the record to review the
                  latest revision.
                </p>
                <Button disabled={mutation.isPending || !dirty} type="submit">
                  {mutation.isPending ? "Saving…" : "Save resolution"}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
      <ConfirmAction
        open={blocker.state === "blocked"}
        onOpenChange={(open) => {
          if (!open && blocker.state === "blocked") blocker.reset();
        }}
        title="Leave without saving?"
        description="Your unsaved inquiry note and status will be discarded."
        label="Leave page"
        busy={mutation.isPending}
        onConfirm={() => {
          if (blocker.state === "blocked") blocker.proceed();
        }}
      />
    </div>
  );
}
