import { StateBadge } from "@/components/feedback/status-badge";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  AIModelDTO,
  AIModelConfig,
  AIProfile,
  AIModelTest,
} from "@buildestate/contracts";
import { api } from "@/lib/api";
import {
  modelEligible,
  changeModel,
  reorderModels,
} from "@/features/management/commands";
import {
  PageHeading,
  CommandDialog,
  invalidateManagement,
} from "@/features/management/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  ErrorState,
  PageLoading,
  EmptyResults,
} from "@/components/feedback/states";
type Profile = {
  label: string;
  modelId?: string;
  options: string[];
  maxTokens: number;
};
type Catalog = {
  models: AIModelDTO[];
  profiles: Record<AIProfile, Profile>;
  migrationRequired: boolean;
  unsupported: { _id: string; slug: string }[];
};
type Action = {
  title: string;
  description: string;
  label?: string;
  execute: () => Promise<unknown>;
};
export default function Models() {
  const query = useQuery({
    queryKey: ["ai-models", "catalog"],
    queryFn: ({ signal }) =>
      api.request<Catalog>("/api/admin/ai-models", { signal }),
  });
  const [editing, setEditing] = useState<{ model?: AIModelDTO } | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [removing, setRemoving] = useState<{
    model: AIModelDTO;
    remove: boolean;
  } | null>(null);
  if (query.isPending) return <PageLoading />;
  if (query.isError)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  const { models, profiles, migrationRequired } = query.data;
  function simple(model: AIModelDTO, values: object, title: string) {
    setAction({
      title,
      description: `Update ${model.name} using displayed version ${model.version}. Serving eligibility is rechecked by the server.`,
      execute: () => changeModel(model, values),
    });
  }
  function move(index: number, direction: number) {
    const ordered = [...models];
    [ordered[index], ordered[index + direction]] = [
      ordered[index + direction],
      ordered[index],
    ];
    setAction({
      title: "Update fallback order?",
      description:
        "Save the full catalog order and its displayed version map. The selected/default model still runs first; other eligible models follow this order.",
      execute: () => reorderModels(ordered),
    });
  }
  function test(model: AIModelDTO, mode: "application" | "connection") {
    setAction({
      title: `Test ${model.name}?`,
      label: "Run exact-model test",
      description: `This consumes NVIDIA quota using one fixed synthetic prompt, with no fallback. A connection check does not grant serving eligibility. A failed application test can remove this configuration from the eligible list until it passes again. Test mode: ${mode}.`,
      execute: async () => {
        const data = await api.request<{ result: AIModelTest }>(
          `/api/admin/ai-models/${model._id}/test`,
          {
            method: "POST",
            body: JSON.stringify({ expectedVersion: model.version, mode }),
            signal: AbortSignal.timeout(45000),
          },
        );
        await invalidateManagement();
        if (!data.result.passed)
          throw new Error(
            `Model test failed: ${data.result.code}. ${data.result.latencyMs} ms. This is a failed check, not permission to enable.`,
          );
        return data;
      },
    });
  }
  return (
    <div className="management-page">
      <PageHeading
        title="NVIDIA models"
        description="Configure, test and order the models used for property analysis. NVIDIA is the only inference provider."
      >
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            Refresh
          </Button>
          <Button disabled={migrationRequired} onClick={() => setEditing({})}>
            Add model
          </Button>
        </div>
      </PageHeading>
      {migrationRequired ? (
        <Alert variant="destructive">
          <AlertTitle>Catalog migration required</AlertTitle>
          <AlertDescription>
            {query.data.unsupported.length} unsupported legacy configuration(s)
            are excluded from serving. Catalog writes are disabled here until
            the reviewed migration is applied by the release workflow. This
            screen cannot apply migrations or seed models.
          </AlertDescription>
        </Alert>
      ) : null}
      {!models.some((model) => model.isActive && modelEligible(model)) ? (
        <Alert>
          <AlertTitle>No eligible active model</AlertTitle>
          <AlertDescription>
            AI search may be unavailable. Save a disabled model, run its
            application test and explicitly enable it. API key availability is
            checked by the backend.
          </AlertDescription>
        </Alert>
      ) : null}
      {models.length ? (
        models.map((model, index) => (
          <Card key={model._id}>
            <CardHeader>
              <div className="card-heading-row">
                <div>
                  <CardTitle>
                    {index + 1}. {model.name}
                  </CardTitle>
                  <CardDescription>
                    {model.modelId} ·{" "}
                    {profiles[model.profile]?.label || model.profile}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <StateBadge status={model.isActive ? "enabled" : "disabled"} />
                  {model.isDefault ? <Badge>Default</Badge> : null}
                  <StateBadge status={modelEligible(model) ? "verified" : "pending"} label={modelEligible(model) ? "Application verified" : "Needs application test"} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {model.description || "No description."}
              </p>
              <dl className="model-facts">
                <div>
                  <dt>Output limit</dt>
                  <dd>{model.config.maxTokens} tokens</dd>
                </div>
                <div>
                  <dt>Timeout</dt>
                  <dd>{model.config.timeoutMs / 1000}s</dd>
                </div>
                <div>
                  <dt>Version</dt>
                  <dd>{model.version}</dd>
                </div>
                <div>
                  <dt>Latest application check</dt>
                  <dd>
                    {model.lastTest
                      ? `${model.lastTest.passed ? "Passed" : "Failed"} · ${model.lastTest.code} · ${model.lastTest.latencyMs} ms · ${new Date(model.lastTest.testedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`
                      : "Not tested"}
                  </dd>
                </div>
                <div>
                  <dt>Latest connection check</dt>
                  <dd>
                    {model.lastConnectionTest
                      ? `${model.lastConnectionTest.passed ? "Passed" : "Failed"} · ${model.lastConnectionTest.latencyMs} ms`
                      : "Not tested"}
                  </dd>
                </div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={migrationRequired || model.isActive}
                  title={
                    model.isActive
                      ? "Disable before editing serving settings."
                      : undefined
                  }
                  onClick={() => setEditing({ model })}
                >
                  Edit configuration
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={migrationRequired}
                  onClick={() => test(model, "connection")}
                >
                  Test connection
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={migrationRequired}
                  onClick={() => test(model, "application")}
                >
                  Test application JSON
                </Button>
                {model.isActive ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={migrationRequired}
                    onClick={() =>
                      model.isDefault
                        ? setRemoving({ model, remove: false })
                        : simple(model, { isActive: false }, "Disable model?")
                    }
                  >
                    Disable
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={migrationRequired || !modelEligible(model)}
                    onClick={() =>
                      simple(model, { isActive: true }, "Enable tested model?")
                    }
                  >
                    Enable
                  </Button>
                )}
                {model.isActive && !model.isDefault ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={migrationRequired || !modelEligible(model)}
                    onClick={() =>
                      simple(model, { isDefault: true }, "Make default?")
                    }
                  >
                    Make default
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={migrationRequired || index === 0}
                  onClick={() => move(index, -1)}
                >
                  Move up
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={migrationRequired || index === models.length - 1}
                  onClick={() => move(index, 1)}
                >
                  Move down
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={migrationRequired}
                  onClick={() => setRemoving({ model, remove: true })}
                >
                  Remove
                </Button>
              </div>
              <p className="mt-4 break-all text-xs text-muted-foreground">
                Configuration fingerprint: {model.configuration}. Saved limits
                cap each request; successful tests do not guarantee future model
                availability or ranking quality.
              </p>
            </CardContent>
          </Card>
        ))
      ) : (
        <EmptyResults
          title="No NVIDIA models configured"
          description="Add a model disabled, then test its exact saved configuration. Models are never added automatically."
        />
      )}
      {editing ? (
        <ModelEditor
          model={editing.model}
          profiles={profiles}
          close={() => setEditing(null)}
        />
      ) : null}
      {action ? (
        <CommandDialog {...action} close={() => setAction(null)} />
      ) : null}
      {removing ? (
        <RemoveModel
          model={removing.model}
          remove={removing.remove}
          candidates={models.filter(
            (row) =>
              row._id !== removing.model._id &&
              row.isActive &&
              modelEligible(row),
          )}
          close={() => setRemoving(null)}
        />
      ) : null}
    </div>
  );
}
function RemoveModel({
  model,
  remove,
  candidates,
  close,
}: {
  model: AIModelDTO;
  remove: boolean;
  candidates: AIModelDTO[];
  close: () => void;
}) {
  const [replacement, setReplacement] = useState("");
  return (
    <CommandDialog
      title={`${remove ? "Remove" : "Disable"} ${model.name}?`}
      description={
        model.isDefault
          ? "The current default needs an enabled, application-verified replacement, or an explicit decision to turn off every AI search model. Audit history is retained."
          : "Remove or disable the serving entry. Audit history is retained; it is never reinserted by a public request."
      }
      label={remove ? "Remove model" : "Disable model"}
      close={close}
      execute={() => {
        if (model.isDefault && !replacement)
          return Promise.reject(
            new Error("Choose a replacement or explicitly turn off AI."),
          );
        const next = candidates.find((row) => row._id === replacement);
        return changeModel(
          model,
          {
            ...(!remove ? { isActive: false } : {}),
            ...(model.isDefault
              ? replacement === "off"
                ? { turnOffAI: true }
                : {
                    replacementId: next?._id,
                    replacementVersion: next?.version,
                  }
              : {}),
          },
          remove,
        );
      }}
    >
      {model.isDefault ? (
        <Field>
          <FieldLabel htmlFor="replacement">Replacement decision</FieldLabel>
          <NativeSelect
            id="replacement"
            value={replacement}
            onChange={(event) => setReplacement(event.target.value)}
          >
            <NativeSelectOption value="">Choose explicitly</NativeSelectOption>
            {candidates.map((row) => (
              <NativeSelectOption key={row._id} value={row._id}>
                {row.name}
              </NativeSelectOption>
            ))}
            <NativeSelectOption value="off">
              Turn off all AI search models
            </NativeSelectOption>
          </NativeSelect>
        </Field>
      ) : null}
    </CommandDialog>
  );
}
const defaults = {
  maxTokens: 8192,
  timeoutMs: 60000,
  temperature: 0.5,
  topP: 1,
};
function ModelEditor({
  model,
  profiles,
  close,
}: {
  model?: AIModelDTO;
  profiles: Catalog["profiles"];
  close: () => void;
}) {
  const [name, setName] = useState(model?.name || "");
  const [slug, setSlug] = useState(model?.slug || "");
  const [modelId, setModelId] = useState(model?.modelId || "");
  const [profile, setProfile] = useState<AIProfile>(
    model?.profile || "text-basic",
  );
  const [badge, setBadge] = useState(model?.badge || "");
  const [description, setDescription] = useState(model?.description || "");
  const [config, setConfig] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(model?.config || defaults).map(([key, value]) => [
        key,
        String(value),
      ]),
    ),
  );
  function changeProfile(value: AIProfile) {
    setProfile(value);
    setConfig(
      Object.fromEntries(
        Object.entries(defaults).map(([key, v]) => [key, String(v)]),
      ),
    );
    if (profiles[value].modelId) setModelId(profiles[value].modelId!);
  }
  return (
    <CommandDialog
      title={model ? "Edit disabled model" : "Add NVIDIA model"}
      description="Serving changes invalidate application-test evidence. Save disabled and test the exact saved configuration before enabling. Keys, upstream URLs, raw payloads and unsupported options are never editable here."
      label="Save disabled configuration"
      close={close}
      execute={() => {
        if (
          !name.trim() ||
          !/^[a-z0-9-]+$/.test(slug) ||
          !/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(modelId)
        )
          return Promise.reject(
            new Error(
              "Enter a name, lowercase-hyphen slug and exact developer/model ID.",
            ),
          );
        if (
          Object.keys(defaults).some(
            (key) =>
              config[key] === "" ||
              config[key] === undefined ||
              !Number.isFinite(Number(config[key])),
          )
        )
          return Promise.reject(
            new Error(
              "Fill all four basic request settings with valid numbers.",
            ),
          );
        const configuration = Object.fromEntries(
          Object.entries(config)
            .filter(([, value]) => value !== "")
            .map(([key, value]) => [
              key,
              key === "enableThinking"
                ? value === "true"
                : key === "reasoningEffort"
                  ? value
                  : Number(value),
            ]),
        ) as unknown as AIModelConfig;
        const values = {
          name: name.trim(),
          slug,
          modelId,
          profile,
          badge,
          description,
          config: configuration,
          provider: "nvidia",
        };
        return model
          ? changeModel(model, values)
          : api.request("/api/admin/ai-models", {
              method: "POST",
              body: JSON.stringify(values),
            });
      }}
    >
      <FieldGroup className="grid grid-cols-2 gap-4">
        {[
          { label: "Name", value: name, set: setName },
          { label: "Slug", value: slug, set: setSlug },
          { label: "Badge", value: badge, set: setBadge },
        ].map((field) => (
          <Field key={field.label}>
            <FieldLabel htmlFor={`model-${field.label}`}>
              {field.label}
            </FieldLabel>
            <Input
              id={`model-${field.label}`}
              maxLength={200}
              value={field.value}
              onChange={(event) => field.set(event.target.value)}
            />
          </Field>
        ))}
        <Field>
          <FieldLabel htmlFor="profile">Profile</FieldLabel>
          <NativeSelect
            id="profile"
            value={profile}
            onChange={(event) => changeProfile(event.target.value as AIProfile)}
          >
            {Object.entries(profiles).map(([key, spec]) => (
              <NativeSelectOption key={key} value={key}>
                {spec.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field className="col-span-2">
          <FieldLabel htmlFor="modelId">Exact NVIDIA model ID</FieldLabel>
          <Input
            id="modelId"
            maxLength={200}
            value={modelId}
            onChange={(event) => setModelId(event.target.value)}
          />
        </Field>
        {[
          "maxTokens",
          "timeoutMs",
          "temperature",
          "topP",
          ...profiles[profile].options,
        ].map((key) => (
          <Field key={key}>
            <FieldLabel htmlFor={`config-${key}`}>{key}</FieldLabel>
            {key === "enableThinking" || key === "reasoningEffort" ? (
              <NativeSelect
                id={`config-${key}`}
                value={config[key] || ""}
                onChange={(event) =>
                  setConfig((previous) => ({
                    ...previous,
                    [key]: event.target.value,
                  }))
                }
              >
                <NativeSelectOption value="">
                  Use model default
                </NativeSelectOption>
                {(key === "enableThinking" ? ["true", "false"] : ["high"]).map(
                  (value) => (
                    <NativeSelectOption key={value} value={value}>
                      {value}
                    </NativeSelectOption>
                  ),
                )}
              </NativeSelect>
            ) : (
              <Input
                id={`config-${key}`}
                type="number"
                step={
                  [
                    "temperature",
                    "topP",
                    "frequencyPenalty",
                    "presencePenalty",
                  ].includes(key)
                    ? 0.01
                    : 1
                }
                value={config[key] || ""}
                onChange={(event) =>
                  setConfig((previous) => ({
                    ...previous,
                    [key]: event.target.value,
                  }))
                }
              />
            )}
            {key === "maxTokens" ? (
              <FieldDescription>
                Profile maximum: {profiles[profile].maxTokens}.
              </FieldDescription>
            ) : null}
          </Field>
        ))}
        <Field className="col-span-2">
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            maxLength={2000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
      </FieldGroup>
    </CommandDialog>
  );
}
