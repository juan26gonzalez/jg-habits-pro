import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import TarjetaFinanzas from './TarjetaFinanzas';
import { 
  limpiarConceptoGasto, 
  esGastoPagoCubierto, 
  esGastoCompraGrocery, 
  extraerPagoCubiertoDeGasto, 
  serializarPagoCubierto 
} from '@/types';
import { 
  sumarUnMesMismaFecha, 
  obtenerMesAnioTexto, 
  formatearFechaBonita 
} from '@/lib/dateUtils';
import type { Gasto, CuotaAporte, UserSession, PagoCubierto, AporteDetalle } from '@/types';

interface FinancesTabProps {
  gastos: Gasto[];
  cuotasFamilia: CuotaAporte[];
  setCuotasFamilia: React.Dispatch<React.SetStateAction<CuotaAporte[]>>;
  sesion: UserSession;
  strHoy: string;
  onGastoAgregado: () => void;
}

// Paleta minimalista de marrón de alta calidad
const coloresCategorias = [
  'bg-[#2D1C14]', 
  'bg-[#4A3225]', 
  'bg-[#6F4A39]', 
  'bg-[#8D624D]', 
  'bg-[#AB7F68]', 
  'bg-[#3E271D]', 
  'bg-[#55382B]', 
  'bg-[#C89F89]'
];

export default function FinancesTab({ 
  gastos, 
  cuotasFamilia, 
  setCuotasFamilia, 
  sesion, 
  strHoy, 
  onGastoAgregado 
}: FinancesTabProps) {
  // Sub-pestaña activa: 'activos' (Compromisos del Mes) o 'cubiertos' (Pagos Cubiertos)
  const [submodulo, setSubmodulo] = useState<'activos' | 'cubiertos'>('activos');

  // Filtros y búsquedas
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendientes' | 'urgentes' | 'cubiertos'>('todos');
  const [mesFiltroCubiertos, setMesFiltroCubiertos] = useState<string>('todos');

  // Formulario nuevo compromiso
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [concepto, setConcepto] = useState('');
  const [categoria, setCategoria] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Estados de acción y notificación
  const [renovandoTodos, setRenovandoTodos] = useState(false);
  const [notificacionToast, setNotificacionToast] = useState<string | null>(null);

  // Backup en localStorage para pagos cubiertos
  const [pagosCubiertosLocales, setPagosCubiertosLocales] = useState<PagoCubierto[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && sesion?.user?.id) {
      try {
        const guardados = JSON.parse(localStorage.getItem(`jgm_pagos_cubiertos_${sesion.user.id}`) || '[]');
        if (Array.isArray(guardados)) setPagosCubiertosLocales(guardados);
      } catch {
        // Ignorar error de parsing
      }
    }
  }, [sesion?.user?.id]);

  // 1. Filtrar compromisos activos (excluyendo registros de pagos cubiertos y compras de supermercado)
  const gastosActivos = gastos.filter(g => !esGastoPagoCubierto(g) && !esGastoCompraGrocery(g));

  // 2. Extraer pagos cubiertos combinando Supabase cloud y localStorage backup
  const pagosCubiertosDesdeNube = gastos
    .map(extraerPagoCubiertoDeGasto)
    .filter((p): p is PagoCubierto => p !== null);

  const todosLosPagosCubiertos: PagoCubierto[] = [
    ...pagosCubiertosDesdeNube, 
    ...pagosCubiertosLocales
  ].reduce<PagoCubierto[]>((acc, item) => {
    if (!acc.some(p => p.id === item.id)) {
      acc.push(item);
    }
    return acc;
  }, []).sort((a, b) => (b.fecha_cubierto || '').localeCompare(a.fecha_cubierto || ''));

  // Meses únicos disponibles en los pagos cubiertos para el filtro
  const mesesDisponiblesCubiertos = Array.from(
    new Set(todosLosPagosCubiertos.map(p => p.mes_cubierto || obtenerMesAnioTexto(p.fecha_cubierto || p.fecha_vencimiento_original)))
  ).filter(Boolean);

  // 3. Cálculos de Presupuesto para Compromisos Activos
  const categoriasGastos = gastosActivos.reduce((acc: Record<string, number>, g: Gasto) => {
    const cat = g?.categoria || 'General';
    acc[cat] = (acc[cat] || 0) + (Number(g?.monto_total) || 0);
    return acc;
  }, {});

  const totalGastosMes = gastosActivos.reduce((sum: number, g: Gasto) => sum + (Number(g?.monto_total) || 0), 0);

  // Sumatoria total de aportes por cada persona en los compromisos activos
  const totalesPorPersona = cuotasFamilia.reduce((acc: Record<string, { total: number; cuotasCount: number; gastosIds: Set<string> }>, cuota) => {
    const rawNombre = cuota.integrante?.trim();
    if (!rawNombre) return acc;
    const nombre = rawNombre.charAt(0).toUpperCase() + rawNombre.slice(1);
    
    if (!acc[nombre]) {
      acc[nombre] = { total: 0, cuotasCount: 0, gastosIds: new Set<string>() };
    }
    acc[nombre].total += Number(cuota.monto_cuota) || 0;
    acc[nombre].cuotasCount += 1;
    if (cuota.gasto_id) acc[nombre].gastosIds.add(cuota.gasto_id);
    return acc;
  }, {});

  const totalAportadoGeneral = Object.values(totalesPorPersona).reduce((sum, p) => sum + p.total, 0);
  const personasOrdenadas = Object.entries(totalesPorPersona).sort((a, b) => b[1].total - a[1].total);

  // Identificar qué compromisos activos ya están cubiertos al 100%
  const gastosCubiertosPendientesRenovar = gastosActivos.filter(g => {
    const aps = cuotasFamilia.filter(c => c.gasto_id === g.id);
    const totalAportes = aps.reduce((sum, ap) => sum + (Number(ap.monto_cuota) || 0), 0);
    return Number(g.monto_total) > 0 && totalAportes >= Number(g.monto_total);
  });

  // Manejadores de Aportes
  function handleAporteAgregado(nuevoAporte: CuotaAporte) {
    setCuotasFamilia(prev => [...prev, nuevoAporte]);
  }

  function handleAporteActualizado(aporteActualizado: CuotaAporte) {
    setCuotasFamilia(prev => prev.map(c => c.id === aporteActualizado.id ? aporteActualizado : c));
  }

  function handleAporteEliminado(aporteId: string) {
    setCuotasFamilia(prev => prev.filter(c => c.id !== aporteId));
  }

  // Agregar nuevo compromiso financiero
  async function agregarGasto(e: React.FormEvent) {
    e.preventDefault();
    if (!concepto || !monto || !sesion?.user?.id) return;
    setGuardando(true);
    const { error } = await supabase.from('finanzas_gastos').insert([{ 
      concepto, 
      categoria: categoria || 'General', 
      monto_total: Number(monto), 
      fecha_vencimiento: fecha || null, 
      user_id: sesion.user.id 
    }]);

    setGuardando(false);
    if (error) {
      alert(`Error al guardar: ${error.message}`);
    } else {
      setConcepto('');
      setCategoria('');
      setMonto('');
      setFecha('');
      setMostrarFormulario(false);
      onGastoAgregado();
    }
  }

  // =========================================================================
  // 🔄 RENOVAR COMPROMISO AL PRÓXIMO MES Y GUARDAR EN "PAGOS CUBIERTOS"
  // =========================================================================
  async function renovarGastoAlProximoMes(gasto: Gasto, aportesGastoParam?: CuotaAporte[]) {
    if (!sesion?.user?.id || !gasto?.id) return;

    const aps = aportesGastoParam || cuotasFamilia.filter(c => c.gasto_id === gasto.id);
    const aportesDetalle: AporteDetalle[] = aps.map(a => ({
      integrante: a.integrante,
      monto: Number(a.monto_cuota) || 0
    }));

    // Siguiente fecha de vencimiento (mismo día del próximo mes)
    const proximaFecha = sumarUnMesMismaFecha(gasto.fecha_vencimiento);
    const mesCubiertoNombre = obtenerMesAnioTexto(gasto.fecha_vencimiento || strHoy);

    // 1. Crear el objeto de Pago Cubierto para archivar
    const nuevoPagoCubierto: Omit<PagoCubierto, 'id'> = {
      gasto_origen_id: gasto.id,
      concepto: limpiarConceptoGasto(gasto.concepto),
      categoria: gasto.categoria || 'General',
      monto_total: Number(gasto.monto_total),
      fecha_vencimiento_original: gasto.fecha_vencimiento || strHoy,
      fecha_cubierto: strHoy,
      mes_cubierto: mesCubiertoNombre,
      proxima_fecha_renovada: proximaFecha,
      aportes: aportesDetalle,
      user_id: sesion.user.id
    };

    // 2. Guardar en Supabase finanzas_gastos como registro cubierto
    const conceptoSerializado = serializarPagoCubierto(nuevoPagoCubierto);
    const { data: dataInsertada } = await supabase.from('finanzas_gastos').insert([{
      concepto: conceptoSerializado,
      categoria: gasto.categoria || 'General',
      monto_total: Number(gasto.monto_total),
      fecha_vencimiento: gasto.fecha_vencimiento || strHoy,
      user_id: sesion.user.id
    }]).select();

    // Guardar en localStorage backup
    const idHistorial = dataInsertada?.[0]?.id || `cubierto-${Date.now()}`;
    const pagoGuardado: PagoCubierto = { ...nuevoPagoCubierto, id: idHistorial };
    setPagosCubiertosLocales(prev => {
      const actualizados = [pagoGuardado, ...prev.filter(p => p.id !== idHistorial)];
      if (typeof window !== 'undefined') {
        localStorage.setItem(`jgm_pagos_cubiertos_${sesion.user.id}`, JSON.stringify(actualizados));
      }
      return actualizados;
    });

    // 3. Actualizar la fecha del gasto activo al mismo día del próximo mes
    await supabase
      .from('finanzas_gastos')
      .update({ fecha_vencimiento: proximaFecha })
      .eq('id', gasto.id);

    // 4. Limpiar los aportes del ciclo cubierto para reiniciar el nuevo mes en 0
    await supabase
      .from('finanzas_cuotas_familia')
      .delete()
      .eq('gasto_id', gasto.id);

    // 5. Notificación y recarga
    setNotificacionToast(`🎉 "${limpiarConceptoGasto(gasto.concepto)}" fue guardado en Pagos Cubiertos y programado para el ${formatearFechaBonita(proximaFecha)}.`);
    setTimeout(() => setNotificacionToast(null), 6000);

    onGastoAgregado();
  }

  // Renovar todos los compromisos cubiertos en 1 clic
  async function renovarTodosLosCubiertos() {
    if (gastosCubiertosPendientesRenovar.length === 0) return;
    const confirmacion = confirm(`¿Deseas archivar los ${gastosCubiertosPendientesRenovar.length} pagos cubiertos en el historial y renovarlos para la misma fecha del próximo mes?`);
    if (!confirmacion) return;

    setRenovandoTodos(true);
    for (const gasto of gastosCubiertosPendientesRenovar) {
      await renovarGastoAlProximoMes(gasto);
    }
    setRenovandoTodos(false);
  }

  // Reabrir o deshacer un pago cubierto al activo
  async function restaurarPagoCubiertoAlActivo(pago: PagoCubierto) {
    const confirmacion = confirm(`¿Deseas reabrir "${pago.concepto}" y restaurar su fecha anterior (${pago.fecha_vencimiento_original}) en tus compromisos activos?`);
    if (!confirmacion) return;

    if (pago.gasto_origen_id) {
      // 1. Restaurar fecha de vencimiento anterior
      await supabase
        .from('finanzas_gastos')
        .update({ fecha_vencimiento: pago.fecha_vencimiento_original })
        .eq('id', pago.gasto_origen_id);

      // 2. Restaurar cuotas/aportes si existían
      if (pago.aportes && pago.aportes.length > 0 && sesion?.user?.id) {
        const cuotasRestaurar = pago.aportes.map(ap => ({
          gasto_id: pago.gasto_origen_id as string,
          integrante: ap.integrante,
          monto_cuota: ap.monto,
          pagado: true,
          user_id: sesion.user.id
        }));
        await supabase.from('finanzas_cuotas_familia').insert(cuotasRestaurar);
      }
    }

    // 3. Eliminar registro del historial en Supabase
    await supabase.from('finanzas_gastos').delete().eq('id', pago.id);

    // 4. Actualizar localStorage
    setPagosCubiertosLocales(prev => {
      const filtrados = prev.filter(p => p.id !== pago.id);
      if (typeof window !== 'undefined' && sesion?.user?.id) {
        localStorage.setItem(`jgm_pagos_cubiertos_${sesion.user.id}`, JSON.stringify(filtrados));
      }
      return filtrados;
    });

    setNotificacionToast(`↩️ "${pago.concepto}" fue reabierto y devuelto a Compromisos Activos.`);
    setTimeout(() => setNotificacionToast(null), 5000);

    onGastoAgregado();
  }

  // Eliminar un pago cubierto del historial permanentemente
  async function eliminarPagoCubierto(pagoId: string) {
    const confirmacion = confirm("¿Deseas eliminar este registro histórico permanentemente?");
    if (!confirmacion) return;

    await supabase.from('finanzas_gastos').delete().eq('id', pagoId);

    setPagosCubiertosLocales(prev => {
      const filtrados = prev.filter(p => p.id !== pagoId);
      if (typeof window !== 'undefined' && sesion?.user?.id) {
        localStorage.setItem(`jgm_pagos_cubiertos_${sesion.user.id}`, JSON.stringify(filtrados));
      }
      return filtrados;
    });

    onGastoAgregado();
  }

  // Filtrado de compromisos activos
  const gastosFiltrados = gastosActivos.filter(g => {
    const conceptoLimpio = limpiarConceptoGasto(g.concepto);
    const coincideTexto = conceptoLimpio.toLowerCase().includes(busqueda.toLowerCase()) || 
                          (g.categoria && g.categoria.toLowerCase().includes(busqueda.toLowerCase()));
    if (!coincideTexto) return false;

    if (filtroEstado === 'todos') return true;

    const aps = cuotasFamilia.filter(c => c.gasto_id === g.id);
    const totalAps = aps.reduce((sum, ap) => sum + (Number(ap.monto_cuota) || 0), 0);
    const estaCubierto = Number(g.monto_total) > 0 && totalAps >= Number(g.monto_total);

    if (filtroEstado === 'cubiertos') return estaCubierto;
    if (filtroEstado === 'pendientes') return !estaCubierto;

    let diasParaVencer = 0;
    let esUrgente = false;
    let estaVencido = false;
    if (g.fecha_vencimiento && strHoy) {
      const fVenc = new Date(`${g.fecha_vencimiento}T12:00:00`);
      const fHoy = new Date(`${strHoy}T12:00:00`);
      diasParaVencer = Math.ceil((fVenc.getTime() - fHoy.getTime()) / (1000 * 60 * 60 * 24));
      esUrgente = diasParaVencer >= 0 && diasParaVencer <= 3;
      estaVencido = diasParaVencer < 0;
    }

    if (filtroEstado === 'urgentes') {
      return (esUrgente || estaVencido) && !estaCubierto;
    }

    return true;
  });

  // Filtrado de pagos cubiertos
  const pagosCubiertosFiltrados = todosLosPagosCubiertos.filter(p => {
    const coincideTexto = p.concepto.toLowerCase().includes(busqueda.toLowerCase()) ||
                          p.categoria.toLowerCase().includes(busqueda.toLowerCase()) ||
                          p.aportes.some(a => a.integrante.toLowerCase().includes(busqueda.toLowerCase()));
    if (!coincideTexto) return false;

    if (mesFiltroCubiertos === 'todos') return true;
    const mesP = p.mes_cubierto || obtenerMesAnioTexto(p.fecha_cubierto || p.fecha_vencimiento_original);
    return mesP === mesFiltroCubiertos;
  });

  const totalHistoricoCubiertos = pagosCubiertosFiltrados.reduce((sum, p) => sum + p.monto_total, 0);

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-6">
      
      {/* Toast de Notificación */}
      {notificacionToast && (
        <div className="bg-[#2D1C14] text-white p-4 rounded-3xl border border-[#4A3225] shadow-[0_8px_24px_rgba(45,28,20,0.2)] flex items-center justify-between gap-3 animate-fade-in sticky top-4 z-40">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl shrink-0">✨</span>
            <p className="text-xs sm:text-sm font-bold tracking-tight text-[#FAF7F4] truncate">
              {notificacionToast}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setNotificacionToast(null)}
            className="text-xs font-bold text-[#E5C8B4] hover:text-white px-2 py-1 shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Selector de Sub-pestaña: Compromisos Activos vs Pagos Cubiertos */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-1.5 bg-[#FAF5F0] p-1.5 rounded-2xl border border-[#EADBCE]/80 text-xs font-bold shadow-2xs">
          <button
            type="button"
            onClick={() => setSubmodulo('activos')}
            className={`px-4 py-2.5 rounded-xl transition-all active:scale-95 flex items-center gap-2 ${
              submodulo === 'activos'
                ? 'bg-[#2D1C14] text-white shadow-xs'
                : 'text-[#8D6B57] hover:text-[#2D1C14]'
            }`}
          >
            <span>💳 Compromisos del Mes</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold ${
              submodulo === 'activos' ? 'bg-white/20 text-white' : 'bg-white text-[#6F4A39] border border-[#EADBCE]/60'
            }`}>
              {gastosActivos.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubmodulo('cubiertos')}
            className={`px-4 py-2.5 rounded-xl transition-all active:scale-95 flex items-center gap-2 ${
              submodulo === 'cubiertos'
                ? 'bg-[#2D1C14] text-white shadow-xs'
                : 'text-[#8D6B57] hover:text-[#2D1C14]'
            }`}
          >
            <span>✅ Pagos Cubiertos</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold ${
              submodulo === 'cubiertos' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}>
              {todosLosPagosCubiertos.length}
            </span>
          </button>
        </div>

        {submodulo === 'activos' && (
          <button 
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            className="bg-[#2D1C14] hover:bg-[#3E271D] text-white font-bold px-4 py-2.5 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xs text-xs self-stretch sm:self-auto"
          >
            <span>{mostrarFormulario ? '✕ Cerrar' : '➕ Nuevo Gasto'}</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: COMPROMISOS DEL MES (ACTIVOS) */}
      {/* ========================================================================= */}
      {submodulo === 'activos' ? (
        <>
          {/* Banner de Compromisos 100% Cubiertos listos para renovar */}
          {gastosCubiertosPendientesRenovar.length > 0 && (
            <div className="bg-emerald-50/90 border border-emerald-200/90 text-emerald-950 p-4 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-2xs animate-fade-in">
              <div className="flex items-start sm:items-center gap-2.5">
                <span className="text-2xl shrink-0">✨</span>
                <div>
                  <p className="text-sm font-black text-emerald-950">
                    Tienes {gastosCubiertosPendientesRenovar.length} {gastosCubiertosPendientesRenovar.length === 1 ? 'pago cubierto' : 'pagos cubiertos'} al 100% este mes
                  </p>
                  <p className="text-xs text-emerald-800/90 mt-0.5">
                    Puedes guardarlos en <strong>Pagos Cubiertos</strong> y renovarlos para la misma fecha del próximo mes en 1 clic.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={renovarTodosLosCubiertos}
                disabled={renovandoTodos}
                className="w-full sm:w-auto px-4 py-2.5 bg-[#2D1C14] hover:bg-[#3E271D] text-white rounded-xl text-xs font-bold active:scale-95 transition-all shadow-xs shrink-0 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>🔄</span>
                <span>{renovandoTodos ? 'Renovando...' : `Renovar ${gastosCubiertosPendientesRenovar.length === 1 ? 'el pago' : `los ${gastosCubiertosPendientesRenovar.length} pagos`}`}</span>
              </button>
            </div>
          )}

          {/* Distribución del Presupuesto Total */}
          {gastosActivos.length > 0 && (
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_2px_16px_rgba(45,28,20,0.03)] border border-[#EADBCE]/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8D6B57] block mb-1">
                Distribución del Presupuesto Activo
              </span>
              <p className="text-3xl md:text-4xl font-extrabold text-[#2D1C14] mb-6 tracking-tight">
                ${totalGastosMes.toLocaleString('es-CO')}
              </p>
              
              <div className="w-full h-3 rounded-full flex overflow-hidden mb-4 bg-[#FAF5F0]">
                {Object.entries(categoriasGastos).map(([cat, montoCat], i) => {
                  const valorMonto = Number(montoCat) || 0;
                  return (
                    <div 
                      key={cat} 
                      title={`${cat}: $${valorMonto.toLocaleString()}`} 
                      className={`h-full transition-all duration-700 ${coloresCategorias[i % coloresCategorias.length]}`} 
                      style={{ width: `${totalGastosMes > 0 ? (valorMonto / totalGastosMes) * 100 : 0}%` }}
                    ></div>
                  );
                })}
              </div>
              
              <div className="flex flex-wrap gap-2">
                {Object.entries(categoriasGastos).map(([cat, montoCat], i) => {
                  const valorMonto = Number(montoCat) || 0;
                  return (
                    <div key={cat} className="flex items-center gap-1.5 text-xs font-bold text-[#4A3225] bg-[#FAF5F0] px-2.5 py-1 rounded-lg border border-[#EADBCE]/60">
                      <span className={`w-2 h-2 rounded-full ${coloresCategorias[i % coloresCategorias.length]}`}></span>
                      {cat} <span className="text-[#8D6B57] font-medium ml-0.5">{totalGastosMes > 0 ? ((valorMonto / totalGastosMes) * 100).toFixed(0) : 0}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sumatoria Total por Integrante */}
          {personasOrdenadas.length > 0 && (
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_2px_16px_rgba(45,28,20,0.03)] border border-[#EADBCE]/80 space-y-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8D6B57] block mb-0.5">
                    Total por Integrante
                  </span>
                  <h3 className="text-xl md:text-2xl font-extrabold text-[#2D1C14] tracking-tight">
                    Sumatoria de Aportes
                  </h3>
                </div>
                <div className="bg-[#FAF5F0] px-3.5 py-2 rounded-2xl border border-[#EADBCE]/60 flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-xs font-bold text-[#8D6B57]">Total Recaudado:</span>
                  <span className="text-sm font-black text-[#2D1C14]">${totalAportadoGeneral.toLocaleString('es-CO')}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {personasOrdenadas.map(([nombre, data]) => {
                  const pct = totalAportadoGeneral > 0 ? (data.total / totalAportadoGeneral) * 100 : 0;
                  return (
                    <div 
                      key={nombre} 
                      className="p-4 rounded-2xl bg-[#FAF5F0]/60 border border-[#EADBCE]/80 hover:bg-white hover:border-[#D9C4B3] transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-[#2D1C14] text-white flex items-center justify-center text-xs font-black shrink-0 shadow-2xs">
                            {nombre.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-extrabold text-[#2D1C14] truncate" title={nombre}>
                              {nombre}
                            </h4>
                            <span className="text-[10px] font-bold text-[#8D6B57] block">
                              {data.cuotasCount} {data.cuotasCount === 1 ? 'aporte' : 'aportes'} en {data.gastosIds.size} {data.gastosIds.size === 1 ? 'gasto' : 'gastos'}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-black text-[#2D1C14] bg-white px-2 py-1 rounded-lg border border-[#EADBCE]/60 shrink-0">
                          {pct.toFixed(0)}%
                        </span>
                      </div>

                      <div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-[10px] font-bold text-[#8D6B57] uppercase tracking-wider">Total Aportado</span>
                          <span className="text-lg font-black text-[#2D1C14] tracking-tight">
                            ${data.total.toLocaleString('es-CO')}
                          </span>
                        </div>
                        <div className="w-full bg-[#EADBCE]/50 rounded-full h-1.5 mt-1.5 overflow-hidden">
                          <div 
                            className="h-1.5 rounded-full bg-[#2D1C14] transition-all duration-500" 
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Barra de Búsqueda y Filtros */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-3.5 rounded-3xl border border-[#EADBCE]/80 shadow-[0_2px_16px_rgba(45,28,20,0.03)]">
            <input 
              type="text" 
              placeholder="Buscar por concepto o categoría..." 
              value={busqueda} 
              onChange={(e) => setBusqueda(e.target.value)} 
              className="p-2 px-3 text-xs font-medium border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 focus:bg-white focus:border-[#2D1C14] text-[#2D1C14] outline-none w-full sm:w-64 transition-all placeholder:text-[#8D6B57]/60" 
            />

            <div className="flex flex-wrap gap-1 bg-[#FAF5F0] p-1 rounded-xl text-xs font-bold border border-[#EADBCE]/60">
              <button
                type="button"
                onClick={() => setFiltroEstado('todos')}
                className={`px-3 py-1.5 rounded-lg transition-all ${filtroEstado === 'todos' ? 'bg-[#2D1C14] text-white shadow-xs' : 'text-[#6F4A39] hover:text-[#2D1C14]'}`}
              >
                Todos ({gastosActivos.length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroEstado('pendientes')}
                className={`px-3 py-1.5 rounded-lg transition-all ${filtroEstado === 'pendientes' ? 'bg-[#2D1C14] text-white shadow-xs' : 'text-[#6F4A39] hover:text-[#2D1C14]'}`}
              >
                Pendientes ({gastosActivos.length - gastosCubiertosPendientesRenovar.length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroEstado('urgentes')}
                className={`px-3 py-1.5 rounded-lg transition-all ${filtroEstado === 'urgentes' ? 'bg-[#2D1C14] text-white shadow-xs font-extrabold' : 'text-[#6F4A39] hover:text-[#2D1C14]'}`}
              >
                Urgentes
              </button>
              {gastosCubiertosPendientesRenovar.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFiltroEstado('cubiertos')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${filtroEstado === 'cubiertos' ? 'bg-[#2D1C14] text-white shadow-xs font-black' : 'text-emerald-800 hover:text-emerald-950 bg-emerald-50'}`}
                >
                  Cubiertos ({gastosCubiertosPendientesRenovar.length})
                </button>
              )}
            </div>
          </div>

          {/* Formulario para Agregar Gasto */}
          {mostrarFormulario && (
            <form onSubmit={agregarGasto} className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_2px_16px_rgba(45,28,20,0.03)] border border-[#EADBCE]/80 animate-fade-in space-y-4">
              <h3 className="text-lg font-bold text-[#2D1C14]">Registrar Nuevo Compromiso Financiero</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#8D6B57] uppercase tracking-wider block mb-1">Concepto</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Arriendo, Internet, Crédito" 
                    value={concepto} 
                    onChange={(e) => setConcepto(e.target.value)} 
                    className="w-full p-3 border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 focus:bg-white focus:border-[#2D1C14] text-[#2D1C14] outline-none font-bold text-sm transition-all" 
                    required 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#8D6B57] uppercase tracking-wider block mb-1">Categoría</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Vivienda, Servicios, Personal" 
                    value={categoria} 
                    onChange={(e) => setCategoria(e.target.value)} 
                    className="w-full p-3 border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 focus:bg-white focus:border-[#2D1C14] text-[#2D1C14] outline-none text-sm transition-all" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#8D6B57] uppercase tracking-wider block mb-1">Monto Total</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-[#8D6B57] font-bold">$</span>
                    <input 
                      type="number" 
                      placeholder="0" 
                      value={monto} 
                      onChange={(e) => setMonto(e.target.value)} 
                      className="w-full p-3 pl-8 border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 focus:bg-white focus:border-[#2D1C14] text-[#2D1C14] outline-none font-bold text-sm transition-all" 
                      required 
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#8D6B57] uppercase tracking-wider block mb-1">Fecha de Vencimiento (Día mensual)</label>
                  <input 
                    type="date" 
                    value={fecha} 
                    onChange={(e) => setFecha(e.target.value)} 
                    className="w-full p-3 border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 focus:bg-white focus:border-[#2D1C14] text-[#2D1C14] outline-none text-sm transition-all" 
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={guardando}
                className="w-full bg-[#2D1C14] text-white font-bold py-3.5 rounded-xl hover:bg-[#3E271D] active:scale-95 transition-all text-sm shadow-xs disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Guardar Compromiso'}
              </button>
            </form>
          )}

          {/* Grid de Gastos Activos */}
          {gastosFiltrados.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-[#EADBCE]/80 text-center text-[#8D6B57]">
              <p className="text-3xl mb-2">💳</p>
              <p className="font-bold text-[#2D1C14] text-sm">No se encontraron compromisos financieros activos.</p>
              <p className="text-xs text-[#8D6B57] mt-1">Prueba cambiando los filtros o agregando uno nuevo.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 items-start">
              {gastosFiltrados.map((gasto) => (
                <TarjetaFinanzas 
                  key={gasto.id} 
                  gasto={gasto} 
                  sesion={sesion} 
                  strHoy={strHoy} 
                  onGastoActualizado={onGastoAgregado}
                  onAporteAgregado={handleAporteAgregado}
                  onAporteActualizado={handleAporteActualizado}
                  onAporteEliminado={handleAporteEliminado}
                  onRenovarAlProximoMes={renovarGastoAlProximoMes}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        /* ========================================================================= */
        /* VISTA 2: SUB-PESTAÑA PAGOS CUBIERTOS (HISTORIAL MENSUAL) */
        /* ========================================================================= */
        <div className="space-y-6 animate-fade-in">
          
          {/* Tarjeta de Resumen de Pagos Cubiertos */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_2px_16px_rgba(45,28,20,0.03)] border border-[#EADBCE]/80">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8D6B57] block mb-1">
                  Historial de Pagos Recurrentes Cubiertos
                </span>
                <p className="text-3xl md:text-4xl font-extrabold text-[#2D1C14] tracking-tight">
                  ${totalHistoricoCubiertos.toLocaleString('es-CO')}
                </p>
              </div>

              {/* Filtro por Mes */}
              {mesesDisponiblesCubiertos.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#8D6B57] shrink-0">Filtrar mes:</span>
                  <select
                    value={mesFiltroCubiertos}
                    onChange={(e) => setMesFiltroCubiertos(e.target.value)}
                    className="p-2 px-3 text-xs font-bold border border-[#EADBCE] rounded-xl bg-[#FAF5F0] text-[#2D1C14] outline-none focus:bg-white focus:border-[#2D1C14]"
                  >
                    <option value="todos">Todos los meses ({todosLosPagosCubiertos.length})</option>
                    {mesesDisponiblesCubiertos.map(mes => (
                      <option key={mes} value={mes}>{mes}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <p className="text-xs text-[#6F4A39] leading-relaxed">
              Aquí se organizan y archivan los pagos que ya fueron cubiertos en cada mes. Cada vez que renuevas un pago cubierto, su historial con los aportes de cada integrante queda guardado aquí permanentemente y el compromiso activo se programa para la misma fecha del mes siguiente.
            </p>
          </div>

          {/* Barra de Búsqueda de Cubiertos */}
          <div className="bg-white p-3.5 rounded-3xl border border-[#EADBCE]/80 shadow-[0_2px_16px_rgba(45,28,20,0.03)] flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <input 
              type="text" 
              placeholder="Buscar en pagos cubiertos por concepto, categoría o persona..." 
              value={busqueda} 
              onChange={(e) => setBusqueda(e.target.value)} 
              className="p-2 px-3 text-xs font-medium border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 focus:bg-white focus:border-[#2D1C14] text-[#2D1C14] outline-none w-full sm:w-96 transition-all placeholder:text-[#8D6B57]/60" 
            />

            <span className="text-xs font-bold text-[#8D6B57] text-right self-end sm:self-center">
              {pagosCubiertosFiltrados.length} {pagosCubiertosFiltrados.length === 1 ? 'pago registrado' : 'pagos registrados'}
            </span>
          </div>

          {/* Listado de Pagos Cubiertos */}
          {pagosCubiertosFiltrados.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-[#EADBCE]/80 text-center text-[#8D6B57] space-y-2">
              <p className="text-3xl">📁</p>
              <h4 className="font-bold text-[#2D1C14] text-sm">No hay pagos cubiertos archivados en esta vista.</h4>
              <p className="text-xs text-[#8D6B57] max-w-md mx-auto">
                Cuando completes el 100% de aportes en un compromiso de la pestaña &quot;Compromisos del Mes&quot; y hagas clic en &quot;Guardar y Renovar&quot;, se guardará aquí organizadamente.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              {pagosCubiertosFiltrados.map((pago) => (
                <div 
                  key={pago.id}
                  className="bg-white rounded-3xl p-6 border border-[#EADBCE]/80 shadow-[0_2px_16px_rgba(45,28,20,0.03)] hover:shadow-[0_8px_24px_rgba(45,28,20,0.06)] hover:border-[#D9C4B3] transition-all space-y-4"
                >
                  {/* Encabezado de la Tarjeta Cubierta */}
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F4A39] bg-[#FAF5F0] px-2.5 py-1 rounded-md border border-[#EADBCE]/60 truncate">
                      {pago.categoria || 'General'}
                    </span>

                    <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                      Cubierto 100% ✓
                    </span>
                  </div>

                  {/* Concepto y Monto Total */}
                  <div>
                    <h3 className="text-xl font-bold text-[#2D1C14] tracking-tight">{pago.concepto}</h3>
                    <p className="text-2xl font-extrabold text-[#2D1C14] mt-1 tracking-tight">
                      ${pago.monto_total.toLocaleString('es-CO')}
                    </p>
                  </div>

                  {/* Fechas: Mes Cubierto y Próxima Fecha */}
                  <div className="p-3 bg-[#FAF5F0] rounded-2xl border border-[#EADBCE]/60 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-[#6F4A39]">
                      <span className="font-semibold text-[#8D6B57]">Mes correspondencia:</span>
                      <span className="font-black text-[#2D1C14]">{pago.mes_cubierto || 'Este mes'}</span>
                    </div>
                    {pago.fecha_vencimiento_original && (
                      <div className="flex justify-between items-center text-[#6F4A39]">
                        <span className="font-semibold text-[#8D6B57]">Fecha vencimiento original:</span>
                        <span className="font-bold text-[#2D1C14]">{pago.fecha_vencimiento_original}</span>
                      </div>
                    )}
                    {pago.proxima_fecha_renovada && (
                      <div className="flex justify-between items-center text-[#6F4A39] pt-1 border-t border-[#EADBCE]/50">
                        <span className="font-semibold text-[#8D6B57]">Renovado activo para:</span>
                        <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                          {pago.proxima_fecha_renovada}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Desglose de Aportes de Integrantes */}
                  {pago.aportes && pago.aportes.length > 0 ? (
                    <div className="p-3.5 bg-[#FAF5F0]/60 rounded-2xl border border-[#EADBCE]/60 space-y-2">
                      <span className="text-[10px] font-bold text-[#8D6B57] uppercase tracking-wider block">
                        Aportes Cubiertos ({pago.aportes.length})
                      </span>
                      <ul className="space-y-1.5">
                        {pago.aportes.map((ap, idx) => (
                          <li key={idx} className="flex justify-between items-center text-xs p-2 bg-white rounded-xl border border-[#EADBCE]/40">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-5 h-5 rounded-full bg-[#EADBCE] text-[#2D1C14] flex items-center justify-center text-[9px] font-black shrink-0">
                                {ap.integrante.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-bold text-[#2D1C14] truncate">{ap.integrante}</span>
                            </div>
                            <span className="font-extrabold text-[#2D1C14]">
                              ${Number(ap.monto).toLocaleString('es-CO')}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-[#FAF5F0]/40 rounded-xl text-center text-[11px] text-[#8D6B57] font-medium border border-dashed border-[#EADBCE]">
                      Pago cubierto en su totalidad sin desglose de cuotas
                    </div>
                  )}

                  {/* Acciones de la Tarjeta Cubierta */}
                  <div className="flex justify-between items-center pt-2 border-t border-[#EADBCE]/60">
                    <button
                      type="button"
                      onClick={() => restaurarPagoCubiertoAlActivo(pago)}
                      className="text-xs font-bold text-[#8D6B57] hover:text-[#2D1C14] hover:bg-[#FAF5F0] px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 active:scale-95 border border-[#EADBCE]/60"
                      title="Reabrir en Compromisos Activos"
                    >
                      <span>↩️</span> Reabrir en Activos
                    </button>

                    <button
                      type="button"
                      onClick={() => eliminarPagoCubierto(pago.id)}
                      className="text-xs font-bold text-[#8D6B57] hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl transition-all active:scale-95"
                      title="Eliminar del historial"
                    >
                      🗑️
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
