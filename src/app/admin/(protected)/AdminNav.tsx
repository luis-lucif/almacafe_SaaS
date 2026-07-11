"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Panel" },
  { href: "/admin/orders", label: "Pedidos" },
  { href: "/admin/products", label: "Productos" },
  { href: "/admin/social", label: "Redes sociales" },
  { href: "/admin/data", label: "Datos" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 text-sm font-sans">
      {links.map(({ href, label }) => {
        const isActive = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`px-3 py-1.5 rounded-full transition-colors ${
              isActive
                ? "bg-copper/10 text-copper font-semibold"
                : "text-coffee/70 hover:text-copper hover:bg-copper/5"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
