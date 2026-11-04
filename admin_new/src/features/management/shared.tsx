/* Shared module primitives intentionally expose their list-state and invalidation helpers. */
/* eslint-disable react-refresh/only-export-components */
import { type ReactNode } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useMutation, type UseQueryResult } from "@tanstack/react-query";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import type { PageDTO } from "@buildestate/contracts";
import { toast } from "sonner";
import { ArrowLeft, Search } from "lucide-react";
import { queryClient } from "@/app/query-client";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { ErrorState, PageLoading } from "@/components/feedback/states";
import { ApiError } from "@/lib/api";
export function useListView(statuses: readonly string[] = []) {
  const [params, setParams] = useSearchParams();
  const number = Number(params.get("page") || 1);
  const page =
    Number.isInteger(number) && number > 0 && number <= 100000 ? number : 1;
  const status = statuses.includes(params.get("status") || "")
    ? params.get("status")!
    : "";
  const search = (params.get("search") || "").slice(0, 200);
  function change(values: Record<string, string | number>, reset = true) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(values)) {
      if (value === "") next.delete(key);
      else next.set(key, String(value));
    }
    if (reset) next.delete("page");
    setParams(next);
  }
  return {
    params,
    page,
    status,
    search,
    change,
    filters: { page, limit: 15, status, search },
    stamp: params.toString(),
  };
}
export function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="management-heading">
      <div>
        <p className="eyebrow">Administration</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Button variant="ghost" asChild className="self-start">
      <Link to={to}>
        <ArrowLeft data-icon="inline-start" />
        {label}
      </Link>
    </Button>
  );
}
export function Filters({
  view,
  statuses,
  children,
}: {
  view: ReturnType<typeof useListView>;
  statuses?: readonly string[];
  children?: ReactNode;
}) {
  return (
    <form
      className="filter-panel"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        view.change(
          Object.fromEntries(
            [...form].map(([key, value]) => [key, String(value).trim()]),
          ),
        );
      }}
    >
      <FieldGroup className="grid grid-cols-4 gap-4">
        <Field>
          <FieldLabel htmlFor="list-search">Search</FieldLabel>
          <Input
            id="list-search"
            name="search"
            defaultValue={view.search}
            maxLength={200}
          />
        </Field>
        {statuses?.length ? (
          <Field>
            <FieldLabel htmlFor="list-status">Status</FieldLabel>
            <NativeSelect
              id="list-status"
              name="status"
              defaultValue={view.status}
            >
              <NativeSelectOption value="">All statuses</NativeSelectOption>
              {statuses.map((status) => (
                <NativeSelectOption key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
        {children}
        <div className="filter-actions">
          <Button variant="outline" type="submit">
            <Search data-icon="inline-start" />
            Apply
          </Button>
          <Button
            variant="ghost"
            type="button"
            onClick={() =>
              view.change(
                Object.fromEntries(
                  [...view.params.keys()].map((key) => [key, ""]),
                ),
              )
            }
          >
            Reset
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
export function StateBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      data-tone={
        ["active", "confirmed", "resolved", "completed"].includes(status)
          ? "success"
          : ["banned", "suspended", "new", "pending", "in_progress"].includes(
                status,
              )
            ? "warning"
            : "neutral"
      }
    >
      {status.replaceAll("_", " ")}
    </Badge>
  );
}
export function RecordTable<T extends { _id: string }>({
  query,
  rows,
  page,
  columns,
  view,
  selection = {},
  onSelectionChange = () => {},
}: {
  query: UseQueryResult<unknown, Error>;
  rows: T[];
  page?: PageDTO;
  columns: ColumnDef<T>[];
  view: ReturnType<typeof useListView>;
  selection?: RowSelectionState;
  onSelectionChange?: (
    value:
      | RowSelectionState
      | ((previous: RowSelectionState) => RowSelectionState),
  ) => void;
}) {
  if (query.isPending) return <PageLoading />;
  if (query.isError)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  if (!page) return null;
  return (
    <DataTable
      data={rows}
      columns={columns}
      page={page}
      caption="Management records"
      getRowId={(row) => row._id}
      pagination={{ pageIndex: view.page - 1, pageSize: 15 }}
      onPaginationChange={(value) => {
        const next =
          typeof value === "function"
            ? value({ pageIndex: view.page - 1, pageSize: 15 })
            : value;
        view.change({ page: next.pageIndex + 1 }, false);
      }}
      sorting={[]}
      onSortingChange={() => {}}
      selection={selection}
      onSelectionChange={onSelectionChange}
      busy={query.isFetching}
    />
  );
}
export function selectionColumn<T extends { _id: string }>(
  rows: T[],
  selected: RowSelectionState,
  setSelected: (
    value:
      | RowSelectionState
      | ((previous: RowSelectionState) => RowSelectionState),
  ) => void,
): ColumnDef<T> {
  return {
    id: "selection",
    enableHiding: false,
    header: () => (
      <Checkbox
        aria-label="Select this page"
        checked={
          rows.length > 0 && rows.every((row) => selected[row._id])
            ? true
            : rows.some((row) => selected[row._id])
              ? "indeterminate"
              : false
        }
        onCheckedChange={(checked) =>
          setSelected(
            checked
              ? Object.fromEntries(rows.map((row) => [row._id, true]))
              : {},
          )
        }
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={`Select record ${row.id}`}
        checked={!!selected[row.id]}
        onCheckedChange={(checked) =>
          setSelected((previous) => ({ ...previous, [row.id]: !!checked }))
        }
      />
    ),
  };
}
export async function invalidateManagement() {
  await Promise.all(
    [
      "users",
      "appointments",
      "leads",
      "subscribers",
      "ai-models",
      "activity",
      "properties",
      "reviews",
      "dashboard",
      "property-owner",
    ].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
  );
}
export function CommandDialog({
  title,
  description,
  children,
  execute,
  close,
  label = "Save changes",
}: {
  title: string;
  description: string;
  children?: ReactNode;
  execute: () => Promise<unknown>;
  close: () => void;
  label?: string;
}) {
  const mutation = useMutation({
    mutationFn: execute,
    onSuccess: async () => {
      await invalidateManagement();
      toast.success("Action completed");
      close();
    },
  });
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) close();
      }}
    >
      <AlertDialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <fieldset disabled={mutation.isPending} className="flex flex-col gap-4">
          {children}
        </fieldset>
        {mutation.isError ? (
          <ErrorState
            error={mutation.error}
            retryLabel="Refresh records"
            retry={() => {
              void invalidateManagement();
              close();
            }}
          />
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <Button
            disabled={
              mutation.isPending ||
              (mutation.error instanceof ApiError &&
                mutation.error.status === 409)
            }
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Saving…" : label}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
export function DetailPager({
  page,
  onPage,
}: {
  page: PageDTO;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">
        {page.total} records · page {page.currentPage} /{" "}
        {Math.max(1, page.totalPages)}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!page.hasPreviousPage}
          onClick={() => onPage(page.currentPage - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!page.hasNextPage}
          onClick={() => onPage(page.currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
export function SafeMetadata({ value }: { value: unknown }) {
  return <pre className="metadata-block">{JSON.stringify(value, null, 2)}</pre>;
}
