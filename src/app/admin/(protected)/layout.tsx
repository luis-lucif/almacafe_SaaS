import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";
import { AdminNav } from "./AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  let { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) {
    // upsert con ignoreDuplicates evita crear filas duplicadas si dos requests
    // concurrentes llegan aquí en el primer login (ver auditoría H-4).
    const { data: upserted } = await supabase
      .from("businesses")
      .upsert({ owner_id: user.id, name: "Alma Café" }, { onConflict: "owner_id", ignoreDuplicates: true })
      .select("*");
    business = upserted?.[0] ?? null;

    if (!business) {
      const { data: existing } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();
      business = existing;
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream text-coffee">
      <header className="flex items-center justify-between gap-4 px-6 py-3 border-b border-sand/40 flex-wrap">
        <Link
          href="/admin"
          className="font-serif font-semibold hover:text-copper transition-colors"
        >
          {business?.name ?? "Alma Café"}
        </Link>
        <div className="flex items-center gap-3">
          <AdminNav />
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-copper hover:opacity-70 active:scale-95 transition-all"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>
      <div className="flex-1 px-6 py-8 max-w-3xl w-full mx-auto">{children}</div>
    </div>
  );
}
