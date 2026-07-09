import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ClipboardList, Loader2, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/logs")({
  component: LogsPage,
});

type LogRow = {
  id: string;
  recipe_name: string;
  operator_email: string;
  base_value_inserted: number;
  base_unit: string;
  calculated_output: { name: string; amount: number; unit: string }[];
  notes: string | null;
  created_at: string;
};

function LogsPage() {
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_logs")
        .select("id, recipe_name, operator_email, base_value_inserted, base_unit, calculated_output, notes, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as unknown as LogRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    const fromTs = dateFrom ? new Date(dateFrom).getTime() : 0;
    return data.filter((r) => {
      if (needle && !`${r.operator_email} ${r.recipe_name}`.toLowerCase().includes(needle)) return false;
      if (fromTs && new Date(r.created_at).getTime() < fromTs) return false;
      return true;
    });
  }, [data, q, dateFrom]);

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Registro attività</h1>
        <p className="text-sm text-muted-foreground">Ogni lotto prodotto dai tuoi operatori, tracciato.</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Input placeholder="Cerca per operatore o ricetta" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="max-w-[180px]" />
        {(q || dateFrom) && (
          <Button variant="ghost" size="sm" onClick={() => { setQ(""); setDateFrom(""); }}>Pulisci</Button>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card shadow-soft">
        {isLoading ? (
          <div className="grid place-items-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center gap-2 py-16 text-center">
            <ClipboardList className="h-8 w-8 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">Nessuna attività registrata.</div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((row) => {
              const isOpen = expanded === row.id;
              return (
                <div key={row.id}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : row.id)}
                    className="grid w-full grid-cols-12 items-center gap-3 px-4 py-3 text-left hover:bg-muted/40"
                  >
                    <div className="col-span-4 truncate text-sm font-medium">{row.recipe_name}</div>
                    <div className="col-span-3 hidden truncate text-xs text-muted-foreground sm:block">
                      {row.operator_email}
                    </div>
                    <div className="col-span-3 text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleString("it-IT")}
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <Badge variant="secondary">
                        {row.base_value_inserted} {row.base_unit}
                      </Badge>
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition", isOpen && "rotate-180")} />
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-border bg-muted/30 px-4 py-4">
                      <div className="mb-2 text-xs text-muted-foreground sm:hidden">Operatore: {row.operator_email}</div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {row.calculated_output.map((ing, idx) => (
                          <div key={idx} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm">
                            <span>{ing.name}</span>
                            <span className="font-mono font-medium">{ing.amount} {ing.unit}</span>
                          </div>
                        ))}
                      </div>
                      {row.notes && (
                        <div className="mt-3 rounded-md bg-surface p-2 text-xs text-muted-foreground">Note: {row.notes}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
