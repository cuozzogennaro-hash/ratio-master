import { useEffect, useState } from "react";
import { Beaker } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Le foto delle ricette vivono in un bucket PRIVATO (`recipe-images`),
 * quindi non hanno un URL pubblico. In `recipes.image_url` salviamo il
 * percorso dentro il bucket (es. "<uid>/<timestamp>.jpg") e qui lo
 * risolviamo con un URL firmato temporaneo (1 ora).
 *
 * Per compatibilità, se `src` è già un URL http(s) lo usiamo direttamente
 * (vecchi record salvati come publicUrl).
 */
export async function resolveRecipeImageUrl(src?: string | null): Promise<string | null> {
  if (!src) return null;
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("blob:") || src.startsWith("data:")) {
    return src;
  }
  const { data, error } = await supabase.storage
    .from("recipe-images")
    .createSignedUrl(src, 60 * 60);
  if (error) {
    console.warn("Impossibile firmare l'URL della foto ricetta:", error.message);
    return null;
  }
  return data.signedUrl;
}

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
};

export function RecipeImage({ src, alt, className, fallbackClassName }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    resolveRecipeImageUrl(src).then((u) => { if (alive) setUrl(u); });
    return () => { alive = false; };
  }, [src]);

  if (!url) {
    return (
      <div className={fallbackClassName ?? "h-full w-full bg-gradient-to-br from-accent/50 to-primary/10 grid place-items-center text-primary/40"}>
        <Beaker className="h-10 w-10 animate-pulse" />
      </div>
    );
  }
  return <img src={url} alt={alt} className={className} />;
}
