import { AlertCircle, SearchX } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import { ApiError } from "@/lib/api";
export function RequestError({
  message,
  retry,
  retryLabel = "Try again",
}: {
  message: string;
  retry?: () => void;
  retryLabel?: string;
}) {
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>Unable to continue</AlertTitle>
      <AlertDescription>
        <p>{message}</p>
        {retry ? (
          <Button variant="outline" size="sm" onClick={retry}>
            {retryLabel}
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
export function ErrorState({
  error,
  retry,
  retryLabel,
}: {
  error: unknown;
  retry?: () => void;
  retryLabel?: string;
}) {
  return (
    <RequestError
      message={
        error instanceof ApiError && error.status === 409
          ? `${error.message} Refresh and review the latest version before saving again.`
          : error instanceof Error
            ? error.message
            : "The request failed. Please retry."
      }
      retry={retry}
      retryLabel={retryLabel}
    />
  );
}
export function PageLoading({
  label = "Loading workspace",
}: {
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-8"
    >
      <span className="text-sm text-muted-foreground">{label}…</span>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-44 w-full" />
    </div>
  );
}
export function EmptyResults({
  title = "No results",
  description = "Try changing your search or filters.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchX />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
