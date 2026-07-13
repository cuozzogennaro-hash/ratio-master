import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Users, Plus, Trash2, Copy, Loader2 } from "lucide-react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


export const Route = createFileRoute("/admin/collaborators")({
  component: CollaboratorsPage,
});

const formSchema = z.object({
  email: z.string().trim().email("Email non valida").max(255),
  full_name: z.string().trim().max(120).optional(),
  password: z.string().min(8, "Almeno 8 caratteri").max(128),
});

function randomPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  const buf = new Uint32Array(12);
  crypto.getRandomValues(buf);
  for (let i = 0; i < buf.length; i++) out += chars[buf[i] % chars.length];
  return out;
}

function CollaboratorsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState(randomPassword());
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);

  const { data: operators, isLoading } = useQuery({
    queryKey: ["operators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at")
        .eq("role", "operator")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const parsed = formSchema.parse({ email, full_name: fullName || undefined, password });
      const { data, error } = await supabase.functions.invoke("create-operator", { body: parsed });
      if (error) throw new Error((data as { error?: string } | null)?.error ?? error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Operatore creato");
      setCreatedCreds({ email, password });
      setOpen(false);
      setEmail(""); setFullName(""); setPassword(randomPassword());
      qc.invalidateQueries({ queryKey: ["operators"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("delete-operator", { body: { operator_id: id } });
      if (error) throw new Error((data as { error?: string } | null)?.error ?? error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => { toast.success("Operatore rimosso"); qc.invalidateQueries({ queryKey: ["operators"] }); },
    onError: (e: Error) => toast.error(e.message),
  });


  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Collaboratori</h1>
          <p className="text-sm text-muted-foreground">Crea gli account per i tuoi operatori di laboratorio.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Nuovo operatore</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crea un operatore</DialogTitle>
              <DialogDescription>
                Riceverà queste credenziali per accedere. Potrai comunicargliele di persona.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome (opzionale)</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Mario Rossi" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="operatore@azienda.it" />
              </div>
              <div className="space-y-1.5">
                <Label>Password temporanea</Label>
                <div className="flex gap-2">
                  <Input value={password} onChange={(e) => setPassword(e.target.value)} />
                  <Button type="button" variant="outline" onClick={() => setPassword(randomPassword())}>
                    Genera
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
              <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
                {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crea
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {createdCreds && (
        <div className="mt-6 rounded-xl border border-success/40 bg-success/10 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-foreground">Credenziali generate</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Consegnale al tuo operatore. Non saranno più visibili dopo aver chiuso questo pannello.
              </div>
              <div className="mt-3 grid gap-1 rounded-lg bg-surface p-3 font-mono text-sm">
                <div><span className="text-muted-foreground">Email:</span> {createdCreds.email}</div>
                <div><span className="text-muted-foreground">Password:</span> {createdCreds.password}</div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(`Email: ${createdCreds.email}\nPassword: ${createdCreds.password}`);
                toast.success("Copiato");
              }}
            >
              <Copy className="mr-2 h-3 w-3" /> Copia
            </Button>
          </div>
          <div className="mt-3 flex justify-end">
            <Button size="sm" variant="ghost" onClick={() => setCreatedCreds(null)}>Ho preso nota</Button>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-border bg-card shadow-soft">
        {isLoading ? (
          <div className="grid place-items-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : !operators || operators.length === 0 ? (
          <div className="grid place-items-center gap-2 py-16 text-center">
            <Users className="h-8 w-8 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">Nessun operatore attivo.</div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {operators.map((op) => (
              <div key={op.id} className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-foreground text-sm font-semibold">
                    {(op.full_name ?? op.email).slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{op.full_name ?? op.email}</div>
                    <div className="text-xs text-muted-foreground">{op.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="hidden sm:inline-flex">Operatore</Badge>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Rimuovere questo operatore?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Non potrà più accedere. Lo storico dei suoi log resterà nel registro.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMut.mutate(op.id)}>Rimuovi</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
