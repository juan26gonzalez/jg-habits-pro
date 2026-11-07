/**
 * Utilidades para manejo de fechas y zona horaria de Colombia (America/Bogota, UTC-5).
 */

export const ZONA_HORARIA_COLOMBIA = 'America/Bogota';

/**
 * Obtiene la fecha actual en formato "YYYY-MM-DD" en la zona horaria de Colombia.
 */
export function getFechaColombia(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { 
    timeZone: ZONA_HORARIA_COLOMBIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

/**
 * Obtiene las partes de la fecha actual en Colombia:
 * - fechaStr: "YYYY-MM-DD" (ej. "2026-11-02")
 * - anio: ej. 2026
 * - mes: 0 a 11 (0 = Enero, 10 = Noviembre), para compatibilidad con Date/calendarios
 * - dia: 1 a 31
 * - diaSemana: 0 = Domingo, 1 = Lunes, ... 6 = Sábado
 */
export function getFechaActualColombia(date: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_HORARIA_COLOMBIA,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short'
  });

  const parts = formatter.formatToParts(date);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  const anio = parseInt(partMap.year, 10);
  const mes = parseInt(partMap.month, 10) - 1; // 0-indexed para compatibilidad con Date
  const dia = parseInt(partMap.day, 10);

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  };
  const diaSemana = weekdayMap[partMap.weekday] ?? 0;

  const fechaStr = getFechaColombia(date);

  return { fechaStr, anio, mes, dia, diaSemana };
}

/**
 * Suma o resta días a una fecha en formato "YYYY-MM-DD", preservando el cálculo en Colombia.
 */
export function sumarDiasFechaStr(fechaStr: string, dias: number): string {
  const [y, m, d] = fechaStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d + dias, 12, 0, 0);
  return getFechaColombia(dateObj);
}

/**
 * Avanza exactamente un mes a la misma fecha del día (ej. 2026-11-15 -> 2026-12-15).
 * Si el mes destino tiene menos días (ej. 31 de Enero a Febrero), ajusta al último día del mes.
 */
export function sumarUnMesMismaFecha(fechaStr?: string | null): string {
  if (!fechaStr) {
    fechaStr = getFechaColombia();
  }
  const [y, m, d] = fechaStr.split('-').map(Number);
  let nuevoAnio = y;
  let nuevoMes = m + 1; // 1-indexed (m es 1-12)
  if (nuevoMes > 12) {
    nuevoMes = 1;
    nuevoAnio += 1;
  }
  // Último día válido en el mes destino (año, mes, 0 da el último día del mes)
  const maxDias = new Date(nuevoAnio, nuevoMes, 0).getDate();
  const nuevoDia = Math.min(d, maxDias);

  const mStr = String(nuevoMes).padStart(2, '0');
  const dStr = String(nuevoDia).padStart(2, '0');
  return `${nuevoAnio}-${mStr}-${dStr}`;
}

/**
 * Obtiene el nombre del mes y año legible (ej. "Noviembre 2026")
 */
export function obtenerMesAnioTexto(fechaStr: string): string {
  if (!fechaStr) return '';
  const nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const [y, m] = fechaStr.split('-').map(Number);
  if (!y || !m || m < 1 || m > 12) return fechaStr;
  return `${nombresMeses[m - 1]} ${y}`;
}

/**
 * Formatea una fecha en texto completo legible en español.
 */
export function formatearFechaBonita(fechaStr: string): string {
  if (!fechaStr) return '';
  const [y, m, d] = fechaStr.split('-').map(Number);
  if (!y || !m || !d) return fechaStr;
  const diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const diaSemanaIndex = new Date(y, m - 1, d, 12, 0, 0).getDay();
  return `${diasNombres[diaSemanaIndex]}, ${d} de ${nombresMeses[m - 1]} de ${y}`;
}
