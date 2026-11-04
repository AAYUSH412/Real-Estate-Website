import { useState } from "react";
import {
  Building2,
  ChevronsUpDown,
  LayoutGrid,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useSession } from "@/features/auth/session";
import { ThemeToggle } from "@/app/theme";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ErrorState } from "@/components/feedback/states";
function Navigation() {
  const { state, logout } = useSession();
  const { setOpenMobile, isMobile } = useSidebar();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function signOut() {
    setBusy(true);
    setError(null);
    try {
      await logout();
      toast.success("Signed out");
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="BuildEstate">
              <Link to="/workspace" onClick={() => setOpenMobile(false)}>
                <span className="brand-mark">
                  <Building2 />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="font-semibold tracking-tight">
                    BuildEstate
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Administration
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive tooltip="Workspace">
                  <Link
                    to="/workspace"
                    onClick={() => setOpenMobile(false)}
                    aria-current="page"
                  >
                    <LayoutGrid />
                    <span>Workspace</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {error ? (
          <ErrorState error={error} retry={() => void signOut()} />
        ) : null}
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  disabled={busy}
                  tooltip="Account menu"
                  aria-label="Account menu"
                >
                  <span className="account-avatar">
                    <ShieldCheck />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col text-left">
                    <span className="font-medium">Administrator</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {state.user?.email}
                    </span>
                  </span>
                  <ChevronsUpDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side={isMobile ? "bottom" : "right"}
                align="end"
                className="w-64"
              >
                <DropdownMenuLabel className="break-all">
                  {state.user?.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    disabled={busy}
                    onSelect={() => void signOut()}
                  >
                    <LogOut />
                    {busy ? "Signing out…" : "Sign out"}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
export default function Shell() {
  const location = useLocation();
  const isWorkspace = location.pathname === "/workspace";
  return (
    <SidebarProvider>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Navigation />
      <SidebarInset>
        <header className="shell-header">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger aria-label="Toggle navigation" />
            <Separator orientation="vertical" className="h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                {!isWorkspace ? (
                  <>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link to="/workspace">Workspace</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                  </>
                ) : null}
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {isWorkspace ? "Workspace" : "Page not found"}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <ThemeToggle />
        </header>
        <main id="main-content" tabIndex={-1} className="shell-main">
          <Outlet />
        </main>
        <footer className="shell-footer">
          <span>BuildEstate administration</span>
          <span>Asia/Kolkata</span>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
export function NotFound() {
  return (
    <section className="flex flex-col items-start gap-4 py-20">
      <p className="eyebrow">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">
        This page isn’t available
      </h1>
      <p className="text-muted-foreground">
        Return to your workspace to continue.
      </p>
      <Button asChild>
        <Link to="/workspace">Go to workspace</Link>
      </Button>
    </section>
  );
}
