import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Calculator, Loader2, CheckCircle2, Search, Beaker, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/calculator")({
  component: AdminCalculator,
});

type OpRecipe = { id: string; name: string; base_input_label: string; base_unit: string };
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
};

function AdminCalculator() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [value, setValue] = useState("");
  const [result, setResult] = useState<CalcResult | null>(null);

  const { data: recipes, isLoading } = useQuery({
    queryKey: ["admin-calc-recipes"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("operator_list_recipes");
      if (error) throw error;
      return (data ?? []) as OpRecipe[];
    },
  });

  const { data: recipe } = useQuery({
    queryKey: ["admin-calc-recipe", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("operator_get_recipe", { p_recipe_id: selectedId });
      if (error) throw error;
      return data as unknown as RecipeInfo;
    },
  });

  const filtered = useMemo(() => {
    if (!recipes) return [];
    const s = q.trim().toLowerCase();
    return s ? recipes.filter((r) => r.name.toLowerCase().includes(s)) : recipes;
  }, [recipes, q]);

  const calc = useMutation({
    mutationFn: async () => {
      const num = Number(value.replace(",", "."));
      if (!num || num <= 0) throw new Error("Inserisci una quantità valida");
      const { data, error } = await supabase.rpc("secure_calculate_and_log", {
        p_recipe_id: selectedId!,
        p_base_value: num,
      });
      if (error) throw error;
      return data as unknown as CalcResult;
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success("Dosi calcolate e salvate nel registro");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reset = () => {
    setSelectedId(null);
    setValue("");
    setResult(null);
  };

  if (!selectedId) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calcolatore</h1>
        <p className="mt-1 text-sm text-muted-foreground">Seleziona una ricetta per calcolare le dosi.</p>

        <div className="relative mt-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-11 pl-9" placeholder="Cerca ricetta…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="mt-8 grid place-items-center gap-2 rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <Beaker className="h-8 w-8 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">Nessuna ricetta disponibile. Creane una nella sezione Ricette.</div>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-5 text-left shadow-soft transition hover:border-primary/40 hover:shadow-elegant"
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                    <Beaker className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-base font-semibold leading-tight">{r.name}</div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">{r.base_input_label}</div>
                  </div>
                </div>
                <div className="mt-4 text-right text-xs font-medium uppercase tracking-wider text-primary">
                  Calcola →
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!recipe) {
    return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button onClick={reset} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Torna alle ricette
      </button>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Ricetta</div>
        <div className="text-xl font-semibold">{recipe.name}</div>

        <label className="mt-6 block text-base font-medium text-foreground">
          Quanti <span className="text-primary">{recipe.base_unit}</span> di{" "}
          <span className="text-primary">{recipe.base_input_label}</span> vuoi calcolare?
        </label>
        <div className="mt-4 flex items-baseline gap-3">
          <Input
            type="text"
            inputMode="decimal"
            autoFocus
            value={value}
            onChange={(e) => { setValue(e.target.value); setResult(null); }}
            placeholder="0"
            className="h-20 flex-1 border-2 text-center text-4xl font-semibold tracking-tight"
          />
          <div className="text-xl font-medium text-muted-foreground">{recipe.base_unit}</div>
        </div>

        <Button
          onClick={() => calc.mutate()}
          disabled={calc.isPending || !value}
          className="mt-6 h-14 w-full gap-2 text-base font-semibold shadow-elegant"
        >
          {calc.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Calculator className="h-5 w-5" />}
          Calcola Dosi
        </Button>
      </div>

      {result && (
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" /> Calcolo salvato nel registro
          </div>
          <div className="space-y-3">
            {result.ingredients.map((ing, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 shadow-soft">
                <div className="text-lg font-medium">{ing.name}</div>
                <div className="flex items-baseline gap-1">
                  <div className="text-3xl font-bold tabular-nums text-primary">{ing.amount}</div>
                  <div className="text-base font-medium text-muted-foreground">{ing.unit}</div>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="mt-6 h-12 w-full" onClick={() => { setValue(""); setResult(null); }}>
            Nuovo calcolo
          </Button>
        </div>
      )}
    </div>
  );
}
