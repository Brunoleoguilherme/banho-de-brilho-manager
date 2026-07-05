"use client";

import { useRouter } from "next/navigation";
import { LogOut, UserCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { USER_ROLES, labelFor } from "@/lib/constants";

interface TopbarProps {
  name: string;
  role: string;
}

export function Topbar({ name, role }: TopbarProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white pl-16 pr-4 lg:left-64 lg:px-6 print:hidden">
      <div />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <UserCircle2 className="h-8 w-8 shrink-0 text-brand-petrol" />
          <div className="min-w-0 leading-tight">
            <p className="max-w-[130px] truncate text-sm font-semibold text-ink sm:max-w-none">
              {name || "Usuário"}
            </p>
            <p className="truncate text-xs text-ink-muted">
              {labelFor(USER_ROLES, role)}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-ink-muted transition hover:border-danger hover:text-danger"
          title="Sair do sistema"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
}
