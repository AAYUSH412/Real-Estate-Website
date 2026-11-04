import {
  ShieldCheck,
  Fingerprint,
  ArrowUpRight,
  Building2,
} from "lucide-react";
import { useSession } from "@/features/auth/session";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
export default function Workspace() {
  const { state } = useSession();
  return (
    <div className="workspace">
      <div className="page-heading">
        <p className="eyebrow">Your workspace</p>
        <h1>Welcome to BuildEstate</h1>
        <p>
          A clearer space to look after your properties and the people behind
          them.
        </p>
      </div>
      <Card className="workspace-session">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="session-icon">
              <ShieldCheck />
            </span>
            <Badge variant="secondary">Session verified</Badge>
          </div>
          <CardTitle>Ready when you are.</CardTitle>
          <CardDescription>
            You’re signed in with a verified administrator account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Separator />
          <dl className="session-details">
            <div>
              <dt>Email address</dt>
              <dd>{state.user?.email}</dd>
            </div>
            <div>
              <dt>Access</dt>
              <dd>Administrator</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      <div className="workspace-note">
        <span className="note-icon">
          <Building2 />
        </span>
        <div>
          <h2>A new foundation for property management</h2>
          <p>
            The replacement admin is being built in stages. Property management
            and your operational dashboard are next. Continue using the existing
            admin for those tasks.
          </p>
        </div>
      </div>
      <div className="workspace-bottom">
        <span>
          <Fingerprint /> Account verified by BuildEstate
        </span>
        <span>
          Designed for the details <ArrowUpRight />
        </span>
      </div>
    </div>
  );
}
