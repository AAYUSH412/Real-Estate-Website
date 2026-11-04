import { StateBadge } from "@/components/feedback/status-badge";
import { PropertyImage } from "@/components/media/property-image";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  Archive,
  Check,
  X,
  MapPin,
  BedDouble,
  Bath,
  Ruler,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ErrorState, PageLoading } from "@/components/feedback/states";
import { StatusBadge } from "@/components/feedback/status-badge";
import { propertiesAPI } from "./api";
import { money, dateLabel } from "./helpers";
import { PropertyCommand, type Command } from "./property-command";
import { api } from "@/lib/api";
import type { PropertyDTO } from "@buildestate/contracts";
export default function PropertyDetail() {
  const { id = "" } = useParams();
  return (
    <div className="management-page">
      <Button variant="ghost" asChild className="self-start">
        <Link to="/properties">
          <ArrowLeft data-icon="inline-start" />
          Back to properties
        </Link>
      </Button>
      <PropertyRecord key={id} id={id} />
    </div>
  );
}
export function PropertyRecord({
  id,
  reviewing = false,
}: {
  id: string;
  reviewing?: boolean;
}) {
  const query = useQuery({
    queryKey: ["properties", "detail", id],
    queryFn: ({ signal }) => propertiesAPI.detail(id, signal),
  });
  const [command, setCommand] = useState<Command | null>(null);
  if (query.isPending) return <PageLoading label="Loading property" />;
  if (query.isError)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  const record = query.data.property;
  return (
    <div className="property-record">
      <div className="management-heading">
        <div>
          <div className="mb-3 flex gap-2">
            <StatusBadge status={record.status} />
            <Badge variant="outline">{record.type}</Badge>
            <StateBadge status={record.marketStatus} />
          </div>
          <h1>{record.title}</h1>
          <p className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0" />
            {record.location}
          </p>
        </div>
        <div className="record-actions">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw data-icon="inline-start" />
            Refresh
          </Button>
          {record.status !== "archived" ? (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/properties/${id}/edit`}>
                  <Pencil data-icon="inline-start" />
                  Edit
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCommand({ action: "archive", records: [record] })
                }
              >
                <Archive data-icon="inline-start" />
                Archive
              </Button>
            </>
          ) : null}
        </div>
      </div>
      {record.status === "archived" ? (
        <Alert>
          <AlertTitle>Archived history</AlertTitle>
          <AlertDescription>
            This listing is retained for history. Editing, publication and
            restoration are unavailable.
          </AlertDescription>
        </Alert>
      ) : null}
      {record.rejectionReason ? (
        <Alert>
          <AlertTitle>Most recent rejection reason</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">
            {record.rejectionReason}
          </AlertDescription>
        </Alert>
      ) : null}
      <Gallery
        key={record.image.join("|")}
        images={record.image}
        title={record.title}
      />
      <div className="property-detail-columns">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{money(record.price, record.purpose)}</CardTitle>
              <CardDescription>
                {record.purpose === "rent"
                  ? "Monthly rent"
                  : "Asking sale price"}{" "}
                · {record.marketStatus}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="property-specs">
                <span>
                  <BedDouble />
                  {record.beds} bedrooms
                </span>
                <span>
                  <Bath />
                  {record.baths} bathrooms
                </span>
                <span>
                  <Ruler />
                  {record.sqft.toLocaleString("en-IN")} sq ft
                </span>
              </div>
              <p className="mt-6 whitespace-pre-wrap leading-7">
                {record.description}
              </p>
              {record.amenities.length ? (
                <div className="mt-6 flex flex-wrap gap-2">
                  {record.amenities.map((amenity) => (
                    <Badge key={amenity} variant="secondary">
                      {amenity}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  No amenities listed.
                </p>
              )}
              {record.googleMapLink ? (
                <Button variant="link" asChild className="mt-4">
                  <a
                    href={record.googleMapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open map
                    <ExternalLink data-icon="inline-end" />
                  </a>
                </Button>
              ) : null}
            </CardContent>
          </Card>
          <RecordActivity id={id} version={record.version} />
        </div>
        <div className="flex flex-col gap-6">
          <OwnerPanel record={record} />
          <Card>
            <CardHeader>
              <CardTitle>Listing record</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="overview-facts">
                <div>
                  <dt>Submitted</dt>
                  <dd>{dateLabel(record.createdAt, "Not recorded")}</dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd>{dateLabel(record.updatedAt, "Not recorded")}</dd>
                </div>
                <div>
                  <dt>Expires</dt>
                  <dd>{dateLabel(record.expiresAt, "No scheduled expiry")}</dd>
                </div>
                <div>
                  <dt>Version</dt>
                  <dd>{record.version}</dd>
                </div>
                <div>
                  <dt>Contact phone</dt>
                  <dd>
                    <a href={`tel:${record.phone}`}>{record.phone}</a>
                  </dd>
                </div>
              </dl>
              <p className="mt-4 break-all text-xs text-muted-foreground">
                ID: {record._id}
              </p>
            </CardContent>
          </Card>
          {record.status === "pending" ? (
            <Card>
              <CardHeader>
                <CardTitle>Review decision</CardTitle>
                <CardDescription>
                  The server rechecks owner eligibility and this displayed
                  version before committing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      setCommand({ action: "approve", records: [record] })
                    }
                  >
                    <Check data-icon="inline-start" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setCommand({ action: "reject", records: [record] })
                    }
                  >
                    <X data-icon="inline-start" />
                    Reject
                  </Button>
                </div>
                <p className="mt-4 text-xs leading-5 text-muted-foreground">
                  User-owned approvals expire after 45 days. Rejection requires
                  a reason.
                </p>
              </CardContent>
            </Card>
          ) : reviewing ? (
            <Alert>
              <AlertTitle>Review already resolved</AlertTitle>
              <AlertDescription>
                This listing is no longer pending. Select another record from
                the queue.
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      </div>
      {command ? (
        <PropertyCommand command={command} close={() => setCommand(null)} />
      ) : null}
    </div>
  );
}
function Gallery({ images, title }: { images: string[]; title: string }) {
  const [index, setIndex] = useState(0);
  return (
    <section className="property-gallery" aria-label="Property photos">
      <PropertyImage
        compact={false}
        className="gallery-main"
        src={images[index]}
        alt={`${title}, photo ${index + 1}`}
      />
      <div className="gallery-thumbnails">
        {images.map((image, i) => (
          <button
            type="button"
            key={image}
            onClick={() => setIndex(i)}
            aria-label={`Show photo ${i + 1}`}
            aria-pressed={i === index}
          >
            <PropertyImage src={image} alt="" />
          </button>
        ))}
      </div>
    </section>
  );
}
function OwnerPanel({ record }: { record: PropertyDTO }) {
  const query = useQuery({
    queryKey: ["property-owner", record.ownerId],
    queryFn: ({ signal }) => propertiesAPI.owner(record.ownerId!, signal),
    enabled: !!record.ownerId,
  });
  const owner = query.data?.user;
  const suspensionExpired =
    owner?.status === "suspended" &&
    owner.suspendedUntil &&
    new Date(owner.suspendedUntil).getTime() <= query.dataUpdatedAt;
  const eligible =
    owner &&
    owner.isEmailVerified &&
    (owner.status === "active" || suspensionExpired);
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {record.ownerId ? "Listing owner" : "Admin-created listing"}
        </CardTitle>
        <CardDescription>
          {record.owner?.name ||
            (record.ownerId
              ? "Owner reference retained"
              : "Managed by the administrator")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {record.owner?.email ? (
          <p className="mb-4 break-all text-sm">{record.owner.email}</p>
        ) : null}
        {!record.ownerId ? (
          <p className="text-sm text-muted-foreground">
            No user owner is attached to this record.
          </p>
        ) : query.isError ? (
          <ErrorState error={query.error} retry={() => void query.refetch()} />
        ) : query.isPending ? (
          <p className="text-sm text-muted-foreground">Checking owner…</p>
        ) : (
          <>
            <StateBadge status={eligible ? "verified" : "pending"} label={eligible ? "Owner eligible" : "Owner requires attention"} />
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Account: {owner?.status}. Email:{" "}
              {owner?.isEmailVerified ? "verified" : "unverified"}. Eligibility
              may change; the server makes the final decision.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
function RecordActivity({ id, version }: { id: string; version: number }) {
  const query = useQuery({
    queryKey: ["properties", "activity", id, version],
    queryFn: ({ signal }) =>
      api.request<{
        logs: {
          _id: string;
          action: string;
          actorEmail?: string;
          actorType?: string;
          createdAt: string;
          metadata?: { reason?: string };
        }[];
      }>(
        `/api/admin/activity-logs?targetType=property&targetId=${id}&page=1&limit=6`,
        { signal },
      ),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent record activity</CardTitle>
        <CardDescription>
          Latest six events linked directly to this property.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {query.isError ? (
          <ErrorState error={query.error} retry={() => void query.refetch()} />
        ) : query.isPending ? (
          <p className="text-sm text-muted-foreground">Loading activity…</p>
        ) : query.data.logs.length ? (
          <ol className="record-timeline">
            {query.data.logs.map((log) => (
              <li key={log._id}>
                <strong>{log.action.replaceAll("_", " ")}</strong>
                <span>
                  {log.actorEmail || log.actorType || "System"} ·{" "}
                  {dateLabel(log.createdAt)}
                </span>
                {log.metadata?.reason ? <p>{log.metadata.reason}</p> : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">
            No directly linked events recorded. Bulk summaries may be recorded
            separately.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
