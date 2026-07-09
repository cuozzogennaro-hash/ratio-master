-- RPC: dettagli completi di tutte le ricette (compresi ingredienti e moltiplicatori) per l'operatore (usato per il caching offline)
CREATE OR REPLACE FUNCTION public.operator_get_recipes_for_offline()
RETURNS TABLE (
  id UUID,
  name TEXT,
  base_input_label TEXT,
  base_unit TEXT,
  ingredients JSONB
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.name, r.base_input_label, r.base_unit, r.ingredients
  FROM public.recipes r
  WHERE r.admin_id = public.get_my_admin_id()
  ORDER BY r.name;
$$;

REVOKE ALL ON FUNCTION public.operator_get_recipes_for_offline() FROM public;
GRANT EXECUTE ON FUNCTION public.operator_get_recipes_for_offline() TO authenticated;
