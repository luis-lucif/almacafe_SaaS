"use client";

import { useState } from "react";
import { AnimatePresence, motion, Variants } from "framer-motion";
import { ExternalLink, FileText, UtensilsCrossed, X } from "lucide-react";
import Image from "next/image";
import type { Tables } from "@/lib/supabase/types";

type Category = Tables<"categories"> & { products: Tables<"products">[] };
type Business = Tables<"businesses">;
type SocialLink = Tables<"social_links">;

const isPdfUrl = (url: string) => url.toLowerCase().endsWith(".pdf");

const PLATFORM_ICON_MAP: Record<string, string> = {
  instagram: "/insta.png",
  facebook: "/face.png",
  tiktok: "/tik.png",
};

function getPlatformIcon(platform: string): string | null {
  const key = platform.toLowerCase().replace(/\s+/g, "");
  return PLATFORM_ICON_MAP[key] ?? null;
}

// Defensa en profundidad: solo se renderizan links http(s), aunque ya se
// validen al guardarlos (ver social/actions.ts).
const isSafeHttpUrl = (url: string) => /^https?:\/\//i.test(url);

function getSectionStyle(section: string) {
  switch (section) {
    case "menu_del_dia":
      return {
        wrapperClass: "bg-copper/5 border border-copper/30 rounded-3xl p-4",
        headingClass: "font-serif text-2xl text-copper mb-3 pb-2 border-b border-copper/20",
        badge: "Menú del día",
      };
    case "destacados":
      return {
        wrapperClass: "",
        headingClass: "font-serif text-xl text-coffee mb-3 border-b border-sand/40 pb-2",
        badge: "Destacados",
      };
    case "combos":
      return {
        wrapperClass: "",
        headingClass: "font-serif text-xl text-coffee mb-3 border-b border-sand/40 pb-2",
        badge: "Combos",
      };
    default:
      return {
        wrapperClass: "",
        headingClass: "font-serif text-xl text-coffee mb-3 border-b border-sand/40 pb-2",
        badge: null as string | null,
      };
  }
}

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

export function MenuView({
  business,
  categories,
  socialLinks,
}: {
  business: Business;
  categories: Category[];
  socialLinks: SocialLink[];
}) {
  const safeSocialLinks = socialLinks.filter((link) => isSafeHttpUrl(link.url));
  const [lightbox, setLightbox] = useState<{ url: string; alt: string } | null>(null);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.3 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  return (
    <main
      className="min-h-screen flex flex-col relative overflow-hidden px-6 py-8 items-center bg-cream text-coffee"
      style={
        {
          "--color-cream": business.color_background,
          "--color-coffee": business.color_text,
          "--color-copper": business.color_primary,
        } as React.CSSProperties
      }
    >
      <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sand/30 via-cream to-cream" />

      <div className="z-10 w-full max-w-sm mx-auto flex flex-col flex-1">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-8 flex flex-col items-center"
        >
          <div className="mb-6 flex items-center justify-center w-20 h-20 rounded-full bg-white/70 border border-sand/40 overflow-hidden">
            {business.logo_url ? (
              <Image
                src={business.logo_url}
                alt={`Logo de ${business.name}`}
                width={80}
                height={80}
                className="object-cover w-full h-full"
              />
            ) : (
              <UtensilsCrossed className="text-copper" size={32} strokeWidth={1.5} />
            )}
          </div>
          <h1 className="font-serif text-2xl font-semibold text-coffee">{business.name}</h1>
          <div className="w-12 h-[2px] bg-copper/60 my-4 rounded-full" />
          <h2 className="font-serif text-lg italic text-coffee/90 font-medium">
            Descubre nuestros sabores
          </h2>
        </motion.header>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-8 w-full pb-8"
        >
          {categories.length === 0 && (
            <p className="text-center text-coffee/60 font-sans">
              Este menú todavía no tiene productos cargados.
            </p>
          )}

          {categories.map((category) => {
            const style = getSectionStyle(category.section);
            return (
            <motion.section
              key={category.id}
              variants={itemVariants}
              className={style.wrapperClass}
            >
              {style.badge && (
                <span className="block text-[11px] font-sans font-semibold uppercase tracking-wide text-copper/70 mb-1">
                  {style.badge}
                </span>
              )}
              <h3 className={style.headingClass}>{category.name}</h3>
              <div className="flex flex-col gap-3">
                {category.products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-start gap-3 p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-sand/40 shadow-sm"
                  >
                    {product.image_url &&
                      (isPdfUrl(product.image_url) ? (
                        <a
                          href={product.image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Ver PDF de ${product.name}`}
                          className="shrink-0 flex items-center justify-center w-16 h-16 rounded-xl border border-sand/40 bg-copper/10 text-copper active:scale-95 transition-transform"
                        >
                          <FileText size={26} strokeWidth={1.5} />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setLightbox({ url: product.image_url!, alt: product.name })
                          }
                          aria-label={`Ver imagen de ${product.name}`}
                          className="shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-sand/40 active:scale-95 transition-transform"
                        >
                          <Image
                            src={product.image_url}
                            alt={product.name}
                            width={64}
                            height={64}
                            className="object-cover w-full h-full"
                          />
                        </button>
                      ))}
                    <div className="flex flex-1 items-start justify-between gap-3 min-w-0">
                      <div className="flex-1 min-w-0">
                        <p className="font-sans font-semibold text-coffee">{product.name}</p>
                        {product.description && (
                          <p className="font-sans text-sm text-coffee/60 mt-1">
                            {product.description}
                          </p>
                        )}
                      </div>
                      {product.price !== null && (
                        <p className="font-sans font-semibold text-copper whitespace-nowrap">
                          {currencyFormatter.format(product.price)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
            );
          })}
        </motion.div>

        {(business.whatsapp || business.location || safeSocialLinks.length > 0) && (
          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 1 }}
            className="mt-auto text-center flex flex-col items-center gap-4"
          >
            {business.location && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-coffee/70 hover:text-copper transition-colors"
              >
                <img src="/maps.png" alt="" width={15} height={15} />
                {business.location}
              </a>
            )}

            <div className="flex items-center gap-4">
              {business.whatsapp && (
                <a
                  href={`https://wa.me/${business.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:scale-110 transition-transform"
                  aria-label="WhatsApp"
                >
                  <img src="/whats.png" alt="WhatsApp" width={28} height={28} />
                </a>
              )}
              {safeSocialLinks
                .filter((link) => getPlatformIcon(link.platform))
                .map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:scale-110 transition-transform"
                    aria-label={link.platform}
                  >
                    <img src={getPlatformIcon(link.platform)!} alt={link.platform} width={28} height={28} />
                  </a>
                ))}
            </div>

            {safeSocialLinks.some((link) => !getPlatformIcon(link.platform)) && (
              <div className="flex flex-wrap justify-center gap-2">
                {safeSocialLinks
                  .filter((link) => !getPlatformIcon(link.platform))
                  .map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/70 border border-sand/40 text-sm text-coffee hover:border-copper/40 hover:text-copper transition-colors"
                    >
                      {link.platform}
                      <ExternalLink size={12} strokeWidth={1.5} />
                    </a>
                  ))}
              </div>
            )}
          </motion.footer>
        )}
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm"
            >
              <button
                type="button"
                onClick={() => setLightbox(null)}
                aria-label="Cerrar"
                className="absolute -top-11 right-0 p-2 text-white/80 hover:text-white active:scale-90 transition-all"
              >
                <X size={24} strokeWidth={1.5} />
              </button>
              <Image
                src={lightbox.url}
                alt={lightbox.alt}
                width={800}
                height={800}
                className="w-full h-auto max-h-[80dvh] rounded-2xl object-contain bg-black/20"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
