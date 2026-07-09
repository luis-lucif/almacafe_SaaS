"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { detectFileType } from "@/lib/file-validation";
import { CATEGORY_SECTIONS } from "@/lib/category-sections";

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const VALID_SECTIONS = CATEGORY_SECTIONS.map((s) => s.value);

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

export async function createCategory(formData: FormData) {
  const supabase = await createClient();
  const business = await getOwnedBusiness(supabase);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/admin/products");

  const sectionRaw = String(formData.get("section") ?? "productos");
  const section = (VALID_SECTIONS as string[]).includes(sectionRaw) ? sectionRaw : "productos";

  await supabase.from("categories").insert({ business_id: business.id, name, section });

  revalidatePath("/admin/products");
  revalidatePath("/");
  redirect("/admin/products");
}

export async function deleteCategory(formData: FormData) {
  const supabase = await createClient();
  const business = await getOwnedBusiness(supabase);
  const id = String(formData.get("id") ?? "");

  await supabase.from("categories").delete().eq("id", id).eq("business_id", business.id);

  revalidatePath("/admin/products");
  revalidatePath("/");
  redirect("/admin/products");
}

export async function createProduct(formData: FormData) {
  const supabase = await createClient();
  const business = await getOwnedBusiness(supabase);

  const category_id = String(formData.get("category_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const priceRaw = String(formData.get("price") ?? "").trim();
  const price = priceRaw ? Number(priceRaw) : null;

  let image_url: string | null = null;
  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    if (image.size > MAX_FILE_BYTES) {
      redirect(`/admin/products?error=${encodeURIComponent("El archivo es demasiado pesado (máx. 15MB).")}`);
    }

    // Nunca confiar en el nombre ni en el `type` que reporta el cliente: se
    // detecta el formato real por firma binaria y se genera un nombre propio.
    const detected = await detectFileType(image);
    if (!detected) {
      redirect(
        `/admin/products?error=${encodeURIComponent("El archivo subido debe ser una imagen o un PDF válido.")}`,
      );
    }

    const path = `${business.id}/${crypto.randomUUID()}.${detected.ext}`;
    const { error: uploadError } = await supabase.storage
      .from("products")
      .upload(path, image, { contentType: detected.contentType });
    if (uploadError) {
      redirect(`/admin/products?error=${encodeURIComponent("No se pudo subir el archivo.")}`);
    }

    const { data: publicUrl } = supabase.storage.from("products").getPublicUrl(path);
    image_url = publicUrl.publicUrl;
  }

  await supabase.from("products").insert({
    business_id: business.id,
    category_id,
    name,
    description,
    price,
    image_url,
  });

  revalidatePath("/admin/products");
  revalidatePath("/");
  redirect("/admin/products");
}

export async function toggleProductAvailability(formData: FormData) {
  const supabase = await createClient();
  const business = await getOwnedBusiness(supabase);
  const id = String(formData.get("id") ?? "");
  const isAvailable = formData.get("is_available") === "true";

  await supabase
    .from("products")
    .update({ is_available: !isAvailable })
    .eq("id", id)
    .eq("business_id", business.id);

  revalidatePath("/admin/products");
  revalidatePath("/");
  redirect("/admin/products");
}

export async function deleteProduct(formData: FormData) {
  const supabase = await createClient();
  const business = await getOwnedBusiness(supabase);
  const id = String(formData.get("id") ?? "");

  await supabase.from("products").delete().eq("id", id).eq("business_id", business.id);

  revalidatePath("/admin/products");
  revalidatePath("/");
  redirect("/admin/products");
}
