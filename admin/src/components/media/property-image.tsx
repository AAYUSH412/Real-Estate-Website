import { useState } from "react";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
type Props = {
  src?: string;
  alt: string;
  className?: string;
  compact?: boolean;
  loading?: "lazy" | "eager";
};
export function PropertyImage(props: Props) {
  return <ImageContent key={props.src || "missing"} {...props} />;
}
function ImageContent({
  src,
  alt,
  className,
  compact = true,
  loading = "lazy",
}: Props) {
  const [failed, setFailed] = useState(!src);
  return (
    <span
      className={cn("property-image", className)}
      role={failed ? "img" : undefined}
      aria-label={
        failed ? `${alt ? `${alt}: ` : ""}Photo unavailable` : undefined
      }
    >
      {failed ? (
        <span className="photo-unavailable pt-3">
          <Building2 aria-hidden="true" />
          {!compact ? <span>Photo unavailable</span> : null}
        </span>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={loading}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
