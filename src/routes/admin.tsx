import { createFileRoute, Link, useNavigate, useRouterState, Outlet, Navigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ShieldCheck, Beaker, Users, ClipboardList, LogOut, Loader2, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

const nav = [
  { to: "/admin/recipes", label: "Ricette", icon: Beaker },
  { to: "/admin/calculator", label: "Calcolatore", icon: Calculator },
  { to: "/admin/collaborators", label: "Collaboratori", icon: Users },
  { to: "/admin/logs", label: "Registro attività", icon: ClipboardList },
] as const;

function AdminLayout() {
  const { session, profile, loading } = useProfile();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (profile?.role === "operator") return <Navigate to="/operator" />;

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground md:flex">
        <div>
          <Link to="/" className="mb-8 flex items-center gap-2 px-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">RatioVault</div>
              <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">Admin</div>
            </div>
          </Link>
          <nav className="space-y-1">
            {nav.map((n) => {
              const active = pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="space-y-3">
          <div className="rounded-lg bg-sidebar-accent/60 px-3 py-2 text-xs">
            <div className="font-medium text-sidebar-accent-foreground">{profile?.full_name ?? profile?.email}</div>
            <div className="text-sidebar-foreground/60">{profile?.email}</div>
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
          >
            <LogOut className="h-4 w-4" />
            Esci
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex-1">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="text-sm font-semibold">RatioVault Admin</div>
          </div>
          <button onClick={signOut} className="text-xs text-muted-foreground">
            Esci
          </button>
        </div>
        <div className="flex overflow-x-auto border-b border-border bg-background md:hidden">
          {nav.map((n) => {
            const active = pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground",
                )}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </div>
        <main className="mx-auto max-w-6xl p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
