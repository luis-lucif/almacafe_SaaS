"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion, Variants } from "framer-motion";
import { AlertTriangle, Check, ExternalLink, FileText, Minus, Plus, ShoppingBag, UtensilsCrossed, X } from "lucide-react";
import Image from "next/image";
import type { Tables } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/client";

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
  // El WhatsApp de pedidos puede ser distinto del de contacto (ej. la caja);
  // si no se configuró uno específico, se usa el de contacto.
  const orderWhatsapp = business.whatsapp_orders || business.whatsapp;
  const [lightbox, setLightbox] = useState<{ url: string; alt: string } | null>(null);
  const [selected, setSelected] = useState<Record<string, { product: Tables<"products">; quantity: number }>>({});

  const [tableId, setTableId] = useState<string | null>(null);
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [tableError, setTableError] = useState<string | null>(null);
  const [isValidatingTable, setIsValidatingTable] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const selectedItems = Object.values(selected);
  const selectedTotal = selectedItems.reduce((sum, item) => sum + (item.product.price ?? 0) * item.quantity, 0);
  const totalItemsCount = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const supabase = createClient();
    const params = new URLSearchParams(window.location.search);
    const mesaParam = params.get("mesa") || params.get("table");
    
    // Si no hay parámetro en la URL, en desarrollo usamos el UUID de prueba de la "Mesa 1"
    const uuidToValidate = mesaParam || 'd0000000-0000-0000-0000-000000000001';

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(uuidToValidate)) {
      setTableError("El código de mesa no es válido.");
      setIsValidatingTable(false);
      return;
    }

    async function validateTable() {
      try {
        const { data, error } = await supabase
          .from("business_tables")
          .select("id, name, is_active")
          .eq("id", uuidToValidate)
          .single();

        if (error || !data) {
          setTableError("No encontramos una mesa con el código escaneado.");
        } else if (!data.is_active) {
          setTableError("Esta mesa se encuentra inactiva temporalmente.");
        } else {
          setTableId(data.id);
          setTableNumber(data.name);
        }
      } catch (err) {
        setTableError("Ocurrió un error al validar la mesa.");
      } finally {
        setIsValidatingTable(false);
      }
    }

    validateTable();
  }, []);

  function addProduct(product: Tables<"products">) {
    setSelected((prev) => ({
      ...prev,
      [product.id]: { product, quantity: 1 }
    }));
  }

  function updateQuantity(productId: string, delta: number) {
    setSelected((prev) => {
      if (!prev[productId]) return prev;
      const next = { ...prev };
      const newQty = next[productId].quantity + delta;
      if (newQty <= 0) {
        delete next[productId];
      } else {
        next[productId] = { ...next[productId], quantity: newQty };
      }
      return next;
    });
  }

  async function handlePlaceOrder() {
    if (!tableNumber) return;
    await submitOrder(tableNumber);
  }

  async function submitOrder(tableNum: string) {
    setIsSubmitting(true);
    const supabase = createClient();
    const orderItems = selectedItems.map((item) => ({
      id: item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
    }));

    try {
      const { error } = await supabase.from("orders").insert({
        business_id: business.id,
        table_number: tableNum,
        table_id: tableId,
        items: orderItems,
        total: selectedTotal,
        status: "pending"
      });

      if (error) throw error;

      setSelected({});
      setShowSuccessModal(true);
    } catch (err: any) {
      alert("Error al enviar el pedido: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

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
      className="min-h-screen flex flex-col relative overflow-x-hidden px-6 py-8 items-center bg-cream text-coffee"
      style={
        {
          "--color-cream": business.color_background,
          "--color-coffee": business.color_text,
          "--color-copper": business.color_primary,
        } as React.CSSProperties
      }
    >
      <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sand/30 via-cream to-cream" />

      <div
        className={`z-10 w-full max-w-sm mx-auto flex flex-col flex-1 ${
          isValidatingTable || tableError ? "justify-center" : ""
        }`}
      >
        {isValidatingTable ? (
          <div className="flex flex-col items-center justify-center flex-1 py-12 text-coffee/60 gap-3">
            <div className="w-8 h-8 border-4 border-copper/30 border-t-copper rounded-full animate-spin" />
            <p className="font-sans text-sm font-medium">Verificando mesa...</p>
          </div>
        ) : tableError ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-5 text-center py-12 px-4">
            <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 border border-red-200 flex items-center justify-center shadow-inner animate-pulse">
              <AlertTriangle size={32} />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-serif text-xl font-bold text-coffee">Mesa no válida</h3>
              <p className="text-sm text-coffee/70 font-sans leading-relaxed max-w-xs">
                {tableError}
              </p>
            </div>
            <p className="text-xs text-coffee/40 font-sans italic max-w-xs leading-snug">
              Por favor, escanea nuevamente el código QR ubicado en tu mesa o solicita ayuda al personal.
            </p>
          </div>
        ) : (
          <>
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
                {category.products.map((product) => {
                  const isSelected = Boolean(selected[product.id]);
                  const currentQty = selected[product.id]?.quantity || 0;
                  return (
                  <div
                    key={product.id}
                    className={`flex items-start gap-3 p-4 backdrop-blur-md rounded-2xl border shadow-sm transition-colors ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-300"
                        : "bg-white/70 border-sand/40"
                    }`}
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
                    <div className="flex-1 min-w-0">
                      <p className="font-sans font-semibold text-coffee">{product.name}</p>
                      {product.description && (
                        <p className="font-sans text-sm text-coffee/60 mt-1">
                          {product.description}
                        </p>
                      )}
                      {product.price !== null && (
                        <p className="font-sans font-semibold text-copper mt-1">
                          {currencyFormatter.format(product.price)}
                        </p>
                      )}
                    </div>
                    {isSelected ? (
                      <div className="shrink-0 self-center flex items-center gap-2 bg-emerald-50 rounded-full border border-emerald-300 p-0.5 shadow-sm">
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, -1)}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-600 text-white active:scale-90 transition-transform"
                          aria-label="Disminuir cantidad"
                        >
                          <Minus size={12} strokeWidth={3} />
                        </button>
                        <span className="font-sans font-semibold text-sm text-coffee w-5 text-center">
                          {currentQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-600 text-white active:scale-90 transition-transform"
                          aria-label="Aumentar cantidad"
                        >
                          <Plus size={12} strokeWidth={3} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addProduct(product)}
                        className="shrink-0 self-center flex items-center gap-1 bg-red-500 hover:bg-red-600 rounded-full px-3.5 py-2 text-xs font-sans font-semibold text-white shadow-sm active:scale-95 transition-all"
                      >
                        <Plus size={14} strokeWidth={2.5} />
                        Agregar
                      </button>
                    )}
                  </div>
                  );
                })}
              </div>
            </motion.section>
            );
          })}
        </motion.div>

        {selectedItems.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mb-8 rounded-3xl border border-emerald-300 bg-emerald-50 p-4"
          >
            <h3 className="font-serif text-xl text-coffee mb-3 border-b border-emerald-200 pb-2">
              Tu pedido
            </h3>
            <div className="flex flex-col gap-2">
              {selectedItems.map(({ product, quantity }) => (
                <div key={product.id} className="flex items-center justify-between gap-3">
                  <span className="font-sans text-sm text-coffee flex items-center gap-1.5">
                    <span className="font-semibold text-emerald-600 bg-emerald-100 rounded px-1.5 py-0.5 text-xs">
                      {quantity}x
                    </span>
                    {product.name}
                  </span>
                  {product.price !== null && (
                    <span className="font-sans text-sm font-semibold text-coffee whitespace-nowrap">
                      {currencyFormatter.format(product.price * quantity)}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-emerald-200">
              <span className="font-sans font-semibold text-coffee">Total</span>
              <span className="font-sans font-semibold text-coffee">
                {currencyFormatter.format(selectedTotal)}
              </span>
            </div>
          </motion.section>
        )}

        <AnimatePresence>
          {selectedItems.length > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="sticky bottom-0 z-40 w-full px-4 pb-4 pt-6 bg-gradient-to-t from-cream via-cream/95 to-transparent mt-auto"
            >
              {tableNumber ? (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handlePlaceOrder}
                  className="flex items-center justify-between gap-3 w-full max-w-sm mx-auto rounded-full bg-copper text-white font-sans font-semibold px-6 py-4 shadow-lg active:scale-[0.98] transition-transform disabled:opacity-75"
                >
                  <span className="flex items-center gap-2">
                    <ShoppingBag size={18} strokeWidth={1.5} />
                    {isSubmitting ? "Enviando pedido..." : `Pedir (${totalItemsCount})`}
                  </span>
                  <span>{currencyFormatter.format(selectedTotal)}</span>
                </button>
              ) : (
                <div className="w-full max-w-sm mx-auto rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 p-4 text-center font-sans text-sm shadow-md">
                  ⚠️ Para realizar un pedido, debes escanear el código QR de tu mesa.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {(business.whatsapp || business.location || safeSocialLinks.length > 0) && (
          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 1 }}
            className="text-center flex flex-col items-center gap-4 mt-8"
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
          </>
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



      {/* Modal de Pedido Exitoso */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl border border-sand/40 flex flex-col items-center gap-4 text-coffee text-center"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                <Check size={32} strokeWidth={2.5} />
              </div>
              <h3 className="font-serif text-xl font-semibold">¡Pedido Recibido!</h3>
              <p className="text-sm text-coffee/60 font-sans">
                Tu pedido está en preparación para la **Mesa {tableNumber}**. 
                ¡Un mozo lo traerá a tu mesa en breve!
              </p>
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="w-full font-sans font-semibold text-sm bg-copper text-white rounded-full py-3.5 hover:opacity-90 active:scale-95 transition-all shadow-md mt-2"
              >
                Entendido
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
