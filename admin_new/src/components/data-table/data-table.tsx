import { useState } from "react";
import type { VisibilityState } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type OnChangeFn,
  type SortingState,
  type RowSelectionState,
} from "@tanstack/react-table";
import type { PageDTO } from "@buildestate/contracts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyResults } from "@/components/feedback/states";
type Props<T> = {
  data: T[];
  columns: ColumnDef<T>[];
  page: PageDTO;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  selection: RowSelectionState;
  onSelectionChange: OnChangeFn<RowSelectionState>;
  getRowId: (row: T) => string;
  busy?: boolean;
  caption: string;
};
// Screens own server queries, URL filters and current-page selection. No client-side sorting of one server page.
export function DataTable<T>({
  data,
  columns,
  page,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  selection,
  onSelectionChange,
  getRowId,
  busy,
  caption,
}: Props<T>) {
  const [visibility, setVisibility] = useState<VisibilityState>({});
  // TanStack Table intentionally returns mutable APIs; this component is not compiler-memoized.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      pagination,
      sorting,
      rowSelection: selection,
      columnVisibility: visibility,
    },
    onColumnVisibilityChange: setVisibility,
    onPaginationChange,
    onSortingChange,
    onRowSelectionChange: onSelectionChange,
    getRowId,
    manualPagination: true,
    manualSorting: true,
    pageCount: page.totalPages,
    getCoreRowModel: getCoreRowModel(),
  });
  return (
    <div className="flex flex-col gap-4" aria-busy={busy}>
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              {table
                .getAllLeafColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(value)}
                  >
                    {typeof column.columnDef.header === "string"
                      ? column.columnDef.header
                      : column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <caption className="sr-only">{caption}</caption>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? "selected" : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!data.length ? <EmptyResults /> : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          {page.total} results · Page {page.currentPage} of{" "}
          {Math.max(1, page.totalPages)}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy || !page.hasPreviousPage}
            onClick={() => table.previousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy || !page.hasNextPage}
            onClick={() => table.nextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
