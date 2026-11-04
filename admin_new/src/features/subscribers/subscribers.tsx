import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import type { SubscriberDTO, SubscriberPage } from "@buildestate/contracts";
import { api } from "@/lib/api";
import { queryString } from "@/features/properties/api";
import { dateLabel } from "@/features/properties/helpers";
import {
  PageHeading,
  Filters,
  RecordTable,
  StateBadge,
  useListView,
  CommandDialog,
} from "@/features/management/shared";
import { Button } from "@/components/ui/button";
export default function Subscribers() {
  const view = useListView(["pending", "confirmed", "unsubscribed"]);
  return <SubscriberList key={view.stamp} view={view} />;
}
function SubscriberList({ view }: { view: ReturnType<typeof useListView> }) {
  const query = useQuery({
    queryKey: ["subscribers", "list", view.filters],
    queryFn: ({ signal }) =>
      api.request<SubscriberPage>(
        `/api/admin/subscribers?${queryString(view.filters)}`,
        { signal },
      ),
  });
  const [target, setTarget] = useState<SubscriberDTO | null>(null);
  const columns: ColumnDef<SubscriberDTO>[] = [
    { accessorKey: "email", header: "Email" },
    {
      id: "status",
      header: "Consent state",
      cell: ({ row }) => <StateBadge status={row.original.status} />,
    },
    {
      id: "joined",
      header: "Signed up",
      cell: ({ row }) => dateLabel(row.original.createdAt),
    },
    {
      id: "confirmed",
      header: "Confirmed",
      cell: ({ row }) => dateLabel(row.original.confirmedAt),
    },
    {
      id: "unsubscribed",
      header: "Opted out / suppressed",
      cell: ({ row }) => dateLabel(row.original.unsubscribedAt),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          disabled={row.original.status === "unsubscribed"}
          onClick={() => setTarget(row.original)}
        >
          Suppress
        </Button>
      ),
    },
  ];
  return (
    <div className="management-page">
      <PageHeading
        title="Subscribers"
        description="Recipient-managed consent. Administrators can suppress an address, never grant consent."
      />
      <Filters
        view={view}
        statuses={["pending", "confirmed", "unsubscribed"]}
      />
      <RecordTable
        query={query}
        rows={query.data?.subscribers || []}
        page={query.data?.pagination}
        columns={columns}
        view={view}
      />
      {target ? (
        <CommandDialog
          title="Suppress this address?"
          description={`Stop newsletter eligibility for ${target.email}. Only the recipient can confirm consent again. This does not delete history or send a campaign.`}
          label="Suppress address"
          close={() => setTarget(null)}
          execute={() =>
            api.request(`/api/admin/subscribers/${target._id}/suppress`, {
              method: "PUT",
              body: "{}",
            })
          }
        />
      ) : null}
    </div>
  );
}
