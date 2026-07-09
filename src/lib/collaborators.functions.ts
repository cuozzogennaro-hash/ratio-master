import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const createSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  full_name: z.string().trim().max(120).optional(),
});

export const createOperator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    // Verifica che l'utente sia admin
    const { data: me, error: meErr } = await context.supabase
      .from("profiles")
      .select("role, id")
      .eq("id", context.userId)
      .maybeSingle();
    if (meErr) throw new Error(meErr.message);
    if (!me || me.role !== "admin") throw new Error("Solo un amministratore può creare operatori");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        role: "operator",
        admin_id: context.userId,
        full_name: data.full_name ?? null,
      },
    });
    if (error) throw new Error(error.message);
    return { user_id: created.user?.id, email: data.email };
  });

const deleteSchema = z.object({ operator_id: z.string().uuid() });

export const deleteOperator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => deleteSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: op, error: opErr } = await context.supabase
      .from("profiles")
      .select("id, admin_id, role")
      .eq("id", data.operator_id)
      .maybeSingle();
    if (opErr) throw new Error(opErr.message);
    if (!op || op.admin_id !== context.userId || op.role !== "operator") {
      throw new Error("Operatore non trovato");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.operator_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
