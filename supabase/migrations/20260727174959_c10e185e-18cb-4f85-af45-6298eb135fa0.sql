DROP FUNCTION IF EXISTS public.operator_list_recipes();

CREATE OR REPLACE FUNCTION public.operator_list_recipes()
 RETURNS TABLE(id uuid, name text, base_input_label text, base_unit text, image_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT r.id, r.name, r.base_input_label, r.base_unit, r.image_url
  FROM public.recipes r
  WHERE r.admin_id = public.get_my_admin_id()
  ORDER BY r.name;
$function$;

REVOKE EXECUTE ON FUNCTION public.operator_list_recipes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.operator_list_recipes() TO authenticated;

CREATE OR REPLACE FUNCTION public.operator_get_recipe(p_recipe_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin UUID := public.get_my_admin_id();
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', r.id,
    'name', r.name,
    'base_input_label', r.base_input_label,
    'base_unit', r.base_unit,
    'image_url', r.image_url,
    'ingredient_count', jsonb_array_length(r.ingredients)
  )
  INTO v_result
  FROM public.recipes r
  WHERE r.id = p_recipe_id AND r.admin_id = v_admin;
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Ricetta non trovata';
  END IF;
  RETURN v_result;
END; $function$;

REVOKE EXECUTE ON FUNCTION public.operator_get_recipe(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.operator_get_recipe(uuid) TO authenticated;