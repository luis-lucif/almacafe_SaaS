"use client";

import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Clock, CheckCircle, Coffee, Check, Play, Bell, AlertTriangle, ChevronDown, Trash2 } from "lucide-react";
import type { Tables } from "@/lib/supabase/types";
import DeleteOrderModal from "@/components/DeleteOrderModal";

type Order = Tables<"orders">;

interface OrderItem {
  id: string;
  name: string;
  price: number | null;
  quantity: number;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendientes",
  preparing: "En cocina",
  delivered: "Entregados",
  completed: "Completados",
};

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

const dateHeadingFormatter = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function dateHeading(dateKey: string) {
  if (dateKey === new Date().toDateString()) return "Hoy";
  const label = dateHeadingFormatter.format(new Date(dateKey));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "preparing" | "delivered" | "completed">("pending");
  const [toasts, setToasts] = useState<{ id: string; table: string; total: number }[]>([]);
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  const [selectedOrderForDelete, setSelectedOrderForDelete] = useState<Order | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const audioContextAllowed = useRef(false);

  function toggleDay(dateKey: string) {
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  }

  function showOrderToast(order: Order) {
    const toastId = `${order.id}-${Date.now()}`;
    setToasts((prev) => [...prev, { id: toastId, table: order.table_number, total: order.total }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 6000);
  }

  // Inicializar sonido de alerta
  function playNotificationSound() {
    if (!audioContextAllowed.current) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Primer tono (D5)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      gain1.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc1.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 0.4);

      // Segundo tono (A5)
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime);
        gain2.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
        osc2.start(audioCtx.currentTime);
        osc2.stop(audioCtx.currentTime + 0.6);
      }, 120);
    } catch (e) {
      console.error("Audio Context error:", e);
    }
  }

  // Activar audio tras interacción
  useEffect(() => {
    const handleInteraction = () => {
      audioContextAllowed.current = true;
    };
    window.addEventListener("click", handleInteraction);
    window.addEventListener("touchstart", handleInteraction);
    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
    };
  }, []);

  // Fetch inicial
  useEffect(() => {
    const supabase = createClient();

    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!business) return;
      setBusinessId(business.id);

      const { data: initialOrders, error } = await supabase
        .from("orders")
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      if (!error && initialOrders) {
        setOrders(initialOrders);
      }
      setLoading(false);
    }

    loadData();
  }, []);

  // Suscripción Realtime
  useEffect(() => {
    if (!businessId) return;

    const supabase = createClient();

    const channel = supabase
      .channel("admin-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newOrder = payload.new as Order;
            setOrders((prev) => [newOrder, ...prev]);
            if (newOrder.status === "pending") {
              playNotificationSound();
              showOrderToast(newOrder);
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedOrder = payload.new as Order;
            setOrders((prev) =>
              prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
            );
          } else if (payload.eventType === "DELETE") {
            const deletedOrder = payload.old as { id: string };
            setOrders((prev) => prev.filter((o) => o.id !== deletedOrder.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId]);

  // Actualizar estado del pedido
  async function updateOrderStatus(orderId: string, nextStatus: string) {
    const supabase = createClient();
    // Optimista: reflejamos el cambio ya mismo en vez de esperar el evento
    // de Realtime (que puede tardar o no estar habilitado para esta tabla).
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    );
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: nextStatus })
        .eq("id", orderId);

      if (error) throw error;
    } catch (err: any) {
      alert("Error al actualizar pedido: " + err.message);
    }
  }

  // Abrir modal de confirmación para eliminar
  function requestDeleteOrder(order: Order) {
    setDeleteError(null);
    setSelectedOrderForDelete(order);
  }

  // Eliminar un pedido (solo permitido para pendientes o en preparación)
  async function confirmDeleteOrder() {
    if (!selectedOrderForDelete) return;
    const orderId = selectedOrderForDelete.id;

    const supabase = createClient();
    // Optimista: lo sacamos de pantalla inmediatamente
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    setSelectedOrderForDelete(null);

    try {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      if (error) throw error;
    } catch (err: any) {
      setDeleteError(err.message);
      // Revertir si hay error volviendo a consultar
      const { data } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setOrders(data);
    }
  }

  function renderOrderCard(order: Order) {
    const items = (order.items as unknown as OrderItem[]) || [];
    const timeAgo = Math.max(0, Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000));

    return (
      <div
        key={order.id}
        className="flex flex-col bg-white/70 backdrop-blur-md border border-sand/40 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
      >
        {/* Header Card */}
        <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-sand/30">
          <div>
            <h3 className="font-serif text-lg font-bold text-coffee">
              {order.table_number.toLowerCase().startsWith("mesa") || order.table_number.toLowerCase().startsWith("barra")
                ? order.table_number
                : `Mesa ${order.table_number}`}
            </h3>
            <span className="flex items-center gap-1 text-xs text-coffee/60 font-sans mt-0.5">
              <Clock size={12} />
              Hace {timeAgo} min
            </span>
          </div>
          <span className="font-sans font-semibold text-copper text-base">
            {currencyFormatter.format(order.total)}
          </span>
        </div>

        {/* Items */}
        <div className="flex flex-col gap-2 flex-1 mb-4">
          {items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-start text-sm">
              <span className="font-sans text-coffee">
                {item.name} <span className="text-coffee/40 font-medium">x{item.quantity || 1}</span>
              </span>
              {item.price !== null && (
                <span className="font-sans text-coffee/60 font-medium">
                  {currencyFormatter.format((item.price ?? 0) * (item.quantity || 1))}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Footer / Actions */}
        <div className="mt-auto pt-3 border-t border-sand/30 flex items-center justify-between gap-2">
          {(order.status === "pending" || order.status === "preparing") && (
            <button
              onClick={() => requestDeleteOrder(order)}
              className="flex items-center gap-1.5 text-xs font-sans font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 active:scale-95 transition-all rounded-full px-2.5 py-1.5 border border-transparent hover:border-red-100"
              title="Eliminar Pedido"
            >
              <Trash2 size={14} />
              <span>Eliminar</span>
            </button>
          )}
          
          <div className="flex gap-2 ml-auto">
            {order.status === "pending" && (
              <button
                onClick={() => updateOrderStatus(order.id, "preparing")}
                className="flex items-center gap-1 text-xs font-sans font-semibold bg-copper text-white rounded-full px-4 py-2 hover:opacity-90 active:scale-95 transition-all shadow-sm"
              >
                <Play size={12} fill="white" />
                Preparar
              </button>
            )}
            {order.status === "preparing" && (
              <button
                onClick={() => updateOrderStatus(order.id, "delivered")}
                className="flex items-center gap-1 text-xs font-sans font-semibold bg-emerald-500 text-white rounded-full px-4 py-2 hover:bg-emerald-600 active:scale-95 transition-all shadow-sm"
              >
                <Check size={12} strokeWidth={3} />
                Entregar
              </button>
            )}
            {order.status === "delivered" && (
              <button
                onClick={() => updateOrderStatus(order.id, "completed")}
                className="flex items-center gap-1 text-xs font-sans font-semibold bg-coffee text-white rounded-full px-4 py-2 hover:opacity-90 active:scale-95 transition-all shadow-sm"
              >
                <CheckCircle size={12} />
                Cobrar / Cerrar
              </button>
            )}
            {order.status === "completed" && (
              <span className="text-xs font-sans font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle size={14} />
                Pedido Completado
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Filtrar pedidos
  const filteredOrders = orders.filter((o) => o.status === activeTab);

  // Agrupar por día (solo tiene sentido en Completados, que acumula historial)
  const ordersByDay: { dateKey: string; orders: Order[] }[] = [];
  if (activeTab === "completed") {
    const groups = new Map<string, Order[]>();
    for (const order of filteredOrders) {
      const dateKey = new Date(order.created_at).toDateString();
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey)!.push(order);
    }
    for (const [dateKey, dayOrders] of groups) {
      ordersByDay.push({ dateKey, orders: dayOrders });
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-coffee/60">
        <p className="font-sans text-sm animate-pulse">Cargando panel de pedidos...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-semibold mb-1">Pedidos de las Mesas</h1>
          <p className="text-coffee/60 text-sm">Monitorea y despacha las ordenes en tiempo real.</p>
        </div>
        {!audioContextAllowed.current && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 font-medium">
            <AlertTriangle size={14} />
            Haz clic en la pantalla para activar sonido de alertas.
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-sand/40 gap-2 overflow-x-auto pb-px">
        {(["pending", "preparing", "delivered", "completed"] as const).map((status) => {
          const count = orders.filter((o) => o.status === status).length;
          const isActive = activeTab === status;
          return (
            <button
              key={status}
              onClick={() => setActiveTab(status)}
              className={`px-4 py-2 text-sm font-sans font-medium border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? "border-copper text-copper font-semibold"
                  : "border-transparent text-coffee/60 hover:text-coffee"
              }`}
            >
              {STATUS_LABELS[status]} ({count})
            </button>
          );
        })}
      </div>

      {/* Listado de pedidos */}
      {filteredOrders.length === 0 ? (
        <div className="py-12 text-center rounded-2xl border border-dashed border-sand/60 text-coffee/50">
          <Coffee className="mx-auto mb-3 opacity-40" size={32} strokeWidth={1.5} />
          <p className="font-sans text-sm">No hay pedidos en esta sección por ahora.</p>
        </div>
      ) : activeTab === "completed" ? (
        <div className="flex flex-col gap-6">
          {ordersByDay.map(({ dateKey, orders: dayOrders }) => {
            const isCollapsed = collapsedDays.has(dateKey);
            return (
              <div key={dateKey} className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => toggleDay(dateKey)}
                  className="flex items-center justify-between gap-2 border-b border-sand/40 pb-2 text-left group"
                >
                  <h4 className="font-serif text-base text-coffee/80 group-hover:text-coffee transition-colors">
                    {dateHeading(dateKey)}{" "}
                    <span className="text-xs text-coffee/40 font-sans">({dayOrders.length})</span>
                  </h4>
                  <ChevronDown
                    size={16}
                    className={`text-coffee/50 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                  />
                </button>
                {!isCollapsed && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dayOrders.map((order) => renderOrderCard(order))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOrders.map((order) => renderOrderCard(order))}
        </div>
      )}

      {/* Modal de confirmación para eliminar */}
      <DeleteOrderModal
        open={selectedOrderForDelete !== null}
        onClose={() => { setSelectedOrderForDelete(null); setDeleteError(null); }}
        onConfirm={confirmDeleteOrder}
        order={selectedOrderForDelete ? {
          table_number: selectedOrderForDelete.table_number,
          total: selectedOrderForDelete.total,
          items: (selectedOrderForDelete.items as any[]) || [],
          created_at: selectedOrderForDelete.created_at,
        } : null}
        error={deleteError}
      />

      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-xs">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="flex items-center gap-3 bg-coffee text-white rounded-2xl shadow-xl px-4 py-3"
            >
              <div className="shrink-0 w-9 h-9 rounded-full bg-copper/20 flex items-center justify-center">
                <Bell size={16} className="text-copper" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-sans text-sm font-semibold">
                  {toast.table.toLowerCase().startsWith("mesa") || toast.table.toLowerCase().startsWith("barra")
                    ? `${toast.table} pidió`
                    : `Mesa ${toast.table} pidió`}
                </p>
                <p className="font-sans text-xs text-white/70">{currencyFormatter.format(toast.total)}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
