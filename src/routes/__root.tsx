import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { toast } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Pagina non trovata</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La pagina che cerchi non esiste o è stata spostata.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Torna alla home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">Errore di caricamento</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Qualcosa è andato storto. Puoi riprovare o tornare alla home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Riprova
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "RatioVault — Calcolatore di ricette e formulazioni segrete" },
      {
        name: "description",
        content:
          "RatioVault è la piattaforma B2B per macellerie, pasticcerie, panetterie e laboratori: proteggi le tue formule e dai ai collaboratori un calcolatore cieco preciso al grammo.",
      },
      { name: "author", content: "RatioVault" },
      { property: "og:title", content: "RatioVault — Calcolatore di ricette e formulazioni segrete" },
      {
        property: "og:description",
        content:
          "RatioVault è la piattaforma B2B per macellerie, pasticcerie, panetterie e laboratori: proteggi le tue formule e dai ai collaboratori un calcolatore cieco preciso al grammo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "RatioVault — Calcolatore di ricette e formulazioni segrete" },
      { name: "twitter:description", content: "RatioVault è la piattaforma B2B per macellerie, pasticcerie, panetterie e laboratori: proteggi le tue formule e dai ai collaboratori un calcolatore cieco preciso al grammo." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f62885ee-d84c-4fc5-a04b-11e03c40d880/id-preview-c57c9979--abaaae07-40f6-4c0f-95ff-6890d9c1f237.lovable.app-1783623676799.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f62885ee-d84c-4fc5-a04b-11e03c40d880/id-preview-c57c9979--abaaae07-40f6-4c0f-95ff-6890d9c1f237.lovable.app-1783623676799.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  // Effetto per sincronizzare i log accumulati offline quando torna la connessione
  useEffect(() => {
    const syncOfflineLogs = async () => {
      if (typeof window === "undefined" || !navigator.onLine) return;
      const queueKey = "offline-logs-queue";
      const queue = JSON.parse(localStorage.getItem(queueKey) || "[]") as any[];
      if (queue.length === 0) return;

      toast.info(`Trovate ${queue.length} pesate offline. Sincronizzazione in corso...`);
      
      const remaining: any[] = [];
      let successCount = 0;

      for (const log of queue) {
        try {
          const { error } = await supabase.rpc("secure_calculate_and_log", {
            p_recipe_id: log.recipe_id,
            p_base_value: log.base_value,
            p_notes: log.notes
          });
          if (error) throw error;
          successCount++;
        } catch (e) {
          console.error("Errore sinc log offline:", e);
          remaining.push(log);
        }
      }

      if (remaining.length > 0) {
        localStorage.setItem(queueKey, JSON.stringify(remaining));
        toast.error(`Sincronizzate ${successCount} pesate. ${remaining.length} fallite (saranno riprovate).`);
      } else {
        localStorage.removeItem(queueKey);
        toast.success(`Sincronizzazione completata! ${successCount} pesate salvate nel registro online.`);
      }

      // Invalida le query per ricaricare la lista dei log
      queryClient.invalidateQueries({ queryKey: ["admin-logs"] });
      queryClient.invalidateQueries({ queryKey: ["op-logs"] });
    };

    window.addEventListener("online", syncOfflineLogs);
    if (navigator.onLine) {
      syncOfflineLogs();
    }

    return () => {
      window.removeEventListener("online", syncOfflineLogs);
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
