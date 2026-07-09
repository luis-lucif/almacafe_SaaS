import Image from "next/image";
import { redirect } from "next/navigation";
import { FileText, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProductFileInput } from "@/components/ProductFileInput";
import { CATEGORY_SECTIONS, sectionLabel, sectionPriority } from "@/lib/category-sections";
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  toggleProductAvailability,
} from "./actions";

const isPdfUrl = (url: string) => url.toLowerCase().endsWith(".pdf");

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

const inputClass =
  "rounded-xl border border-sand/50 bg-white/70 px-4 py-3 text-sm outline-none transition-colors focus:border-copper focus:ring-2 focus:ring-copper/20";

const SECTION_BADGE_CLASS: Record<string, string> = {
  menu_del_dia: "bg-copper text-white",
  destacados: "bg-sage/20 text-sage",
  combos: "bg-sand/40 text-coffee",
  productos: "bg-sand/20 text-coffee/60",
};

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
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

  const { data: categoriesData } = await supabase
    .from("categories")
    .select("*, products(*)")
    .eq("business_id", business.id)
    .order("sort_order", { ascending: true })
    .order("sort_order", { ascending: true, referencedTable: "products" });

  const categories = [...(categoriesData ?? [])].sort(
    (a, b) => sectionPriority(a.section) - sectionPriority(b.section),
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-serif text-2xl font-semibold mb-1">Categorías y productos</h1>
        <p className="text-coffee/60 text-sm">
          Los productos marcados como &quot;no disponible&quot; no se muestran en el menú público.
        </p>
      </div>

      {error && (
        <p className="text-red-700 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <form action={createCategory} className="flex flex-col sm:flex-row gap-2">
        <input
          name="name"
          placeholder="Nueva categoría (ej: Desayunos)"
          required
          className={`flex-1 ${inputClass}`}
        />
        <select name="section" defaultValue="productos" className={inputClass}>
          {CATEGORY_SECTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-xl bg-copper text-white font-sans font-semibold px-5 hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Agregar
        </button>
      </form>

      {categories.length === 0 && (
        <p className="text-coffee/60 text-sm text-center">
          Todavía no cargaste ninguna categoría.
        </p>
      )}

      {categories.map((category) => (
        <div
          key={category.id}
          className="rounded-2xl border border-sand/40 bg-white/50 p-4 transition-colors hover:border-copper/20"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-lg font-semibold">{category.name}</h2>
              <span
                className={`text-[11px] font-sans font-semibold px-2 py-0.5 rounded-full ${
                  SECTION_BADGE_CLASS[category.section] ?? SECTION_BADGE_CLASS.productos
                }`}
              >
                {sectionLabel(category.section)}
              </span>
            </div>
            <form action={deleteCategory}>
              <input type="hidden" name="id" value={category.id} />
              <button
                type="submit"
                aria-label={`Eliminar categoría ${category.name}`}
                className="flex items-center justify-center w-8 h-8 rounded-full text-red-700/70 hover:bg-red-50 hover:text-red-700 active:scale-90 transition-all"
              >
                <Trash2 size={15} strokeWidth={1.5} />
              </button>
            </form>
          </div>

          <div className="flex flex-col gap-3 mb-4">
            {category.products.length === 0 && (
              <p className="text-coffee/50 text-sm">Sin productos todavía.</p>
            )}
            {category.products.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 rounded-xl border border-sand/40 bg-white/70 p-3 transition-colors hover:border-copper/30"
              >
                {product.image_url ? (
                  isPdfUrl(product.image_url) ? (
                    <a
                      href={product.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Ver PDF de ${product.name}`}
                      className="flex items-center justify-center w-12 h-12 rounded-lg bg-copper/10 text-copper shrink-0 hover:bg-copper/20 transition-colors"
                    >
                      <FileText size={20} strokeWidth={1.5} />
                    </a>
                  ) : (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      width={48}
                      height={48}
                      className="rounded-lg object-cover w-12 h-12"
                    />
                  )
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-sand/30 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-sans font-semibold text-sm truncate">{product.name}</p>
                  {product.description && (
                    <p className="text-coffee/50 text-xs truncate">{product.description}</p>
                  )}
                </div>
                {product.price !== null && (
                  <p className="font-sans text-sm font-semibold text-copper whitespace-nowrap">
                    {currencyFormatter.format(product.price)}
                  </p>
                )}
                <form action={toggleProductAvailability}>
                  <input type="hidden" name="id" value={product.id} />
                  <input type="hidden" name="is_available" value={String(product.is_available)} />
                  <button
                    type="submit"
                    className={`text-xs px-2 py-1 rounded-full whitespace-nowrap transition-all active:scale-95 ${
                      product.is_available
                        ? "bg-sage/20 text-sage hover:bg-sage/30"
                        : "bg-red-100 text-red-700 hover:bg-red-200"
                    }`}
                  >
                    {product.is_available ? "Disponible" : "No disponible"}
                  </button>
                </form>
                <form action={deleteProduct}>
                  <input type="hidden" name="id" value={product.id} />
                  <button
                    type="submit"
                    aria-label={`Borrar ${product.name}`}
                    className="flex items-center justify-center w-7 h-7 rounded-full text-red-700/70 hover:bg-red-50 hover:text-red-700 active:scale-90 transition-all"
                  >
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                </form>
              </div>
            ))}
          </div>

          <details className="text-sm group">
            <summary className="cursor-pointer text-copper font-sans font-semibold hover:opacity-80 transition-opacity list-none flex items-center gap-1">
              <span className="transition-transform group-open:rotate-45">+</span>
              Agregar producto
            </summary>
            <form action={createProduct} className="flex flex-col gap-2 mt-3">
              <input type="hidden" name="category_id" value={category.id} />
              <input name="name" placeholder="Nombre" required className={inputClass} />
              <input name="description" placeholder="Descripción (opcional)" className={inputClass} />
              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="Precio"
                className={inputClass}
              />
              <ProductFileInput
                name="image"
                className="text-sm text-coffee/70 file:mr-3 file:rounded-lg file:border-0 file:bg-copper/10 file:px-3 file:py-2 file:text-copper file:font-semibold file:cursor-pointer hover:file:bg-copper/20 file:transition-colors"
              />
              <p className="text-xs text-coffee/50 -mt-1">
                Podés subir una foto o un PDF (ej. el menú de combos completo).
              </p>
              <button
                type="submit"
                className="rounded-xl bg-copper text-white font-sans font-semibold py-2 hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Guardar producto
              </button>
            </form>
          </details>
        </div>
      ))}
    </div>
  );
}
