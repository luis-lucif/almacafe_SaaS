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

export async function addSocialLink(formData: FormData) {
  const supabase = await createClient();
  const business = await getOwnedBusiness(supabase);
  const platform = String(formData.get("platform") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  if (!platform || !url) redirect("/admin/social");

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
