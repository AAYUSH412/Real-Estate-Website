export interface PageMetadata {
  currentPage: number;
  totalPages: number;
  totalProperties: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  limit: number;
}

export default function PaginationControls({ pagination, onPageChange }: {
  pagination: PageMetadata | null;
  onPageChange: (page: number) => void;
}) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return (
    <nav aria-label="Results pages" className="flex items-center justify-center gap-5 py-6 font-manrope text-sm">
      <button type="button" disabled={!pagination.hasPreviousPage} onClick={() => onPageChange(pagination.currentPage - 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">Previous</button>
      <span aria-live="polite">Page {pagination.currentPage} of {pagination.totalPages}</span>
      <button type="button" disabled={!pagination.hasNextPage} onClick={() => onPageChange(pagination.currentPage + 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">Next</button>
    </nav>
  );
}
