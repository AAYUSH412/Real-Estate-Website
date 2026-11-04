import { PropertyImage } from "@/components/media/property-image";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { Link, useSearchParams } from "react-router-dom";
import {
  PROPERTY_TYPES,
  LISTING_STATUSES,
  type PropertyDTO,
} from "@buildestate/contracts";
import { Plus, ArrowUpRight, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { DataTable } from "@/components/data-table/data-table";
import { ErrorState, PageLoading } from "@/components/feedback/states";
import { StatusBadge } from "@/components/feedback/status-badge";
import { propertiesAPI, type CatalogFilters } from "./api";
import { readFilters, money, dateLabel } from "./helpers";
import { PropertyCommand, type Command } from "./property-command";
export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  return (
    <CatalogPage
      key={params.toString()}
      filters={filters}
      change={(updates, reset = true) => {
        const next = new URLSearchParams(params);
        for (const [key, value] of Object.entries(updates)) {
          if (value === "" || value === "all") next.delete(key);
          else next.set(key, String(value));
        }
        if (reset) next.delete("page");
        setParams(next);
      }}
    />
  );
}
function CatalogPage({
  filters,
  change,
}: {
  filters: CatalogFilters;
  change: (updates: Record<string, string | number>, reset?: boolean) => void;
}) {
  const query = useQuery({
    queryKey: ["properties", "list", filters],
    queryFn: ({ signal }) => propertiesAPI.list(filters, signal),
  });
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [command, setCommand] = useState<Command | null>(null);
  const rows = query.data?.properties || [];
  const selected = rows.filter((row) => selection[row._id]);
  const pending =
    selected.length > 0 && selected.every((row) => row.status === "pending");
  const archivable =
    selected.length > 0 && selected.every((row) => row.status !== "archived");
  const columns: ColumnDef<PropertyDTO>[] = [
    {
      id: "select",
      enableHiding: false,
      header: () => (
        <Checkbox
          aria-label="Select all actionable listings on this page"
          checked={
            rows.some((row) => row.status !== "archived") &&
            rows
              .filter((row) => row.status !== "archived")
              .every((row) => !!selection[row._id])
              ? true
              : selected.length
                ? "indeterminate"
                : false
          }
          onCheckedChange={(checked) =>
            setSelection(
              checked
                ? Object.fromEntries(
                    rows
                      .filter((row) => row.status !== "archived")
                      .map((row) => [row._id, true]),
                  )
                : {},
            )
          }
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label={`Select ${row.original.title}`}
          checked={!!selection[row.id]}
          disabled={row.original.status === "archived"}
          onCheckedChange={(checked) =>
            setSelection((previous) => ({ ...previous, [row.id]: !!checked }))
          }
        />
      ),
    },
    {
      id: "property",
      header: "Property",
      enableHiding: false,
      cell: ({ row: { original: row } }) => (
        <Link className="property-cell" to={`/properties/${row._id}`}>
          <PropertyImage src={row.image[0]} alt="" />
          <span>
            <strong>{row.title}</strong>
            <small>{row.location}</small>
          </span>
        </Link>
      ),
    },
    {
      id: "price",
      header: "Price / purpose",
      cell: ({ row: { original: row } }) => (
        <div className="table-stack">
          <strong>{money(row.price)}</strong>
          <span>{row.purpose === "rent" ? "Monthly rent" : "For sale"}</span>
        </div>
      ),
    },
    {
      id: "status",
      header: "Listing state",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "market",
      header: "Market state",
      cell: ({ row }) => (
        <span className="capitalize">{row.original.marketStatus}</span>
      ),
    },
    {
      id: "owner",
      header: "Owner",
      cell: ({ row: { original: row } }) => (
        <div className="table-stack">
          <strong>
            {row.owner?.name ||
              (row.ownerId ? "Unavailable account" : "Administrator")}
          </strong>
          <span>
            {row.owner?.email ||
              (row.ownerId
                ? "Historical owner reference retained"
                : "Admin-created listing")}
          </span>
        </div>
      ),
    },
    {
      id: "created",
      header: "Created",
      cell: ({ row }) => dateLabel(row.original.createdAt),
    },
    {
      id: "actions",
      enableHiding: false,
      header: "Actions",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" asChild>
          <Link
            to={`/properties/${row.id}`}
            aria-label={`Open ${row.original.title}`}
          >
            Open
            <ArrowUpRight data-icon="inline-end" />
          </Link>
        </Button>
      ),
    },
  ];
  function filterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    change(
      Object.fromEntries(
        [...form.entries()].map(([key, value]) => [key, String(value).trim()]),
      ),
    );
  }
  return (
    <div className="management-page">
      <div className="management-heading">
        <div>
          <p className="eyebrow">Property management</p>
          <h1>Properties</h1>
          <p>Every listing, from first submission to archived history.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={query.isFetching}
            onClick={() => {
              setSelection({});
              void query.refetch();
            }}
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
      <form onSubmit={filterSubmit} className="filter-panel">
        <FieldGroup className="catalog-filters grid grid-cols-4 gap-4">
          <Field>
            <FieldLabel htmlFor="search">Search properties</FieldLabel>
            <Input
              id="search"
              name="search"
              placeholder="Title, location or type"
              defaultValue={filters.search}
              maxLength={200}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="status">Listing state</FieldLabel>
            <NativeSelect
              id="status"
              name="status"
              defaultValue={filters.status}
            >
              <NativeSelectOption value="all">All inventory</NativeSelectOption>
              {LISTING_STATUSES.map((status) => (
                <NativeSelectOption key={status} value={status}>
                  {status === "active"
                    ? "Published & public"
                    : status[0].toUpperCase() + status.slice(1)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="type">Property type</FieldLabel>
            <NativeSelect id="type" name="type" defaultValue={filters.type}>
              <NativeSelectOption value="all">All types</NativeSelectOption>
              {PROPERTY_TYPES.map((type) => (
                <NativeSelectOption key={type} value={type}>
                  {type}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="purpose">Purpose</FieldLabel>
            <NativeSelect
              id="purpose"
              name="availability"
              defaultValue={filters.availability}
            >
              <NativeSelectOption value="">Sale & rent</NativeSelectOption>
              <NativeSelectOption value="sale">For sale</NativeSelectOption>
              <NativeSelectOption value="rent">For rent</NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="sort">Sort by</FieldLabel>
            <NativeSelect id="sort" name="sort" defaultValue={filters.sort}>
              <NativeSelectOption value="newest">
                Newest first
              </NativeSelectOption>
              <NativeSelectOption value="price-low">
                Price: low to high
              </NativeSelectOption>
              <NativeSelectOption value="price-high">
                Price: high to low
              </NativeSelectOption>
              <NativeSelectOption value="beds">
                Most bedrooms
              </NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="minPrice">Min. price (₹)</FieldLabel>
            <Input
              id="minPrice"
              name="minPrice"
              type="number"
              min="0"
              defaultValue={filters.minPrice}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="maxPrice">Max. price (₹)</FieldLabel>
            <Input
              id="maxPrice"
              name="maxPrice"
              type="number"
              min="0"
              defaultValue={filters.maxPrice}
            />
          </Field>
          <div className="filter-actions">
            <Button type="submit" variant="outline">
              <Search data-icon="inline-start" />
              Apply filters
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                change({
                  search: "",
                  status: "all",
                  type: "all",
                  availability: "",
                  sort: "newest",
                  minPrice: "",
                  maxPrice: "",
                })
              }
            >
              Reset
            </Button>
          </div>
        </FieldGroup>
      </form>
      {selection && selected.length ? (
        <div className="selection-bar">
          <span>{selected.length} selected on this page</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!pending}
              onClick={() =>
                setCommand({ action: "approve", records: selected })
              }
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!pending}
              onClick={() =>
                setCommand({ action: "reject", records: selected })
              }
            >
              Reject
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!archivable}
              onClick={() =>
                setCommand({ action: "archive", records: selected })
              }
            >
              Archive
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelection({})}>
              Clear
            </Button>
          </div>
        </div>
      ) : null}
      {query.isPending ? (
        <PageLoading label="Loading listings" />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          caption="Property inventory"
          getRowId={(row) => row._id}
          page={query.data.pagination}
          pagination={{ pageIndex: (filters.page || 1) - 1, pageSize: 15 }}
          onPaginationChange={(update) => {
            const next =
              typeof update === "function"
                ? update({ pageIndex: (filters.page || 1) - 1, pageSize: 15 })
                : update;
            change({ page: next.pageIndex + 1 }, false);
          }}
          sorting={[]}
          onSortingChange={() => {}}
          selection={selection}
          onSelectionChange={setSelection}
          busy={query.isFetching}
        />
      )}
      <p className="text-xs text-muted-foreground">
        All inventory includes archived history. “Published & public”
        additionally checks expiry and moderation. Bulk review requires only
        pending rows.
      </p>
      {command ? (
        <PropertyCommand
          command={command}
          close={() => setCommand(null)}
          completed={() => setSelection({})}
        />
      ) : null}
    </div>
  );
}
