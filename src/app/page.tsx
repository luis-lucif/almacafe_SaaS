import { createClient } from "@/lib/supabase/server";
import { sectionPriority } from "@/lib/category-sections";
import { MenuView } from "./MenuView";

export default async function HomePage() {
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (!business) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-center bg-cream text-coffee">
        <p className="font-sans text-coffee/60">El menú todavía no está configurado.</p>
      </main>
    );
  }

  const [{ data: categories }, { data: socialLinks }] = await Promise.all([
    supabase
      .from("categories")
      .select("*, products(*)")
      .eq("business_id", business.id)
      .order("sort_order", { ascending: true })
      .order("sort_order", { ascending: true, referencedTable: "products" }),
    supabase
      .from("social_links")
      .select("*")
      .eq("business_id", business.id)
      .order("sort_order", { ascending: true }),
  ]);

  const sortedCategories = [...(categories ?? [])].sort(
    (a, b) => sectionPriority(a.section) - sectionPriority(b.section),
  );

  return (
    <MenuView
      business={business}
      categories={sortedCategories}
      socialLinks={socialLinks ?? []}
    />
  );
}
