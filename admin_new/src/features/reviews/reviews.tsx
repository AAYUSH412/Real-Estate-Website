import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  ErrorState,
  PageLoading,
  EmptyResults,
} from "@/components/feedback/states";
import { propertiesAPI } from "@/features/properties/api";
import { PropertyRecord } from "@/features/properties/detail";
import {
  PropertyCommand,
  type Command,
} from "@/features/properties/property-command";
import { money, dateLabel } from "@/features/properties/helpers";
import { cn } from "@/lib/utils";
export default function Reviews() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const raw = Number(params.get("page") || 1);
  const page = Number.isInteger(raw) && raw > 0 && raw <= 100000 ? raw : 1;
  const search = (params.get("search") || "").slice(0, 200);
  return (
    <ReviewPage
      key={params.toString()}
      page={page}
      search={search}
      change={(updates) => {
        const next = new URLSearchParams(params);
        for (const [key, value] of Object.entries(updates)) {
          if (value) next.set(key, String(value));
          else next.delete(key);
        }
        navigate(`/reviews?${next.toString()}`);
      }}
    />
  );
}
function ReviewPage({
  page,
  search,
  change,
}: {
  page: number;
  search: string;
  change: (updates: Record<string, string | number>) => void;
}) {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ["reviews", "list", { page, search }],
    queryFn: ({ signal }) =>
      propertiesAPI.pending({ page, search, limit: 10 }, signal),
  });
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [command, setCommand] = useState<Command | null>(null);
  const rows = query.data?.properties || [];
  const selectedRows = rows.filter((row) => selected[row._id]);
  const selectedId = id || rows[0]?._id;
  return (
    <div className="management-page">
      <div className="management-heading">
        <div>
          <p className="eyebrow">Property management</p>
          <h1>Review queue</h1>
          <p>
            Read the submission, check the owner, then make a clear decision.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={query.isFetching}
          onClick={() => {
            setSelected({});
            void query.refetch();
          }}
        >
          <RefreshCw data-icon="inline-start" />
          Refresh queue
        </Button>
      </div>
      <div className="review-workspace">
        <aside className="review-queue" aria-label="Pending submissions">
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              change({
                search: String(data.get("search") || "").trim(),
                page: 1,
              });
            }}
          >
            <Field>
              <FieldLabel htmlFor="queue-search">Find a submission</FieldLabel>
              <Input
                id="queue-search"
                name="search"
                defaultValue={search}
                maxLength={200}
                placeholder="Property or owner"
              />
            </Field>
            <Button
              size="icon"
              variant="outline"
              type="submit"
              aria-label="Search queue"
            >
              <Search />
            </Button>
          </form>
          <div className="queue-summary">
            <span>
              {query.data
                ? `${query.data.pagination.total} pending`
                : "Pending submissions"}
            </span>
            <span>Oldest first</span>
          </div>
          {selectedRows.length ? (
            <div className="flex flex-col gap-2 rounded-lg border bg-card p-3">
              <span className="text-xs">
                {selectedRows.length} selected on this page
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    setCommand({ action: "approve", records: selectedRows })
                  }
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setCommand({ action: "reject", records: selectedRows })
                  }
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelected({})}
                >
                  Clear
                </Button>
              </div>
            </div>
          ) : null}
          {query.isPending ? (
            <PageLoading label="Loading queue" />
          ) : query.isError ? (
            <ErrorState
              error={query.error}
              retry={() => void query.refetch()}
            />
          ) : rows.length ? (
            <div className="flex flex-col gap-2">
              {rows.map((row) => (
                <div
                  key={row._id}
                  className={cn(
                    "queue-item",
                    selectedId === row._id && "queue-item-active",
                  )}
                >
                  <Checkbox
                    aria-label={`Select ${row.title}`}
                    checked={!!selected[row._id]}
                    onCheckedChange={(value) =>
                      setSelected((previous) => ({
                        ...previous,
                        [row._id]: !!value,
                      }))
                    }
                  />
                  <Link
                    to={`/reviews/${row._id}${search || page > 1 ? `?${new URLSearchParams({ ...(search ? { search } : {}), page: String(page) })}` : ""}`}
                  >
                    <img src={row.image[0]} alt="" />
                    <strong>{row.title}</strong>
                    <span>{row.location}</span>
                    <span>{money(row.price)}</span>
                    <small>
                      {row.owner?.name ||
                        (row.ownerId
                          ? "Unavailable owner"
                          : "Administrator")}{" "}
                      · {dateLabel(row.createdAt)}
                    </small>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyResults
              title="Queue is clear"
              description={
                search
                  ? "No pending submissions match this search."
                  : "New submissions will appear here."
              }
            />
          )}
          {query.data ? (
            <div className="flex items-center justify-between gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!query.data.pagination.hasPreviousPage}
                onClick={() => change({ page: page - 1 })}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {page} / {Math.max(1, query.data.pagination.totalPages)}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={!query.data.pagination.hasNextPage}
                onClick={() => change({ page: page + 1 })}
              >
                Next
              </Button>
            </div>
          ) : null}
        </aside>
        <section className="review-detail" aria-label="Selected submission">
          {selectedId ? (
            <PropertyRecord key={selectedId} id={selectedId} reviewing />
          ) : query.isPending ? (
            <PageLoading />
          ) : (
            <EmptyResults
              title="Nothing waiting for review"
              description="Select a submission when one arrives."
            />
          )}
        </section>
      </div>
      {command ? (
        <PropertyCommand
          command={command}
          close={() => setCommand(null)}
          completed={() => setSelected({})}
        />
      ) : null}
    </div>
  );
}
