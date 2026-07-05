"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseJs } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { logActivity, type ActionResult } from "./helpers";

const PAPEIS = ["admin", "comercial"];

function adminClient() {
  return createSupabaseJs(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

/** Garante que quem chama é admin ativo; retorna seu e-mail */
async function requireAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .single();
  if (!profile?.active || profile.role !== "admin") return null;
  return user.email ?? null;
}

/**
 * Cria um usuário direto, com senha definida pelo admin — sem e-mail de
 * confirmação. Se o e-mail já existir (ex.: convite antigo pendente),
 * apenas redefine a senha, confirma o e-mail e atualiza o papel.
 */
export async function createUserAction(input: {
  full_name: string;
  email: string;
  role: string;
  password: string;
}): Promise<ActionResult> {
  const adminEmail = await requireAdmin();
  if (!adminEmail)
    return { ok: false, error: "Apenas administradores podem criar usuários." };

  const email = input.email.trim().toLowerCase();
  const full_name = input.full_name.trim();
  const password = input.password;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: "Informe um e-mail válido." };
  if (full_name.length < 3)
    return { ok: false, error: "Informe o nome completo." };
  if (!PAPEIS.includes(input.role))
    return { ok: false, error: "Papel inválido." };
  if (password.length < 6)
    return { ok: false, error: "A senha precisa ter pelo menos 6 caracteres." };

  const admin = adminClient();

  // Tenta criar; se já existir, atualiza senha + confirma e-mail
  let userId: string | null = null;
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

  if (createError) {
    if (!/already|registered|exists/i.test(createError.message))
      return { ok: false, error: "Erro ao criar: " + createError.message };
    // Já existe (ex.: convite pendente) — localiza e redefine
    const { data: list } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const existing = list?.users.find(
      (u) => u.email?.toLowerCase() === email
    );
    if (!existing)
      return { ok: false, error: "E-mail já cadastrado, mas não foi possível localizá-lo." };
    const { error: updError } = await admin.auth.admin.updateUserById(
      existing.id,
      { password, email_confirm: true, user_metadata: { full_name } }
    );
    if (updError)
      return { ok: false, error: "Erro ao redefinir a senha: " + updError.message };
    userId = existing.id;
  } else {
    userId = created.user.id;
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    full_name,
    role: input.role,
    active: true,
  });
  if (profileError)
    return {
      ok: false,
      error: "Usuário criado, mas houve erro ao salvar o perfil: " + profileError.message,
    };

  await logActivity({
    entity_type: "user",
    entity_id: userId,
    action: "created",
    description: `Usuário ${full_name} (${email}, papel ${input.role}) criado por ${adminEmail} com senha definida`,
  });

  revalidatePath("/configuracoes/usuarios");
  return { ok: true };
}

/**
 * Convida um novo usuário: o Supabase envia um e-mail de convite;
 * a pessoa clica, confirma e define a própria senha.
 */
export async function inviteUserAction(input: {
  full_name: string;
  email: string;
  role: string;
}): Promise<ActionResult> {
  const adminEmail = await requireAdmin();
  if (!adminEmail)
    return { ok: false, error: "Apenas administradores podem convidar usuários." };

  const email = input.email.trim().toLowerCase();
  const full_name = input.full_name.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: "Informe um e-mail válido." };
  if (full_name.length < 3)
    return { ok: false, error: "Informe o nome completo." };
  if (!PAPEIS.includes(input.role))
    return { ok: false, error: "Papel inválido." };

  const admin = adminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/atualizar-senha`,
    data: { full_name },
  });
  if (error) {
    const msg = /already/i.test(error.message)
      ? "Este e-mail já tem cadastro no sistema."
      : `Erro ao enviar o convite: ${error.message}`;
    return { ok: false, error: msg };
  }

  // Cria/atualiza o perfil com o papel escolhido
  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id,
    full_name,
    role: input.role,
    active: true,
  });
  if (profileError)
    return {
      ok: false,
      error: "Convite enviado, mas houve erro ao salvar o perfil: " + profileError.message,
    };

  await logActivity({
    entity_type: "user",
    entity_id: data.user.id,
    action: "invited",
    description: `Usuário ${full_name} (${email}, papel ${input.role}) convidado por ${adminEmail}`,
  });

  revalidatePath("/configuracoes/usuarios");
  return { ok: true };
}

/** Reenvia o convite para quem ainda não confirmou */
export async function resendInviteAction(email: string): Promise<ActionResult> {
  const adminEmail = await requireAdmin();
  if (!adminEmail)
    return { ok: false, error: "Apenas administradores podem reenviar convites." };

  const admin = adminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/atualizar-senha`,
  });
  if (error) return { ok: false, error: "Erro ao reenviar: " + error.message };
  return { ok: true };
}

/** Altera papel e/ou ativa-desativa um usuário */
export async function updateUserAction(
  id: string,
  input: { role?: string; active?: boolean }
): Promise<ActionResult> {
  const adminEmail = await requireAdmin();
  if (!adminEmail)
    return { ok: false, error: "Apenas administradores podem alterar usuários." };
  if (input.role && !PAPEIS.includes(input.role))
    return { ok: false, error: "Papel inválido." };

  const update: Record<string, unknown> = {};
  if (input.role !== undefined) update.role = input.role;
  if (input.active !== undefined) update.active = input.active;

  const admin = adminClient();
  const { error } = await admin.from("profiles").update(update).eq("id", id);
  if (error) return { ok: false, error: "Erro ao salvar: " + error.message };

  await logActivity({
    entity_type: "user",
    entity_id: id,
    action: "updated",
    description: `Usuário alterado por ${adminEmail} (${JSON.stringify(update)})`,
  });

  revalidatePath("/configuracoes/usuarios");
  return { ok: true };
}
