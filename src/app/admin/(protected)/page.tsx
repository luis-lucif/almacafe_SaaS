import Link from "next/link";
import { ChevronRight, Package, Share2, Store } from "lucide-react";

const sections = [
  {
    href: "/admin/products",
    icon: Package,
    title: "Productos",
    description: "Categorías, precios, fotos y disponibilidad del menú.",
  },
  {
    href: "/admin/social",
    icon: Share2,
    title: "Redes sociales",
    description: "Instagram, TikTok y cualquier otra red que quieras sumar.",
  },
  {
    href: "/admin/data",
    icon: Store,
    title: "Datos",
    description: "WhatsApp y ubicación del negocio.",
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold mb-1">Panel de Alma Café</h1>
        <p className="text-coffee/60 text-sm">¿Qué querés actualizar hoy?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {sections.map(({ href, icon: Icon, title, description }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-3 rounded-2xl border border-sand/40 bg-white/70 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-copper/40 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-copper/10 text-copper transition-colors group-hover:bg-copper group-hover:text-white">
              <Icon size={22} strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <p className="font-sans font-semibold text-coffee">{title}</p>
              <p className="text-coffee/60 text-sm mt-1">{description}</p>
            </div>
            <div className="flex items-center gap-1 text-sm font-sans font-medium text-copper/80 group-hover:text-copper">
              Abrir
              <ChevronRight
                size={16}
                strokeWidth={1.5}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
