export const CATEGORY_SECTIONS = [
  { value: "menu_del_dia", label: "Menú del día" },
  { value: "destacados", label: "Destacados" },
  { value: "combos", label: "Combos" },
  { value: "productos", label: "Productos" },
] as const;

export type CategorySection = (typeof CATEGORY_SECTIONS)[number]["value"];

const PRIORITY: Record<string, number> = {
  menu_del_dia: 0,
  destacados: 1,
  combos: 2,
  productos: 3,
};

export function sectionPriority(section: string): number {
  return PRIORITY[section] ?? PRIORITY.productos;
}

export function sectionLabel(section: string): string {
  return CATEGORY_SECTIONS.find((s) => s.value === section)?.label ?? "Productos";
}
