-- 1. Aggiungi la colonna image_url alla tabella recipes
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Crea il bucket per le immagini se non esiste
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Abilita l'accesso per il bucket se RLS è attivo sulla tabella storage.objects
-- Nota: Supabase ha già RLS attivo di default su storage.objects.
CREATE POLICY "Consenti caricamento immagini ricette ad admin autenticati"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'recipe-images');

CREATE POLICY "Consenti modifica immagini ricette ad admin autenticati"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'recipe-images');

CREATE POLICY "Consenti eliminazione immagini ricette ad admin autenticati"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'recipe-images');

CREATE POLICY "Consenti lettura pubblica immagini ricette"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'recipe-images');

-- 4. Aggiorna la funzione operator_list_recipes per includere image_url
CREATE OR REPLACE FUNCTION public.operator_list_recipes()
RETURNS TABLE (
  id UUID,
  name TEXT,
  base_input_label TEXT,
  base_unit TEXT,
  image_url TEXT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.name, r.base_input_label, r.base_unit, r.image_url
  FROM public.recipes r
  WHERE r.admin_id = public.get_my_admin_id()
  ORDER BY r.name;
$$;

-- 5. Aggiorna la funzione operator_get_recipe per includere image_url nel JSONB
CREATE OR REPLACE FUNCTION public.operator_get_recipe(p_recipe_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin UUID := public.get_my_admin_id();
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', r.id,
    'name', r.name,
    'base_input_label', r.base_input_label,
    'base_unit', r.base_unit,
    'ingredient_count', jsonb_array_length(r.ingredients),
    'image_url', r.image_url
  )
  INTO v_result
  FROM public.recipes r
  WHERE r.id = p_recipe_id AND r.admin_id = v_admin;
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Ricetta non trovata';
  END IF;
  RETURN v_result;
END; $$;

-- 6. Aggiorna la funzione operator_get_recipes_for_offline per includere image_url
CREATE OR REPLACE FUNCTION public.operator_get_recipes_for_offline()
RETURNS TABLE (
  id UUID,
  name TEXT,
  base_input_label TEXT,
  base_unit TEXT,
  ingredients JSONB,
  image_url TEXT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.name, r.base_input_label, r.base_unit, r.ingredients, r.image_url
  FROM public.recipes r
  WHERE r.admin_id = public.get_my_admin_id()
  ORDER BY r.name;
$$;
