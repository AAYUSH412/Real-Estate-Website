import { PropertyImage } from "@/components/media/property-image";
import { useEffect, useRef, useState } from "react";
import { useForm, type Path } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Link,
  useNavigate,
  useParams,
  useBlocker,
  useBeforeUnload,
} from "react-router-dom";
import {
  PROPERTY_TYPES,
  PURPOSES,
  MARKET_STATUSES,
  ContractError,
  type PropertyDTO,
} from "@buildestate/contracts";
import { ArrowLeft, Upload, X, Save } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Field,
  FieldLabel,
  FieldGroup,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ConfirmAction } from "@/components/feedback/confirm-action";
import { ErrorState, PageLoading } from "@/components/feedback/states";
import { propertiesAPI, invalidateProperties } from "./api";
import { buildListingBody, listingValues, type ListingValues } from "./helpers";
export default function PropertyFormPage() {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ["properties", "detail", id],
    queryFn: ({ signal }) => propertiesAPI.detail(id!, signal),
    enabled: !!id,
  });
  if (id && query.isPending)
    return <PageLoading label="Loading listing for editing" />;
  if (id && query.isError && !query.data)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  return <ListingForm key={id || "new"} record={query.data?.property} />;
}
function ListingForm({ record: initialRecord }: { record?: PropertyDTO }) {
  // Freeze the revision with the initial form values. Refetches must never upgrade
  // expectedVersion underneath an unsaved edit and overwrite another revision.
  const [record] = useState(initialRecord);
  const navigate = useNavigate();
  const saved = useRef(false);
  const [retained, setRetained] = useState(record?.image || []);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [reload, setReload] = useState(false);
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isDirty },
  } = useForm<ListingValues>({ defaultValues: listingValues(record) });
  const dirty =
    isDirty ||
    files.length > 0 ||
    JSON.stringify(retained) !== JSON.stringify(record?.image || []);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !saved.current &&
      dirty &&
      currentLocation.pathname + currentLocation.search !==
        nextLocation.pathname + nextLocation.search,
  );
  useBeforeUnload((event) => {
    if (dirty && !saved.current) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  const mutation = useMutation({
    mutationFn: async (values: ListingValues) => {
      const body = buildListingBody(values, retained, files, record);
      return propertiesAPI.save(body, !!record);
    },
    onSuccess: async (result) => {
      saved.current = true;
      await invalidateProperties();
      toast.success(record ? "Property updated" : "Property added");
      navigate(`/properties/${result.property._id}`, { replace: true });
    },
    onError: (failure) => {
      setError(failure);
      if (failure instanceof ContractError || failure instanceof ApiError)
        for (const [key, message] of Object.entries(failure.fields || {})) {
          if (key in listingValues(record))
            setFieldError(key as Path<ListingValues>, { message });
        }
    },
  });
  function addPhotos(event: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files || []);
    event.target.value = "";
    if (retained.length + files.length + incoming.length > 4) {
      setError(
        new Error(
          "A listing can have at most four photos. Remove a photo first.",
        ),
      );
      return;
    }
    if (
      incoming.some(
        (file) =>
          file.size > 5 * 1024 * 1024 ||
          !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
            file.type,
          ),
      )
    ) {
      setError(
        new Error(
          "Use JPG, PNG, WebP or single-frame GIF photos up to 5 MB each.",
        ),
      );
      return;
    }
    setFiles((previous) => [...previous, ...incoming]);
    setError(null);
  }
  function input(
    name: Path<ListingValues>,
    label: string,
    type = "text",
    options: {
      min?: number;
      max?: number;
      maxLength?: number;
      step?: number;
    } = {},
  ) {
    return (
      <Field data-invalid={!!errors[name]}>
        <FieldLabel htmlFor={name}>{label}</FieldLabel>
        <Input
          id={name}
          type={type}
          {...options}
          aria-invalid={!!errors[name]}
          aria-describedby={errors[name] ? `${name}-error` : undefined}
          {...register(name, {
            required: `${label} is required.`,
            ...(options.min !== undefined
              ? {
                  min: {
                    value: options.min,
                    message: `Minimum ${options.min}.`,
                  },
                }
              : {}),
            ...(options.max !== undefined
              ? {
                  max: {
                    value: options.max,
                    message: `Maximum ${options.max}.`,
                  },
                }
              : {}),
          })}
        />
        <FieldError id={`${name}-error`}>{errors[name]?.message}</FieldError>
      </Field>
    );
  }
  if (record?.status === "archived")
    return (
      <Alert>
        <AlertTitle>Archived listing</AlertTitle>
        <AlertDescription>
          Archived records cannot be edited.{" "}
          <Link to={`/properties/${record._id}`}>View retained history</Link>.
        </AlertDescription>
      </Alert>
    );
  return (
    <div className="management-page form-page">
      <Button variant="ghost" asChild className="self-start">
        <Link to={record ? `/properties/${record._id}` : "/properties"}>
          <ArrowLeft data-icon="inline-start" />
          Back to {record ? "property" : "properties"}
        </Link>
      </Button>
      <div className="management-heading">
        <div>
          <p className="eyebrow">Property management</p>
          <h1>{record ? "Edit property" : "Add property"}</h1>
          <p>
            {record
              ? "Update the listing while keeping exactly the photos you choose."
              : "Create an administrator-managed listing for the public catalog."}
          </p>
        </div>
      </div>
      <form
        onSubmit={handleSubmit((values) => {
          setError(null);
          mutation.mutate(values);
        })}
        noValidate
      >
        <fieldset
          disabled={mutation.isPending}
          className="property-form-layout"
        >
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Property details</CardTitle>
                <CardDescription>
                  Clear titles and accurate descriptions help people compare
                  homes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  {input("title", "Property title", "text", { maxLength: 300 })}
                  {input("location", "Location", "text", { maxLength: 300 })}
                  <Field data-invalid={!!errors.description}>
                    <FieldLabel htmlFor="description">Description</FieldLabel>
                    <Textarea
                      id="description"
                      rows={6}
                      maxLength={10000}
                      aria-invalid={!!errors.description}
                      {...register("description", {
                        required: "Describe this property.",
                      })}
                    />
                    <FieldError>{errors.description?.message}</FieldError>
                  </Field>
                  <div className="form-three-columns">
                    <Field>
                      <FieldLabel htmlFor="type">Property type</FieldLabel>
                      <NativeSelect id="type" {...register("type")}>
                        {PROPERTY_TYPES.map((value) => (
                          <NativeSelectOption key={value} value={value}>
                            {value}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="availability">Purpose</FieldLabel>
                      <NativeSelect
                        id="availability"
                        {...register("availability")}
                      >
                        {PURPOSES.map((value) => (
                          <NativeSelectOption key={value} value={value}>
                            {value === "rent" ? "For rent" : "For sale"}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="marketStatus">
                        Market state
                      </FieldLabel>
                      <NativeSelect
                        id="marketStatus"
                        {...register("marketStatus")}
                      >
                        {MARKET_STATUSES.map((value) => (
                          <NativeSelectOption key={value} value={value}>
                            {value[0].toUpperCase() + value.slice(1)}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </Field>
                  </div>
                  <div className="form-three-columns">
                    {input("price", "Price (₹)", "number", {
                      min: 1,
                      max: 1e12,
                      step: 1,
                    })}
                    {input("beds", "Bedrooms", "number", {
                      min: 0,
                      max: 100,
                      step: 1,
                    })}
                    {input("baths", "Bathrooms", "number", {
                      min: 0,
                      max: 100,
                      step: 1,
                    })}
                  </div>
                  <div className="form-two-columns">
                    {input("sqft", "Area (sq ft)", "number", {
                      min: 1,
                      max: 1e12,
                    })}
                    {input("phone", "Contact phone", "tel")}
                  </div>
                  <Field data-invalid={!!errors.googleMapLink}>
                    <FieldLabel htmlFor="googleMapLink">
                      Google Maps link (optional)
                    </FieldLabel>
                    <Input
                      id="googleMapLink"
                      type="url"
                      aria-invalid={!!errors.googleMapLink}
                      {...register("googleMapLink")}
                    />
                    <FieldError>{errors.googleMapLink?.message}</FieldError>
                  </Field>
                  <Field data-invalid={!!errors.amenities}>
                    <FieldLabel htmlFor="amenities">
                      Amenities (optional)
                    </FieldLabel>
                    <Input
                      id="amenities"
                      {...register("amenities")}
                      aria-invalid={!!errors.amenities}
                    />
                    <FieldDescription>
                      Comma-separated, up to 30 amenities. Existing amenities
                      are retained unless you edit this field.
                    </FieldDescription>
                    <FieldError>{errors.amenities?.message}</FieldError>
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Property photos</CardTitle>
                <CardDescription>
                  Keep at least one and at most four photos. Order: retained
                  photos, then new uploads.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="photo-editor">
                  {retained.map((url, index) => (
                    <div className="photo-edit-item" key={url}>
                      <PropertyImage
                        src={url}
                        alt={`Retained property photo ${index + 1}`}
                      />
                      <span>Retained</span>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        aria-label={`Remove retained photo ${index + 1}`}
                        onClick={() =>
                          setRetained((previous) =>
                            previous.filter((value) => value !== url),
                          )
                        }
                      >
                        <X />
                      </Button>
                    </div>
                  ))}
                  {files.map((file, index) => (
                    <NewPhoto
                      key={`${file.name}-${file.lastModified}-${index}`}
                      file={file}
                      index={index}
                      remove={() =>
                        setFiles((previous) =>
                          previous.filter((_, i) => i !== index),
                        )
                      }
                    />
                  ))}
                </div>
                <Field className="mt-5">
                  <FieldLabel htmlFor="photos">
                    <Upload className="size-4" />
                    Add photos ({retained.length + files.length}/4)
                  </FieldLabel>
                  <Input
                    id="photos"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    onChange={addPhotos}
                    disabled={
                      retained.length + files.length >= 4 || mutation.isPending
                    }
                  />
                  <FieldDescription>
                    Up to 5 MB each, 16 MP and 8000px per side; single-frame
                    images only. The server decodes every upload before storage.
                  </FieldDescription>
                </Field>
              </CardContent>
            </Card>
          </div>
          <aside className="form-save-panel">
            <Card>
              <CardHeader>
                <CardTitle>
                  {record ? "Save this revision" : "Publish your listing"}
                </CardTitle>
                <CardDescription>
                  {record
                    ? `Editing displayed version ${record.version}. The listing state stays ${record.status}.`
                    : "Admin-created listings are published directly after validation."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-5 text-sm leading-6 text-muted-foreground">
                  Changing the market state away from available cancels open
                  viewing requests. Notifications are best-effort. Archived
                  records cannot be edited.
                </p>
                {error ? (
                  <div className="mb-5">
                    <ErrorState
                      error={error}
                      retryLabel="Review latest revision"
                      retry={
                        error instanceof ApiError && error.status === 409
                          ? () => setReload(true)
                          : undefined
                      }
                    />
                  </div>
                ) : null}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={mutation.isPending}
                >
                  <Save data-icon="inline-start" />
                  {mutation.isPending
                    ? "Saving…"
                    : record
                      ? "Save changes"
                      : "Create property"}
                </Button>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  {dirty ? "You have unsaved changes." : "No unsaved changes."}{" "}
                  Failed requests keep your form and photos for review. If a
                  save times out, inspect the catalog before creating another
                  record.
                </p>
              </CardContent>
            </Card>
          </aside>
        </fieldset>
      </form>
      <ConfirmAction
        open={blocker.state === "blocked"}
        onOpenChange={(open) => {
          if (!open && blocker.state === "blocked") blocker.reset();
        }}
        title="Leave without saving?"
        description="Your unsaved text and photo selections will be discarded."
        label="Leave page"
        busy={false}
        onConfirm={() => {
          if (blocker.state === "blocked") blocker.proceed();
        }}
      />
      <ConfirmAction
        open={reload}
        onOpenChange={setReload}
        title="Load the latest revision?"
        description="Your unsaved changes will be discarded. Review the refreshed listing before saving again."
        label="Reload latest"
        busy={false}
        onConfirm={() => {
          saved.current = true;
          window.location.reload();
        }}
      />
    </div>
  );
}
function NewPhoto({
  file,
  index,
  remove,
}: {
  file: File;
  index: number;
  remove: () => void;
}) {
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const value = URL.createObjectURL(file);
    if (image.current) image.current.src = value;
    return () => URL.revokeObjectURL(value);
  }, [file]);
  return (
    <div className="photo-edit-item">
      <img ref={image} alt={`New property photo ${index + 1}`} />
      <span>New upload</span>
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        aria-label={`Remove new photo ${index + 1}`}
        onClick={remove}
      >
        <X />
      </Button>
    </div>
  );
}
