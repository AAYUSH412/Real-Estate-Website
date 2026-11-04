import { useState } from "react";
import { useForm } from "react-hook-form";
import { email as contractEmail } from "@buildestate/contracts";
import { Eye, EyeOff, ArrowRight, LoaderCircle, Building2 } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useSession } from "./session";
import { ThemeToggle } from "@/app/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "@/components/ui/input-group";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import {
  ErrorState,
  RequestError,
  PageLoading,
} from "@/components/feedback/states";
type Values = { email: string; password: string };
export default function Login() {
  const { state, login, verify } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ defaultValues: { email: "", password: "" } });
  if (state.status === "loading")
    return <PageLoading label="Checking your session" />;
  if (state.status === "authenticated")
    return <Navigate to="/workspace" replace />;
  if (state.status === "unavailable")
    return (
      <main className="mx-auto flex min-h-svh max-w-lg items-center p-6">
        <RequestError
          message="The session service is temporarily unavailable. Your refresh cookie has been preserved."
          retry={() => void verify()}
        />
      </main>
    );
  async function submit(values: Values) {
    setError(null);
    try {
      await login(values.email.trim(), values.password);
      const from = location.state?.from;
      navigate(
        typeof from === "string" &&
          from.startsWith("/") &&
          !from.startsWith("//") &&
          from !== "/login"
          ? from
          : "/workspace",
        { replace: true },
      );
    } catch (failure) {
      setError(failure);
    }
  }
  return (
    <main className="login-layout">
      <section className="login-story" aria-label="BuildEstate administration">
        <a href="/" className="brand">
          <span className="brand-mark">
            <Building2 />
          </span>
          BuildEstate<span className="brand-caption">Administration</span>
        </a>
        <div className="login-statement">
          <p className="eyebrow">A considered place to work</p>
          <h1>
            Good properties.
            <br />
            Thoughtful management.
          </h1>
          <p>
            One workspace for the details that matter — your listings, viewing
            requests and conversations.
          </p>
          <div className="architectural-mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
        <p className="login-footnote">BuildEstate · Property administration</p>
      </section>
      <section className="login-form-panel">
        <div className="login-theme">
          <ThemeToggle />
        </div>
        <div className="login-form">
          <span className="mobile-brand">
            <Building2 /> BuildEstate
          </span>
          <p className="eyebrow">Welcome back</p>
          <h2>Sign in to your workspace</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Use your administrator account to continue.
          </p>
          <form onSubmit={handleSubmit(submit)} noValidate className="mt-8">
            <FieldGroup>
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">Email address</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  {...register("email", {
                    validate: (value) => {
                      try {
                        contractEmail(value);
                        return true;
                      } catch {
                        return "Enter a valid email address.";
                      }
                    },
                  })}
                />
                <FieldError id="email-error">
                  {errors.email?.message}
                </FieldError>
              </Field>
              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="password"
                    type={visible ? "text" : "password"}
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                    aria-describedby={
                      errors.password ? "password-error" : undefined
                    }
                    {...register("password", {
                      required: "Enter your password.",
                    })}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      type="button"
                      size="icon-xs"
                      aria-label={visible ? "Hide password" : "Show password"}
                      aria-pressed={visible}
                      onClick={() => setVisible(!visible)}
                    >
                      {visible ? <EyeOff /> : <Eye />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                <FieldError id="password-error">
                  {errors.password?.message}
                </FieldError>
              </Field>
              {error ? <ErrorState error={error} /> : null}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <LoaderCircle
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : null}
                {isSubmitting ? "Signing in…" : "Sign in"}
                {!isSubmitting ? <ArrowRight data-icon="inline-end" /> : null}
              </Button>
            </FieldGroup>
          </form>
          <p className="mt-6 text-xs leading-5 text-muted-foreground">
            Administrator access only. Your account permissions are verified
            when you sign in.
          </p>
        </div>
        <p className="login-form-footer">
          A clearer view of your property workspace.
        </p>
      </section>
    </main>
  );
}
