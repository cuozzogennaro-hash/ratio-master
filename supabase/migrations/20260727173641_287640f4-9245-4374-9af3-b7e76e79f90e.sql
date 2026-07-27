-- 1. Storage: restrict recipe image reads to the user's own organization folder
DROP POLICY IF EXISTS "recipe-images read authenticated" ON storage.objects;
CREATE POLICY "recipe-images read own org"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'recipe-images'
  AND (storage.foldername(name))[1] = (public.get_my_admin_id())::text
);

-- 2. production_logs: explicit, self-scoped INSERT policy
CREATE POLICY "Users insert own production logs"
ON public.production_logs FOR INSERT TO authenticated
WITH CHECK (
  operator_id = auth.uid()
  AND admin_id = public.get_my_admin_id()
);
GRANT INSERT ON public.production_logs TO authenticated;

-- 3. Internal SECURITY DEFINER routines must not be callable from the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_admin_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.operator_list_recipes() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.operator_get_recipe(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.secure_calculate_and_log(uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_admin_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.operator_list_recipes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.operator_get_recipe(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.secure_calculate_and_log(uuid, numeric, text) TO authenticated;