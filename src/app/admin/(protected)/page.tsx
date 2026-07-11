import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Package, Share2, Store, ShoppingBag, ArrowUpRight, Plus, Eye } from "lucide-react";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("owner_id", user.id)
    .single();

  if (!business) redirect("/admin/login");

  // Obtener estadísticas en paralelo para poblar el Bento Grid
  const [
    { count: productsCount },
    { count: categoriesCount },
    { count: activeOrdersCount },
  ] = await Promise.all([
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business.id),
    supabase
      .from("categories")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business.id),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business.id)
      .in("status", ["pending", "preparing"]),
  ]);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-coffee">
          Panel de {business.name}
        </h1>
        <p className="text-coffee/60 text-sm font-sans">
          Resumen operativo y configuraciones del menú digital.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Pedidos Activos (Bento Principal - Colspan 2) */}
        <div className="md:col-span-2 rounded-3xl border border-sand/40 bg-white/70 backdrop-blur-md p-6 shadow-sm flex flex-col justify-between min-h-[220px] transition-all hover:shadow-md hover:border-copper/30 group">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-copper">
                Estado de Cocina
              </span>
              <h2 className="font-serif text-2xl font-bold text-coffee mt-1">
                Pedidos Activos
              </h2>
              <p className="text-sm text-coffee/60 font-sans max-w-sm mt-1">
                Ordenes recibidas de las mesas que están pendientes o en preparación.
              </p>
            </div>
            {activeOrdersCount && activeOrdersCount > 0 ? (
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            ) : null}
          </div>

          <div className="flex items-end justify-between gap-4 mt-6">
            <div className="flex items-baseline gap-1">
              <span className="font-serif text-5xl font-extrabold text-coffee">
                {activeOrdersCount ?? 0}
              </span>
              <span className="text-sm font-sans text-coffee/60 font-medium">ordenes</span>
            </div>
            <Link
              href="/admin/orders"
              className="flex items-center gap-1.5 px-5 py-3 rounded-full bg-copper text-white text-sm font-sans font-semibold shadow-sm hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Ver pedidos
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>

        {/* Card 2: Menú Digital (Colspan 1) */}
        <div className="rounded-3xl border border-sand/40 bg-white/70 backdrop-blur-md p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-md hover:border-copper/30 group">
          <div className="flex justify-between items-start">
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-copper/10 text-copper">
              <Package size={20} strokeWidth={1.5} />
            </div>
            <Link
              href="/admin/products"
              className="text-coffee/40 hover:text-copper transition-colors"
              aria-label="Administrar menú"
            >
              <ArrowUpRight size={20} />
            </Link>
          </div>

          <div className="mt-6">
            <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-coffee/50">
              Carta Digital
            </span>
            <h3 className="font-serif text-xl font-bold text-coffee mt-1">
              Menú y Carta
            </h3>
            <div className="flex items-center gap-4 mt-3 text-sm text-coffee/70 font-medium">
              <div>
                <span className="font-serif text-lg font-bold text-coffee">{productsCount ?? 0}</span> Prod.
              </div>
              <div className="w-[1px] h-4 bg-sand" />
              <div>
                <span className="font-serif text-lg font-bold text-coffee">{categoriesCount ?? 0}</span> Cat.
              </div>
            </div>
          </div>

          <Link
            href="/admin/products"
            className="flex items-center justify-between text-xs font-sans font-semibold text-copper/80 hover:text-copper transition-colors border-t border-sand/30 pt-3 mt-4"
          >
            <span>Administrar Productos</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {/* Card 3: Datos de Contacto */}
        <div className="rounded-3xl border border-sand/40 bg-white/70 backdrop-blur-md p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-md hover:border-copper/30 group">
          <div className="flex justify-between items-start">
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-copper/10 text-copper">
              <Store size={20} strokeWidth={1.5} />
            </div>
            <Link
              href="/admin/data"
              className="text-coffee/40 hover:text-copper transition-colors"
              aria-label="Editar datos"
            >
              <ArrowUpRight size={20} />
            </Link>
          </div>

          <div className="mt-4">
            <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-coffee/50">
              Sucursal
            </span>
            <h3 className="font-serif text-lg font-bold text-coffee mt-1">
              Datos del Negocio
            </h3>
            <p className="text-xs text-coffee/60 font-sans mt-1">
              Configura tu WhatsApp de envíos y la ubicación en Google Maps.
            </p>
          </div>

          <Link
            href="/admin/data"
            className="flex items-center justify-between text-xs font-sans font-semibold text-copper/80 hover:text-copper transition-colors border-t border-sand/30 pt-3 mt-4"
          >
            <span>Editar Datos</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {/* Card 4: Redes Sociales */}
        <div className="rounded-3xl border border-sand/40 bg-white/70 backdrop-blur-md p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-md hover:border-copper/30 group">
          <div className="flex justify-between items-start">
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-copper/10 text-copper">
              <Share2 size={20} strokeWidth={1.5} />
            </div>
            <Link
              href="/admin/social"
              className="text-coffee/40 hover:text-copper transition-colors"
              aria-label="Configurar redes"
            >
              <ArrowUpRight size={20} />
            </Link>
          </div>

          <div className="mt-4">
            <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-coffee/50">
              Canales
            </span>
            <h3 className="font-serif text-lg font-bold text-coffee mt-1">
              Redes Sociales
            </h3>
            <p className="text-xs text-coffee/60 font-sans mt-1">
              Vincula tu Instagram, TikTok o Facebook al pie de la carta digital.
            </p>
          </div>

          <Link
            href="/admin/social"
            className="flex items-center justify-between text-xs font-sans font-semibold text-copper/80 hover:text-copper transition-colors border-t border-sand/30 pt-3 mt-4"
          >
            <span>Configurar Enlaces</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {/* Card 5: Previsualizar Menú */}
        <div className="rounded-3xl border border-sand/40 bg-white/70 backdrop-blur-md p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-md hover:border-copper/30 group">
          <div className="flex justify-between items-start">
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-copper/10 text-copper">
              <Eye size={20} strokeWidth={1.5} />
            </div>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-coffee/40 hover:text-copper transition-colors"
              aria-label="Ver menú"
            >
              <ArrowUpRight size={20} />
            </a>
          </div>

          <div className="mt-4">
            <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-coffee/50">
              Vista Cliente
            </span>
            <h3 className="font-serif text-lg font-bold text-coffee mt-1">
              Ver Carta Pública
            </h3>
            <p className="text-xs text-coffee/60 font-sans mt-1">
              Abre el menú en una nueva pestaña exactamente como lo ven tus clientes.
            </p>
          </div>

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between text-xs font-sans font-semibold text-copper/80 hover:text-copper transition-colors border-t border-sand/30 pt-3 mt-4"
          >
            <span>Previsualizar Menú</span>
            <ChevronRight size={14} />
          </a>
        </div>

      </div>
    </div>
  );
}
