import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Calculator, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/operator/recipe/$id")({
  component: OperatorRecipe,
});

type RecipeInfo = {
  id: string;
  name: string;
  base_input_label: string;
  base_unit: string;
  ingredient_count: number;
};

type CalcResult = {
  log_id: string;
  recipe_name: string;
  base_value: number;
  base_unit: string;
  ingredients: { name: string; amount: number; unit: string }[];
  isOffline?: boolean;
};

function OperatorRecipe() {
  const { id } = Route.useParams();
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [value, setValue] = useState<string>("");
  const [result, setResult] = useState<CalcResult | null>(null);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  // Keep screen awake while operator is in this route
  useEffect(() => {
    let awakeActive = false;

    const enableKeepAwake = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const { KeepAwake } = await import("@capacitor-community/keep-awake");
          await KeepAwake.keepAwake();
          awakeActive = true;
          console.log("[KeepAwake] Schermo bloccato attivo.");
        } catch (e) {
          console.error("[KeepAwake] Errore nell'attivazione:", e);
        }
      }
    };

    enableKeepAwake();

    return () => {
      if (awakeActive && Capacitor.isNativePlatform()) {
        import("@capacitor-community/keep-awake").then(({ KeepAwake }) => {
          KeepAwake.allowSleep()
            .then(() => console.log("[KeepAwake] Schermo sbloccato (sleep consentito)."))
            .catch((e) => console.error("[KeepAwake] Errore nella disattivazione:", e));
        });
      }
    };
  }, []);

  const { data: recipe, isLoading } = useQuery({
    queryKey: ["op-recipe", id],
    enabled: !!session,
    queryFn: async () => {
      // Se offline, carica i metadati della ricetta dalla cache locale
      if (typeof window !== "undefined" && !navigator.onLine) {
        const cached = localStorage.getItem("cached-recipes-detailed");
        if (cached) {
          try {
            const list = JSON.parse(cached) as any[];
            const found = list.find((r) => r.id === id);
            if (found) {
              return {
                id: found.id,
                name: found.name,
                base_input_label: found.base_input_label,
                base_unit: found.base_unit,
                ingredient_count: found.ingredients?.length ?? 0,
              } as RecipeInfo;
            }
          } catch (e) {
            console.error("Errore parsing cache offline", e);
          }
        }
        throw new Error("Ricetta non disponibile offline.");
      }

      const { data, error } = await supabase.rpc("operator_get_recipe", { p_recipe_id: id });
      if (error) throw error;
      return data as unknown as RecipeInfo;
    },
  });

  const calc = useMutation({
    mutationFn: async () => {
      const num = Number(value.replace(",", "."));
      if (!num || num <= 0) throw new Error("Inserisci una quantità valida");

      // Se offline, calcola localmente e accoda per il sync
      if (typeof window !== "undefined" && !navigator.onLine) {
        const cached = localStorage.getItem("cached-recipes-detailed");
        if (cached) {
          try {
            const list = JSON.parse(cached) as any[];
            const found = list.find((r) => r.id === id);
            if (found) {
              const localIngredients = (found.ingredients ?? []).map((ing: any) => ({
                name: ing.name,
                amount: Math.round(num * Number(ing.secret_multiplier) * 1000) / 1000,
                unit: ing.output_unit,
              }));

              const offlineResult: CalcResult = {
                log_id: `local_${Date.now()}`,
                recipe_name: found.name,
                base_value: num,
                base_unit: found.base_unit,
                ingredients: localIngredients,
                isOffline: true,
              };

              // Accoda il log per il sync futuro
              const queueKey = "offline-logs-queue";
              const existingQueue = JSON.parse(localStorage.getItem(queueKey) || "[]") as any[];
              existingQueue.push({
                recipe_id: id,
                base_value: num,
                timestamp: new Date().toISOString(),
                notes: `[Offline: ${new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" })}]`,
              });
              localStorage.setItem(queueKey, JSON.stringify(existingQueue));

              return offlineResult;
            }
          } catch (e) {
            console.error("Errore calcolo locale offline", e);
            throw new Error("Errore durante il calcolo offline.");
          }
        }
        throw new Error("Dati ricetta non trovati in cache per il calcolo offline.");
      }

      const { data, error } = await supabase.rpc("secure_calculate_and_log", {
        p_recipe_id: id,
        p_base_value: num,
      });
      if (error) throw error;
      return data as unknown as CalcResult;
    },
    onSuccess: (data) => {
      setResult(data);
      if (data.isOffline) {
        toast.warning("Calcolato offline! Salvato localmente in coda di sincronizzazione.");
      } else {
        toast.success("Dosi calcolate e salvate nel registro");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !recipe) {
    return <div className="grid min-h-screen place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-3">
          <Link to="/operator" className="rounded-md p-2 hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Ricetta</div>
            <div className="text-base font-semibold leading-tight">{recipe.name}</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <label className="block text-lg font-medium text-foreground">
            Quanti <span className="text-primary">{recipe.base_unit}</span> di{" "}
            <span className="text-primary">{recipe.base_input_label}</span> devi preparare?
          </label>
          <div className="mt-5 flex items-baseline gap-3">
            <Input
              type="text"
              inputMode="decimal"
              autoFocus
              value={value}
              onChange={(e) => { setValue(e.target.value); setResult(null); }}
              placeholder="0"
              className="h-24 flex-1 border-2 text-center text-5xl font-semibold tracking-tight"
            />
            <div className="text-xl font-medium text-muted-foreground">{recipe.base_unit}</div>
          </div>

          <Button
            onClick={() => calc.mutate()}
            disabled={calc.isPending || !value}
            className="mt-6 h-16 w-full gap-2 text-lg font-semibold shadow-elegant"
          >
            {calc.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Calculator className="h-5 w-5" />}
            Calcola Dosi
          </Button>
        </div>

        {result && (
          <div className="mt-6">
            <div className="mb-3 flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" />
              Pronto: pesa gli ingredienti qui sotto
            </div>
            <div className="space-y-3">
              {result.ingredients.map((ing, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 shadow-soft"
                >
                  <div className="text-lg font-medium">{ing.name}</div>
                  <div className="flex items-baseline gap-1">
                    <div className="text-3xl font-bold tabular-nums text-primary">{ing.amount}</div>
                    <div className="text-base font-medium text-muted-foreground">{ing.unit}</div>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="mt-6 h-12 w-full"
              onClick={() => { setValue(""); setResult(null); }}
            >
              Nuovo calcolo
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
