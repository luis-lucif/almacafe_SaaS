"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateData(formData: FormData) {
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

  // Solo dígitos: es lo que espera el link https://wa.me/<numero>.
  const whatsapp = String(formData.get("whatsapp") ?? "").replace(/\D/g, "").slice(0, 20) || null;
  const location = String(formData.get("location") ?? "").trim().slice(0, 200) || null;

  await supabase.from("businesses").update({ whatsapp, location }).eq("id", business.id);

  revalidatePath("/admin/data");
  revalidatePath("/");
  redirect("/admin/data?message=Datos actualizados");
}
