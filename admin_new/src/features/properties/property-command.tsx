import { ApiError } from "@/lib/api";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { PropertyDTO } from "@buildestate/contracts";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { ErrorState } from "@/components/feedback/states";
import { invalidateProperties, propertiesAPI } from "./api";
export type Command = {
  action: "approve" | "reject" | "archive";
  records: PropertyDTO[];
};
export function PropertyCommand({
  command,
  close,
  completed,
}: {
  command: Command;
  close: () => void;
  completed?: () => void;
}) {
  const [reason, setReason] = useState("");
  const [validation, setValidation] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      propertiesAPI.command(command.action, command.records, reason.trim()),
    onSuccess: async () => {
      await invalidateProperties();
      toast.success(
        command.action === "archive"
          ? "Listings archived"
          : command.action === "approve"
            ? "Listings approved"
            : "Listings rejected",
      );
      completed?.();
      close();
    },
  });
  const title =
    command.action === "archive"
      ? "Archive"
      : command.action === "approve"
        ? "Approve"
        : "Reject";
  function submit() {
    if (command.action === "reject" && !reason.trim()) {
      setValidation("Explain why this listing needs changes.");
      return;
    }
    mutation.mutate();
  }
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) close();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {title}{" "}
            {command.records.length === 1
              ? "this listing"
              : `${command.records.length} listings`}
            ?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {command.action === "archive"
              ? "The listing leaves the public catalog and its open viewing requests are cancelled. Existing booking history and photos are retained. This action has no restore control."
              : command.action === "approve"
                ? "Publish the selected pending listings after the server checks the owner and displayed version."
                : "Return the selected pending listings with a clear reason for the owner."}
            {command.records.length > 1
              ? " This is an atomic action on selected rows from the current page: every row succeeds or none changes."
              : ""}{" "}
            Notification delivery is not guaranteed by a successful save.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {command.action === "reject" ? (
          <Field data-invalid={!!validation}>
            <FieldLabel htmlFor="rejection">Rejection reason</FieldLabel>
            <Textarea
              id="rejection"
              maxLength={2000}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setValidation("");
              }}
              aria-invalid={!!validation}
              disabled={mutation.isPending}
            />
            <FieldError>{validation}</FieldError>
          </Field>
        ) : null}
        {mutation.isError ? (
          <ErrorState
            error={mutation.error}
            retryLabel="Refresh records"
            retry={() => {
              void invalidateProperties();
              close();
            }}
          />
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <Button
            variant={command.action === "archive" ? "destructive" : "default"}
            disabled={
              mutation.isPending ||
              (mutation.error instanceof ApiError &&
                mutation.error.status === 409)
            }
            onClick={submit}
          >
            {mutation.isPending
              ? "Saving…"
              : `${title} ${command.records.length === 1 ? "listing" : "listings"}`}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
