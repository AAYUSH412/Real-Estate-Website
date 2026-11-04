import { Archive, CircleCheck, CircleDashed, CircleX, Clock3, PauseCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Shared meanings across every operational module; unknown states stay neutral.
const states = {
  pending: { icon: Clock3, variant: "statusAmber" },
  awaiting_review: { icon: Clock3, variant: "statusAmber" },
  unverified: { icon: Clock3, variant: "statusAmber" },
  new: { icon: Clock3, variant: "statusAmber" },
  confirmed: { icon: Clock3, variant: "statusBlue" },
  in_progress: { icon: Clock3, variant: "statusBlue" },
  active: { icon: CircleCheck, variant: "statusGreen" },
  enabled: { icon: CircleCheck, variant: "statusGreen" },
  available: { icon: CircleCheck, variant: "statusGreen" },
  published: { icon: CircleCheck, variant: "statusGreen" },
  completed: { icon: CircleCheck, variant: "statusGreen" },
  verified: { icon: CircleCheck, variant: "statusGreen" },
  resolved: { icon: CircleCheck, variant: "statusGreen" },
  cancelled: { icon: CircleX, variant: "statusRed" },
  rejected: { icon: CircleX, variant: "statusRed" },
  banned: { icon: CircleX, variant: "statusRed" },
  suspended: { icon: PauseCircle, variant: "statusPurple" },
  archived: { icon: Archive, variant: "statusGray" },
  expired: { icon: Clock3, variant: "statusGray" },
  disabled: { icon: CircleDashed, variant: "statusGray" },
  unsubscribed: { icon: CircleDashed, variant: "statusGray" },
} as const;

export function StateBadge({ status, label }: { status: string; label?: string }) {
  const state = states[status.toLowerCase().replaceAll(" ", "_") as keyof typeof states];
  const Icon = state?.icon ?? CircleDashed;
  const text = label ?? status.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
  return <Badge variant={state?.variant ?? "statusGray"}><Icon aria-hidden="true" />{text}</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  return <StateBadge status={status} label={status === "active" ? "Published" : undefined} />;
}
