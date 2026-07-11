"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Trash2, Clock } from "lucide-react";

interface OrderItem {
  id: string;
  name: string;
  price: number | null;
  quantity: number;
}

interface DeleteOrderModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Información del pedido a eliminar */
  order: {
    table_number: string;
    total: number;
    items: OrderItem[];
    created_at: string;
  } | null;
  /** Mensaje de error opcional si falló la eliminación */
  error?: string | null;
}

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

export default function DeleteOrderModal({
  open,
  onClose,
  onConfirm,
  order,
  error,
}: DeleteOrderModalProps) {
  // Cerrar con Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Prevenir scroll del fondo
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!order) return null;

  const timeAgo = Math.max(
    0,
    Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000)
  );

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="relative w-full max-w-md bg-cream border border-sand/50 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-coffee/40 hover:text-coffee hover:bg-coffee/5 transition-colors"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="pt-8 pb-4 px-7 text-center">
              <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
                <AlertTriangle size={26} className="text-red-500" />
              </div>
              <h2 className="font-serif text-xl font-bold text-coffee">
                Eliminar pedido
              </h2>
              <p className="font-sans text-sm text-coffee/60 mt-1">
                Esta acción no se puede deshacer.
              </p>
            </div>

            {/* Order Summary */}
            <div className="mx-6 p-4 rounded-2xl bg-coffee/[0.03] border border-sand/30">
              <div className="flex items-center justify-between mb-3">
                <span className="font-serif font-semibold text-coffee text-base">
                  {order.table_number.toLowerCase().startsWith("mesa") ||
                  order.table_number.toLowerCase().startsWith("barra")
                    ? order.table_number
                    : `Mesa ${order.table_number}`}
                </span>
                <span className="font-sans font-bold text-copper">
                  {currencyFormatter.format(order.total)}
                </span>
              </div>

              {/* Items */}
              <div className="flex flex-col gap-1.5 mb-3">
                {order.items.slice(0, 4).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between text-sm font-sans"
                  >
                    <span className="text-coffee/80">
                      {item.name}{" "}
                      <span className="text-coffee/40">
                        x{item.quantity || 1}
                      </span>
                    </span>
                    {item.price !== null && (
                      <span className="text-coffee/50">
                        {currencyFormatter.format(
                          (item.price ?? 0) * (item.quantity || 1)
                        )}
                      </span>
                    )}
                  </div>
                ))}
                {order.items.length > 4 && (
                  <span className="text-xs text-coffee/40 font-sans">
                    +{order.items.length - 4} productos más
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 text-xs text-coffee/40 font-sans pt-2 border-t border-sand/20">
                <Clock size={12} />
                Hace {timeAgo} min
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mx-6 mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-sans flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 p-6 pt-4">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl font-sans font-semibold text-sm text-coffee/70 bg-coffee/[0.04] border border-sand/30 hover:bg-coffee/[0.08] active:scale-[0.98] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-3 px-4 rounded-xl font-sans font-semibold text-sm text-white bg-red-500 hover:bg-red-600 active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <Trash2 size={14} />
                Eliminar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
