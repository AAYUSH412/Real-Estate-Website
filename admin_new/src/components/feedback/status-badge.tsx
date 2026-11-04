import {
  CircleCheck,
  CircleDashed,
  CircleX,
  Clock3,
  Archive,
} from "lucide-react";
import type { ListingStatus, BookingStatus } from "@buildestate/contracts";
import { Badge } from "@/components/ui/badge";
const states = {
  pending: { label: "Pending", icon: Clock3, tone: "warning" },
  active: { label: "Published", icon: CircleCheck, tone: "success" },
  rejected: { label: "Rejected", icon: CircleX, tone: "destructive" },
  expired: { label: "Expired", icon: Clock3, tone: "neutral" },
  archived: { label: "Archived", icon: Archive, tone: "neutral" },
  confirmed: { label: "Confirmed", icon: CircleCheck, tone: "success" },
  cancelled: { label: "Cancelled", icon: CircleX, tone: "neutral" },
  completed: { label: "Completed", icon: CircleCheck, tone: "success" },
} as const;
export function StatusBadge({
  status,
}: {
  status: ListingStatus | BookingStatus;
}) {
  const state = states[status];
  const Icon = state?.icon ?? CircleDashed;
  return (
    <Badge variant="outline" data-tone={state?.tone ?? "neutral"}>
      <Icon data-icon="inline-start" />
      {state?.label ?? status}
    </Badge>
  );
}
