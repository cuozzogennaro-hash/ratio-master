import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Beaker, X, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/recipes")({
  component: RecipesPage,
});

type Ingredient = { name: string; secret_multiplier: number; output_unit: string };
type Recipe = {
  id: string;
  name: string;
  base_input_label: string;
  base_unit: string;
  ingredients: Ingredient[];
};

const emptyRecipe = (): Omit<Recipe, "id"> => ({
  name: "",
  base_input_label: "",
  base_unit: "kg",
  ingredients: [{ name: "", secret_multiplier: 0, output_unit: "kg" }],
});

function RecipesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [draft, setDraft] = useState<Omit<Recipe, "id">>(emptyRecipe());
  const [open, setOpen] = useState(false);

  const { data: recipes, isLoading } = useQuery({
    queryKey: ["recipes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("id, name, base_input_label, base_unit, ingredients")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Recipe[];
    },
  });

  const openNew = () => { setEditing(null); setDraft(emptyRecipe()); setOpen(true); };
  const openEdit = (r: Recipe) => {
    setEditing(r);
    setDraft({
      name: r.name,
      base_input_label: r.base_input_label,
      base_unit: r.base_unit,
      ingredients: r.ingredients?.length ? r.ingredients : [{ name: "", secret_multiplier: 0, output_unit: "kg" }],
    });
    setOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!draft.name.trim()) throw new Error("Nome ricetta obbligatorio");
      if (!draft.base_input_label.trim()) throw new Error("Etichetta base obbligatoria");
      const cleaned = draft.ingredients
        .map((i) => ({
          name: i.name.trim(),
          secret_multiplier: Number(String(i.secret_multiplier ?? "").replace(",", ".")),
          output_unit: i.output_unit.trim() || "g",
        }))
        .filter((i) => i.name && !Number.isNaN(i.secret_multiplier) && i.secret_multiplier > 0);
      if (cleaned.length === 0) throw new Error("Aggiungi almeno un ingrediente valido");

      const { data: sess } = await supabase.auth.getUser();
      const uid = sess.user?.id;
      if (!uid) throw new Error("Sessione scaduta");

      if (editing) {
        const { error } = await supabase
          .from("recipes")
          .update({ name: draft.name, base_input_label: draft.base_input_label, base_unit: draft.base_unit, ingredients: cleaned })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("recipes")
          .insert({ admin_id: uid, name: draft.name, base_input_label: draft.base_input_label, base_unit: draft.base_unit, ingredients: cleaned });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Ricetta aggiornata" : "Ricetta creata");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["recipes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recipes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Ricetta eliminata"); qc.invalidateQueries({ queryKey: ["recipes"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const setIngredient = (idx: number, patch: Partial<Ingredient>) => {
    setDraft((d) => ({
      ...d,
      ingredients: d.ingredients.map((i, k) => (k === idx ? { ...i, ...patch } : i)),
    }));
  };
  const addIngredient = () =>
    setDraft((d) => ({ ...d, ingredients: [...d.ingredients, { name: "", secret_multiplier: 0, output_unit: "g" }] }));
  const removeIngredient = (idx: number) =>
    setDraft((d) => ({ ...d, ingredients: d.ingredients.filter((_, k) => k !== idx) }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ricette segrete</h1>
          <p className="text-sm text-muted-foreground">
            Definisci una formula una volta: gli operatori vedranno solo le dosi calcolate.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Nuova ricetta</Button>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-24"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : !recipes || recipes.length === 0 ? (
        <div className="mt-8 grid place-items-center gap-3 rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Beaker className="h-8 w-8 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">Nessuna ricetta ancora creata.</div>
          <Button onClick={openNew} className="gap-2 mt-2"><Plus className="h-4 w-4" /> Crea la prima</Button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => (
            <div key={r.id} className="group rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:shadow-elegant">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-base font-semibold truncate">{r.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground truncate">{r.base_input_label}</div>
                </div>
                <Badge variant="secondary" className="shrink-0">{r.base_unit}</Badge>
              </div>
              <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                <div>{r.ingredients?.length ?? 0} ingredienti</div>
              </div>
              <div className="mt-4 flex justify-end gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Modifica
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="text-destructive">
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Elimina
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Eliminare “{r.name}”?</AlertDialogTitle>
                      <AlertDialogDescription>
                        La ricetta non sarà più disponibile per gli operatori. I log passati restano.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMut.mutate(r.id)}>Elimina</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifica ricetta" : "Nuova ricetta"}</DialogTitle>
            <DialogDescription>
              I moltiplicatori sono segreti aziendali e non vengono mai mostrati agli operatori.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nome ricetta</Label>
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Hamburger Special" />
              </div>
              <div className="space-y-1.5">
                <Label>Unità base</Label>
                <Input value={draft.base_unit} onChange={(e) => setDraft({ ...draft, base_unit: e.target.value })} placeholder="kg" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Etichetta del campo base</Label>
                <Input
                  value={draft.base_input_label}
                  onChange={(e) => setDraft({ ...draft, base_input_label: e.target.value })}
                  placeholder="Hamburger Totali da preparare"
                />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-medium">Ingredienti</div>
                <div className="text-xs text-muted-foreground">Moltiplicatore = dose_ingrediente / valore_base</div>
              </div>
              <div className="space-y-2">
                {draft.ingredients.map((ing, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <Input
                      className="col-span-5"
                      placeholder="Nome ingrediente"
                      value={ing.name}
                      onChange={(e) => setIngredient(idx, { name: e.target.value })}
                    />
                    <Input
                      className="col-span-3"
                      type="text"
                      inputMode="decimal"
                      placeholder="Molt. (es. 0,5)"
                      value={ing.secret_multiplier as unknown as string}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9.,]/g, "");
                        setIngredient(idx, { secret_multiplier: raw as unknown as number });
                      }}
                    />
                    <Input
                      className="col-span-3"
                      placeholder="Unità"
                      value={ing.output_unit}
                      onChange={(e) => setIngredient(idx, { output_unit: e.target.value })}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="col-span-1"
                      onClick={() => removeIngredient(idx)}
                      disabled={draft.ingredients.length === 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-3" onClick={addIngredient}>
                <Plus className="mr-1 h-3 w-3" /> Aggiungi ingrediente
              </Button>
              <div className="mt-3 rounded-md bg-surface p-3 text-xs text-muted-foreground">
                Esempi: 60% di scottona su 1 kg totale → moltiplicatore <b>0.60</b>, unità <b>kg</b>. 20 g
                di sale su 1 kg totale → moltiplicatore <b>20</b>, unità <b>g</b>.
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              {saveMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
