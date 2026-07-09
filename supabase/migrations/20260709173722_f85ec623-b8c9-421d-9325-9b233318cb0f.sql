
-- Enum ruoli
CREATE TYPE public.app_role AS ENUM ('admin', 'operator');

-- Profili
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role app_role NOT NULL DEFAULT 'admin',
  admin_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security definer helpers (evita ricorsione RLS)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.get_my_admin_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT admin_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Policy profili
CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admin reads own operators"
  ON public.profiles FOR SELECT TO authenticated
  USING (admin_id = auth.uid() AND public.get_my_role() = 'admin');

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- Trigger auto-creazione profilo (default admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role app_role;
  v_admin_id UUID;
  v_full_name TEXT;
BEGIN
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'admin');
  v_full_name := NEW.raw_user_meta_data->>'full_name';
  IF v_role = 'operator' THEN
    v_admin_id := (NEW.raw_user_meta_data->>'admin_id')::UUID;
  ELSE
    v_admin_id := NEW.id;
  END IF;
  INSERT INTO public.profiles (id, email, full_name, role, admin_id)
  VALUES (NEW.id, NEW.email, v_full_name, v_role, v_admin_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ricette
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  base_input_label TEXT NOT NULL,
  base_unit TEXT NOT NULL,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Solo l'admin proprietario può vedere e gestire le ricette (con i moltiplicatori)
CREATE POLICY "Admin manages own recipes"
  ON public.recipes FOR ALL TO authenticated
  USING (admin_id = auth.uid() AND public.get_my_role() = 'admin')
  WITH CHECK (admin_id = auth.uid() AND public.get_my_role() = 'admin');

-- Gli operatori NON hanno accesso diretto alla tabella recipes.
-- Useranno le funzioni RPC seguenti che nascondono i moltiplicatori.

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_recipes_updated
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Log di produzione
CREATE TABLE public.production_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  recipe_name TEXT NOT NULL,
  operator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  operator_email TEXT NOT NULL,
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  base_value_inserted NUMERIC NOT NULL,
  base_unit TEXT NOT NULL,
  calculated_output JSONB NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.production_logs TO authenticated;
GRANT ALL ON public.production_logs TO service_role;
ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin reads own company logs"
  ON public.production_logs FOR SELECT TO authenticated
  USING (admin_id = auth.uid() AND public.get_my_role() = 'admin');

CREATE POLICY "Operator reads own logs"
  ON public.production_logs FOR SELECT TO authenticated
  USING (operator_id = auth.uid());

-- Nessun INSERT diretto: si passa dalla funzione secure_calculate_and_log
CREATE INDEX idx_production_logs_admin ON public.production_logs(admin_id, created_at DESC);
CREATE INDEX idx_production_logs_operator ON public.production_logs(operator_id, created_at DESC);
CREATE INDEX idx_recipes_admin ON public.recipes(admin_id);

-- RPC: elenco ricette per operatore (senza moltiplicatori)
CREATE OR REPLACE FUNCTION public.operator_list_recipes()
RETURNS TABLE (
  id UUID,
  name TEXT,
  base_input_label TEXT,
  base_unit TEXT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.name, r.base_input_label, r.base_unit
  FROM public.recipes r
  WHERE r.admin_id = public.get_my_admin_id()
  ORDER BY r.name;
$$;

-- RPC: dettagli ricetta per operatore (solo nomi ingredienti + unità, senza moltiplicatori)
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
    'ingredient_count', jsonb_array_length(r.ingredients)
  )
  INTO v_result
  FROM public.recipes r
  WHERE r.id = p_recipe_id AND r.admin_id = v_admin;
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Ricetta non trovata';
  END IF;
  RETURN v_result;
END; $$;

-- RPC: calcolo cieco + log automatico (unico modo per l'operatore di ottenere le dosi)
CREATE OR REPLACE FUNCTION public.secure_calculate_and_log(
  p_recipe_id UUID,
  p_base_value NUMERIC,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin UUID := public.get_my_admin_id();
  v_user UUID := auth.uid();
  v_role app_role := public.get_my_role();
  v_recipe RECORD;
  v_output JSONB := '[]'::jsonb;
  v_ingredient JSONB;
  v_multiplier NUMERIC;
  v_amount NUMERIC;
  v_log_id UUID;
  v_email TEXT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;
  IF p_base_value IS NULL OR p_base_value <= 0 THEN
    RAISE EXCEPTION 'Quantità non valida';
  END IF;

  SELECT * INTO v_recipe FROM public.recipes
   WHERE id = p_recipe_id AND admin_id = v_admin;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ricetta non disponibile';
  END IF;

  FOR v_ingredient IN SELECT * FROM jsonb_array_elements(v_recipe.ingredients) LOOP
    v_multiplier := (v_ingredient->>'secret_multiplier')::NUMERIC;
    v_amount := ROUND((p_base_value * v_multiplier)::NUMERIC, 3);
    v_output := v_output || jsonb_build_object(
      'name', v_ingredient->>'name',
      'amount', v_amount,
      'unit', v_ingredient->>'output_unit'
    );
  END LOOP;

  SELECT email INTO v_email FROM public.profiles WHERE id = v_user;

  INSERT INTO public.production_logs (
    recipe_id, recipe_name, operator_id, operator_email, admin_id,
    base_value_inserted, base_unit, calculated_output, notes
  ) VALUES (
    v_recipe.id, v_recipe.name, v_user, v_email, v_admin,
    p_base_value, v_recipe.base_unit, v_output, p_notes
  ) RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'log_id', v_log_id,
    'recipe_name', v_recipe.name,
    'base_value', p_base_value,
    'base_unit', v_recipe.base_unit,
    'ingredients', v_output
  );
END; $$;

REVOKE ALL ON FUNCTION public.secure_calculate_and_log(UUID, NUMERIC, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.secure_calculate_and_log(UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.operator_list_recipes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.operator_get_recipe(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_admin_id() TO authenticated;
