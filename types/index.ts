import type { Session } from '@supabase/supabase-js';

export type TabType = 'calendario' | 'habitos' | 'entrenamiento' | 'finanzas' | 'supermercado';

export type BloqueHabito = 'Mañana' | 'Tarde' | 'Noche';

export interface Gasto {
  id: string;
  concepto: string;
  categoria?: string;
  monto_total: number;
  fecha_vencimiento?: string | null;
  user_id?: string;
}

export interface CuotaAporte {
  id: string;
  gasto_id: string;
  integrante: string;
  monto_cuota: number;
  pagado?: boolean;
  user_id?: string;
}

export interface WeeklyTrainingHabit {
  id: string;
  day_of_week: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo' | string;
  activity: string;
  is_completed: boolean;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Habito {
  id: string;
  nombre: string;
  emoji: string;
  hora: string;
  bloque: BloqueHabito | string;
  frecuencia: string;
  user_id?: string;
}

export interface HabitoRegistro {
  id: string;
  habito_id: string;
  fecha: string;
  completado: boolean;
  user_id?: string;
}

export interface MercadoProducto {
  id: string;
  nombre: string;
  categoria?: string;
  precio_referencia: number;
  unidad: string;
  user_id?: string;
}

export interface MercadoItem {
  id: string;
  producto_nombre: string;
  categoria?: string;
  cantidad: number;
  precio_unitario: number;
  descuento_porcentaje: number;
  comprado: boolean;
  user_id?: string;
  creado_en?: string;
}

export interface CompraHistorialItem {
  nombre: string;
  categoria?: string;
  cantidad: number;
  precio_unitario: number;
  descuento_porcentaje?: number;
  subtotal: number;
}

export interface CompraHistorial {
  id: string;
  gasto_id?: string;
  nombre: string;
  fecha: string;
  creado_en?: string;
  total: number;
  items_count: number;
  items: CompraHistorialItem[];
  user_id?: string;
}

export function limpiarConceptoGasto(concepto?: string | null): string {
  if (!concepto) return '';
  return concepto.split(' ||JGM_COMPRA::')[0].trim();
}

export function extraerCompraDeGasto(gasto: Gasto): CompraHistorial | null {
  if (!gasto?.concepto || !gasto.concepto.includes(' ||JGM_COMPRA::')) {
    return null;
  }
  try {
    const jsonStr = gasto.concepto.split(' ||JGM_COMPRA::')[1];
    const data = JSON.parse(jsonStr);
    return {
      ...data,
      gasto_id: gasto.id,
      total: Number(gasto.monto_total) || data.total,
      fecha: gasto.fecha_vencimiento || data.fecha
    };
  } catch {
    return null;
  }
}

export interface NavItem {
  id: TabType;
  icon: string;
  label: string;
}

export type UserSession = Session | null;
