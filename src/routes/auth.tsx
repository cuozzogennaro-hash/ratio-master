import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ShieldCheck, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  component: AuthPage,
});

function AuthPage() {
  const { mode = "signin" } = Route.useSearch();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(mode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app" });
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: { role: "admin", full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Account creato. Benvenuto in RatioVault!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Accesso effettuato.");
      }
      navigate({ to: "/app" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Errore di autenticazione";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 md:grid-cols-2">
        <div className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground md:flex">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold">RatioVault</span>
          </Link>
          <div>
            <h2 className="text-3xl font-bold leading-tight">
              Le tue formule<br />non escono mai dal server.
            </h2>
            <p className="mt-4 max-w-sm text-sm text-sidebar-foreground/70">
              Gli operatori vedono solo i grammi finali. I moltiplicatori restano tuoi.
            </p>
          </div>
          <p className="text-xs text-sidebar-foreground/50">
            © {new Date().getFullYear()} RatioVault
          </p>
        </div>

        <div className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-sm">
            <Link to="/" className="mb-8 flex items-center gap-2 md:hidden">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <span className="text-base font-semibold">RatioVault</span>
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isSignup ? "Crea il tuo account Admin" : "Bentornato"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isSignup
                ? "Configura la tua azienda e inizia a proteggere le tue ricette."
                : "Accedi al tuo account RatioVault."}
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              {isSignup && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome dell'azienda / Titolare</Label>
                  <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" disabled={busy} className="h-11 w-full text-base">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSignup ? "Crea account" : "Accedi"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {isSignup ? "Hai già un account?" : "Sei un titolare?"}{" "}
              <button
                type="button"
                onClick={() => setIsSignup((v) => !v)}
                className="font-medium text-primary hover:underline"
              >
                {isSignup ? "Accedi" : "Crea un account"}
              </button>
            </p>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Sei un operatore? Usa le credenziali fornite dal tuo titolare.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
