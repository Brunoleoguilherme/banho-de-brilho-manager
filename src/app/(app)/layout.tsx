import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, active")
    .eq("id", user.id)
    .single();

  if (profile && !profile.active) redirect("/login");

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <Topbar
        name={profile?.full_name || user.email || ""}
        role={profile?.role || "consulta"}
      />
      <main className="pt-16 lg:ml-64 print:ml-0 print:pt-0">
        <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8 print:max-w-none print:p-0">
          {children}
        </div>
      </main>
    </div>
  );
}
