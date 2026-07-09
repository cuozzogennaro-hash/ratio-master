import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShieldCheck, Calculator, Users, ClipboardList, Sparkles, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Capacitor } from "@capacitor/core";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setIsNative(true);
      navigate({ to: "/app", replace: true });
    }
  }, [navigate]);

  if (isNative) {
    return (
      <div className="min-h-screen bg-background grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-8 w-8 rounded-lg shadow-elegant" />
            <span className="text-lg font-semibold tracking-tight">RatioVault</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              to="/auth"
              className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-foreground/80 hover:text-foreground"
            >
              Accedi
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-elegant transition hover:brightness-110"
            >
              Prova gratuita
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_70%)]"
        />
        <div className="mx-auto max-w-5xl px-4 py-24 text-center md:py-32">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Formulazioni protette · Calcolo cieco · Log di produzione
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground md:text-6xl">
            Le tue ricette, <span className="text-primary">al sicuro.</span>
            <br />I tuoi operatori, precisi al grammo.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
            RatioVault è la piattaforma per macellerie, pasticcerie, panetterie, bar e laboratori:
            configuri le tue miscele segrete una volta, e il tuo team pesa le dosi corrette senza
            mai vedere le percentuali.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:brightness-110"
            >
              Crea il tuo account Admin
            </Link>
            <Link
              to="/auth"
              className="inline-flex h-11 items-center rounded-md border border-border bg-surface px-6 text-sm font-semibold text-foreground transition hover:bg-accent"
            >
              Sono un operatore
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 md:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: "Moltiplicatori segreti",
              body: "Le percentuali della tua formula non lasciano mai il server: gli operatori vedono solo i grammi finali.",
            },
            {
              icon: Calculator,
              title: "Calcolo cieco",
              body: "Un campo gigante, un tap: l'operatore inserisce la base e riceve le dosi già calcolate.",
            },
            {
              icon: ClipboardList,
              title: "Registro di produzione",
              body: "Ogni lotto è tracciato con operatore, ora, quantità e ricetta. Nulla è lasciato al caso.",
            },
            {
              icon: Users,
              title: "Multi-collaboratore",
              body: "Crea gli account dei dipendenti in un clic e revoca l'accesso quando serve.",
            },
            {
              icon: Sparkles,
              title: "Universale",
              body: "Kg, litri, grammi: adatto a qualsiasi laboratorio alimentare o produttivo.",
            },
            {
              icon: Calculator,
              title: "Tablet-ready",
              body: "Interfaccia mobile-first con font grandi e pulsanti ampi, pensata per l'uso in laboratorio.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} RatioVault. Formule protette. Team allineato.
      </footer>
    </div>
  );
}
