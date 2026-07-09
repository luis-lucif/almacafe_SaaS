import { redirect } from "next/navigation";
import { MapPin, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateData } from "./actions";

export default async function AdminDataPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .single();
  if (!business) redirect("/admin/login");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold mb-1">Datos</h1>
        <p className="text-coffee/60 text-sm">
          Información de contacto que se muestra en tu menú público.
        </p>
      </div>

      {message && (
        <p className="text-sage text-sm bg-sage/10 rounded-lg px-3 py-2">{message}</p>
      )}
      {error && <p className="text-red-700 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <form action={updateData} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-sans">
          <span className="flex items-center gap-1.5 font-medium text-coffee/80">
            <MessageCircle size={15} strokeWidth={1.5} className="text-copper" />
            WhatsApp
          </span>
          <input
            name="whatsapp"
            defaultValue={business.whatsapp ?? ""}
            placeholder="Solo números, con código de país. Ej: 5491122334455"
            className="rounded-xl border border-sand/50 bg-white/70 px-4 py-3 text-sm outline-none transition-colors focus:border-copper focus:ring-2 focus:ring-copper/20"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-sans">
          <span className="flex items-center gap-1.5 font-medium text-coffee/80">
            <MapPin size={15} strokeWidth={1.5} className="text-copper" />
            Ubicación
          </span>
          <input
            name="location"
            defaultValue={business.location ?? ""}
            placeholder="Ej: Av. Siempre Viva 123, Merlo"
            className="rounded-xl border border-sand/50 bg-white/70 px-4 py-3 text-sm outline-none transition-colors focus:border-copper focus:ring-2 focus:ring-copper/20"
          />
        </label>

        <button
          type="submit"
          className="rounded-xl bg-copper text-white font-sans font-semibold py-3 hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Guardar
        </button>
      </form>
    </div>
  );
}
