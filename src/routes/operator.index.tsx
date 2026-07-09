import { createFileRoute, Link, useNavigate, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Beaker, ShieldCheck, LogOut, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-session";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/operator")({
  component: OperatorHome,
});

type OpRecipe = { id: string; name: string; base_input_label: string; base_unit: string };

function OperatorHome() {
  const { session, profile, loading } = useProfile();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  const { data: recipes, isLoading } = useQuery({
    queryKey: ["op-recipes"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("operator_list_recipes");
      if (error) throw error;
      return (data ?? []) as OpRecipe[];
    },
  });

  const filtered = useMemo(() => {
    if (!recipes) return [];
    const s = q.trim().toLowerCase();
    return s ? recipes.filter((r) => r.name.toLowerCase().includes(s)) : recipes;
  }, [recipes, q]);

  if (loading || !session) {
    return <div className="grid min-h-screen place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (profile?.role === "admin") return <Navigate to="/admin/recipes" />;

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">RatioVault</div>
              <div className="text-[11px] text-muted-foreground">Ciao {profile?.full_name ?? profile?.email}</div>
            </div>
          </div>
          <button onClick={signOut} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground">
            <LogOut className="h-4 w-4" /> Esci
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-2xl font-semibold tracking-tight">Scegli la ricetta</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tocca la ricetta che stai per preparare.</p>

        <div className="relative mt-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-12 pl-9 text-base"
            placeholder="Cerca ricetta…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="mt-8 grid place-items-center gap-2 rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <Beaker className="h-8 w-8 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">Nessuna ricetta disponibile.</div>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {filtered.map((r) => (
              <Link
                key={r.id}
                to="/operator/recipe/$id"
                params={{ id: r.id }}
                className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-soft transition active:scale-[0.99] hover:border-primary/40 hover:shadow-elegant"
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-accent-foreground">
                    <Beaker className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg font-semibold leading-tight">{r.name}</div>
                    <div className="mt-1 truncate text-sm text-muted-foreground">{r.base_input_label}</div>
                  </div>
                </div>
                <div className="mt-6 text-right text-xs font-medium uppercase tracking-wider text-primary">
                  Apri calcolatore →
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
