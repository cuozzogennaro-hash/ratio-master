import { createFileRoute, Link, useNavigate, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Beaker, ShieldCheck, LogOut, Loader2, Search } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { RecipeImage } from "@/components/RecipeImage";
import { useProfile } from "@/hooks/use-session";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/operator/")({
  component: OperatorHome,
});

// route path is /operator (index of layout)

type OpRecipe = { id: string; name: string; base_input_label: string; base_unit: string; image_url?: string | null; ingredients?: any };

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
      // Se offline, carica dalla cache locale
      if (typeof window !== "undefined" && !navigator.onLine) {
        const cached = localStorage.getItem("cached-recipes-detailed");
        if (cached) {
          try {
            return JSON.parse(cached) as OpRecipe[];
          } catch (e) {
            console.error("Errore parsing cache local", e);
          }
        }
        throw new Error("Sei offline e non ci sono ricette salvate in cache.");
      }

      try {
        // Tenta di recuperare ricette dettagliate (con ingredienti) per l'offline caching
        const { data, error } = await (supabase.rpc as any)("operator_get_recipes_for_offline");
        if (error) throw error;
        if (data) {
          localStorage.setItem("cached-recipes-detailed", JSON.stringify(data));
          return data as OpRecipe[];
        }
      } catch (err) {
        console.warn("Offline RPC non configurata, eseguo fallback a rpc base:", err);
      }

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
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-4">
          <div className="flex items-center gap-2">
            <Logo className="h-9 w-9 rounded-lg" />
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
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {filtered.map((r) => (
              <Link
                key={r.id}
                to="/operator/recipe/$id"
                params={{ id: r.id }}
                className="group overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition active:scale-[0.99] hover:border-primary/40 hover:shadow-elegant flex flex-col justify-between"
              >
                <div>
                  {r.image_url ? (
                    <RecipeImage
                      src={r.image_url}
                      alt={r.name}
                      className="h-32 w-full object-cover animate-fade-in"
                      fallbackClassName="h-32 w-full bg-gradient-to-br from-accent/50 to-primary/10 grid place-items-center text-primary/40"
                    />
                  ) : (
                    <div className="h-32 w-full bg-gradient-to-br from-accent/50 to-primary/10 grid place-items-center text-primary/40">
                      <Beaker className="h-10 w-10 animate-pulse" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="text-lg font-semibold leading-tight break-words text-foreground">{r.name}</div>
                    <div className="mt-1.5 truncate text-sm text-muted-foreground">
                      Base: {r.base_input_label} ({r.base_unit})
                    </div>
                  </div>
                </div>
                <div className="px-5 pb-5 pt-0 text-right text-xs font-semibold uppercase tracking-wider text-primary">
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
