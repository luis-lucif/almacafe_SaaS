import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { addSocialLink, deleteSocialLink } from "./actions";

export default async function AdminSocialPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .single();
  if (!business) redirect("/admin/login");

  const { data: socialLinks } = await supabase
    .from("social_links")
    .select("*")
    .eq("business_id", business.id)
    .order("sort_order", { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold mb-1">Redes sociales</h1>
        <p className="text-coffee/60 text-sm">
          Se muestran como enlaces en el pie de tu menú público.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {(socialLinks ?? []).length === 0 && (
          <p className="text-coffee/50 text-sm">Todavía no agregaste ninguna red social.</p>
        )}
        {(socialLinks ?? []).map((link) => (
          <div
            key={link.id}
            className="flex items-center gap-3 rounded-xl border border-sand/40 bg-white/70 px-4 py-3 transition-colors hover:border-copper/30"
          >
            <div className="flex-1 min-w-0">
              <p className="font-sans font-semibold text-sm">{link.platform}</p>
              <p className="text-coffee/50 text-xs truncate">{link.url}</p>
            </div>
            <form action={deleteSocialLink}>
              <input type="hidden" name="id" value={link.id} />
              <button
                type="submit"
                aria-label={`Borrar ${link.platform}`}
                className="flex items-center justify-center w-8 h-8 rounded-full text-red-700/70 hover:bg-red-50 hover:text-red-700 active:scale-90 transition-all"
              >
                <Trash2 size={16} strokeWidth={1.5} />
              </button>
            </form>
          </div>
        ))}
      </div>

      <form
        action={addSocialLink}
        className="flex flex-col gap-2 rounded-2xl border border-sand/40 bg-white/50 p-4"
      >
        <input
          name="platform"
          placeholder="Plataforma (ej: TikTok, Facebook)"
          required
          className="rounded-xl border border-sand/50 bg-white/70 px-4 py-3 text-sm outline-none transition-colors focus:border-copper focus:ring-2 focus:ring-copper/20"
        />
        <input
          name="url"
          type="url"
          placeholder="URL completa (ej: https://tiktok.com/@almacafe)"
          required
          className="rounded-xl border border-sand/50 bg-white/70 px-4 py-3 text-sm outline-none transition-colors focus:border-copper focus:ring-2 focus:ring-copper/20"
        />
        <button
          type="submit"
          className="rounded-xl bg-copper text-white font-sans font-semibold py-3 hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Agregar red social
        </button>
      </form>
    </div>
  );
}
