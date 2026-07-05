import { createClient as createSupabaseJs } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  UsersManager,
  type UserRow,
} from "@/components/settings/UsersManager";

export default async function UsuariosPage() {
  const supabase = await createClient();

  // Só admin pode gerenciar usuários
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();

  if (me?.role !== "admin") {
    return (
      <div>
        <PageHeader
          title="Usuários e permissões"
          description="Administração de acessos ao sistema"
        />
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          Apenas administradores podem gerenciar usuários. Peça a um admin para
          ajustar seu papel se precisar de acesso.
        </div>
      </div>
    );
  }

  // Lista perfis + e-mails (via service role, no servidor)
  const admin = createSupabaseJs(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const [{ data: profiles }, { data: authList }] = await Promise.all([
    admin.from("profiles").select("id, full_name, role, active"),
    admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
  ]);

  const authById = new Map(
    (authList?.users ?? []).map((u) => [
      u.id,
      { email: u.email ?? "—", confirmed: !!u.email_confirmed_at },
    ])
  );

  const users: UserRow[] = (profiles ?? [])
    .map((p) => ({
      id: p.id as string,
      full_name: (p.full_name as string) ?? "",
      email: authById.get(p.id)?.email ?? "—",
      role: (p.role as string) ?? "consulta",
      active: !!p.active,
      confirmed: authById.get(p.id)?.confirmed ?? false,
    }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  return (
    <div>
      <PageHeader
        title="Usuários e permissões"
        description="Convide pessoas por e-mail e defina o papel de cada uma — sem precisar do painel do Supabase"
      />
      <UsersManager users={users} />
    </div>
  );
}
