import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useProfile } from "@/hooks/use-session";

export const Route = createFileRoute("/app")({
  component: AppRedirect,
});

function AppRedirect() {
  const { session, profile, loading } = useProfile();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!session) return <Navigate to="/auth" />;
  if (!profile) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6 text-center">
        <div>
          <p className="text-sm text-muted-foreground">Profilo non trovato.</p>
        </div>
      </div>
    );
  }
  if (profile.role === "admin") return <Navigate to="/admin/recipes" />;
  return <Navigate to="/operator" />;
}
