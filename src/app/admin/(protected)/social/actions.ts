"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function getOwnedBusiness(supabase: Awaited<ReturnType<typeof createClient>>) {
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

  return business;
}

// Solo http(s): evita guardar esquemas peligrosos (ej. "javascript:...") que
// se ejecutarían al hacer clic en el link desde el menú público.
function safeHttpUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function addSocialLink(formData: FormData) {
  const supabase = await createClient();
  const business = await getOwnedBusiness(supabase);
  const platform = String(formData.get("platform") ?? "").trim().slice(0, 40);
  const url = safeHttpUrl(String(formData.get("url") ?? "").trim());
  if (!platform || !url) {
    redirect(`/admin/social?error=${encodeURIComponent("La URL debe empezar con http:// o https://")}`);
  }

  await supabase.from("social_links").insert({ business_id: business.id, platform, url });

  revalidatePath("/admin/social");
  revalidatePath("/");
  redirect("/admin/social");
}

export async function deleteSocialLink(formData: FormData) {
  const supabase = await createClient();
  const business = await getOwnedBusiness(supabase);
  const id = String(formData.get("id") ?? "");

  await supabase.from("social_links").delete().eq("id", id).eq("business_id", business.id);

  revalidatePath("/admin/social");
  revalidatePath("/");
  redirect("/admin/social");
}
