
REVOKE EXECUTE ON FUNCTION public.secure_calculate_and_log(UUID, NUMERIC, TEXT) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.operator_list_recipes() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.operator_get_recipe(UUID) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_admin_id() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM public, anon, authenticated;
