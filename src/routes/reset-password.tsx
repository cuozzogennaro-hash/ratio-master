import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase, quando l'utente clicca il link nell'email, arriva qui
    // con un fragment (#access_token=...&type=recovery) che il client
    // consuma automaticamente creando una sessione temporanea.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setHasRecoverySession(true);
      }
      setReady(true);
    });

    // Anche il caricamento diretto: se c'è già una sessione (fragment appena
    // consumato) consideriamola valida per il recupero.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setHasRecoverySession(true);
      setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("La password deve avere almeno 8 caratteri.");
      return;
    }
    if (password !== confirm) {
      toast.error("Le password non coincidono.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password aggiornata. Ora sei collegato.");
      navigate({ to: "/app" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Errore durante l'aggiornamento";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center p-6">
        <div className="w-full">
          <Link to="/" className="mb-8 flex items-center gap-2">
            <Logo className="h-8 w-8 rounded-lg" />
            <span className="text-base font-semibold">RatioVault</span>
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight">Imposta nuova password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Scegli una password di almeno 8 caratteri.
          </p>

          {!ready ? (
            <div className="mt-8 grid place-items-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !hasRecoverySession ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
                Il link di recupero non è valido o è scaduto. Richiedine uno nuovo.
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link to="/auth" search={{ mode: "forgot" }}>Richiedi nuovo link</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">Nuova password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Conferma password</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" disabled={busy} className="h-11 w-full text-base">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Aggiorna password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
