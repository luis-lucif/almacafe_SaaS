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

  const whatsapp = String(formData.get("whatsapp") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;

  await supabase.from("businesses").update({ whatsapp, location }).eq("id", business.id);

  revalidatePath("/admin/data");
  revalidatePath("/");
  redirect("/admin/data?message=Datos actualizados");
}
