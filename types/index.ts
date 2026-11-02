import type { Session } from '@supabase/supabase-js';

export type TabType = 'calendario' | 'habitos' | 'finanzas' | 'supermercado';

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

export interface NavItem {
  id: TabType;
  icon: string;
  label: string;
}

export type UserSession = Session | null;
