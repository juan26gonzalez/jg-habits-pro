import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/ui/Modal';
import { limpiarConceptoGasto } from '@/types';
import { sumarUnMesMismaFecha, formatearFechaBonita } from '@/lib/dateUtils';
import type { Gasto, CuotaAporte, UserSession } from '@/types';

interface TarjetaFinanzasProps {
  gasto: Gasto;
  sesion: UserSession;
  strHoy: string;
  onGastoActualizado: () => void;
  onAporteAgregado?: (nuevoAporte: CuotaAporte) => void;
  onAporteActualizado?: (aporteActualizado: CuotaAporte) => void;
  onAporteEliminado?: (aporteId: string) => void;
  onRenovarAlProximoMes?: (gasto: Gasto, aportes: CuotaAporte[]) => Promise<void>;
}

export default function TarjetaFinanzas({ 
  gasto, 
  sesion, 
  strHoy, 
  onGastoActualizado,
  onAporteAgregado,
  onAporteActualizado,
  onAporteEliminado,
  onRenovarAlProximoMes
}: TarjetaFinanzasProps) {
  const [aportes, setAportes] = useState<CuotaAporte[]>([]);
  const [nombreIntegrante, setNombreIntegrante] = useState('');
  const [montoAporte, setMontoAporte] = useState('');
  const [agregandoAporte, setAgregandoAporte] = useState(false);
  const [renovando, setRenovando] = useState(false);

  // Estado para editar nombre del integrante y monto del aporte
  const [editandoAporteId, setEditandoAporteId] = useState<string | null>(null);
  const [editNombreIntegrante, setEditNombreIntegrante] = useState('');
  const [editMontoAporte, setEditMontoAporte] = useState('');
  const [guardandoEdicionAporte, setGuardandoEdicionAporte] = useState(false);

  // Modal para editar el gasto principal
  const [modalEditarGasto, setModalEditarGasto] = useState(false);
  const [editConcepto, setEditConcepto] = useState(gasto.concepto);
  const [editCategoria, setEditCategoria] = useState(gasto.categoria || '');
  const [editMonto, setEditMonto] = useState(String(gasto.monto_total || ''));
  const [editFecha, setEditFecha] = useState(gasto.fecha_vencimiento || '');
  const [guardandoEdicionGasto, setGuardandoEdicionGasto] = useState(false);

  // Modal para confirmar eliminación de gasto
  const [modalEliminarGasto, setModalEliminarGasto] = useState(false);
  const [eliminandoGasto, setEliminandoGasto] = useState(false);

  const montoTotal = Number(gasto?.monto_total) || 0;

  useEffect(() => {
    async function cargarAportes() {
      if (!gasto?.id) return;
      const { data } = await supabase
        .from('finanzas_cuotas_familia')
        .select('*')
        .eq('gasto_id', gasto.id);
      if (data) setAportes(data as CuotaAporte[]);
    }
    cargarAportes();
  }, [gasto?.id]);

  const totalAportado = aportes.reduce((suma, ap) => suma + (Number(ap?.monto_cuota) || 0), 0);
  const restante = Math.max(0, montoTotal - totalAportado);
  const porcentaje = montoTotal > 0 ? Math.min(100, (totalAportado / montoTotal) * 100) : 0;

  let diasParaVencer = 0;
  let esUrgente = false;
  let estaVencido = false;
  const tieneFecha = Boolean(gasto?.fecha_vencimiento && strHoy);

  if (tieneFecha && gasto.fecha_vencimiento) {
    const fVenc = new Date(`${gasto.fecha_vencimiento}T12:00:00`);
    const fHoy = new Date(`${strHoy}T12:00:00`);
    const diffTime = fVenc.getTime() - fHoy.getTime();
    diasParaVencer = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    esUrgente = diasParaVencer >= 0 && diasParaVencer <= 3;
    estaVencido = diasParaVencer < 0;
  }

  const bordeEstado = porcentaje >= 100 
    ? 'border-[#EADBCE]' 
    : (estaVencido ? 'border-rose-300 ring-1 ring-rose-100' : (esUrgente ? 'border-amber-300 ring-1 ring-amber-100' : 'border-[#EADBCE]/80'));

  async function agregarAporte(e: React.FormEvent) {
    e.preventDefault();
    if (!nombreIntegrante.trim() || !montoAporte || !sesion?.user?.id || !gasto?.id) return;
    setAgregandoAporte(true);

    const { data, error } = await supabase
      .from('finanzas_cuotas_familia')
      .insert([{ 
        gasto_id: gasto.id, 
        integrante: nombreIntegrante.trim(), 
        monto_cuota: Number(montoAporte), 
        user_id: sesion.user.id, 
        pagado: true 
      }])
      .select();

    setAgregandoAporte(false);

    if (error) {
      alert(`Error al registrar aporte: ${error.message}`);
    } else if (data && data[0]) {
      const nuevoReg = data[0] as CuotaAporte;
      setAportes(prev => [...prev, nuevoReg]);
      setNombreIntegrante('');
      setMontoAporte('');
      onAporteAgregado?.(nuevoReg);
    }
  }

  function iniciarEdicionAporte(ap: CuotaAporte) {
    setEditandoAporteId(ap.id);
    setEditNombreIntegrante(ap.integrante || '');
    setEditMontoAporte(String(ap.monto_cuota || ''));
  }

  function cancelarEdicionAporte() {
    setEditandoAporteId(null);
    setEditNombreIntegrante('');
    setEditMontoAporte('');
  }

  async function guardarEdicionAporte(e: React.FormEvent, aporteId: string) {
    e.preventDefault();
    if (!editNombreIntegrante.trim() || !editMontoAporte) return;
    setGuardandoEdicionAporte(true);

    const nuevoNombreLimpio = editNombreIntegrante.trim();
    const nuevoMontoNum = Number(editMontoAporte);

    const { error } = await supabase
      .from('finanzas_cuotas_familia')
      .update({ 
        integrante: nuevoNombreLimpio,
        monto_cuota: nuevoMontoNum 
      })
      .eq('id', aporteId);

    setGuardandoEdicionAporte(false);

    if (error) {
      alert(`Error al actualizar aporte: ${error.message}`);
    } else {
      const aporteMod = { id: aporteId, gasto_id: gasto.id, integrante: nuevoNombreLimpio, monto_cuota: nuevoMontoNum };
      setAportes(prev => prev.map(ap => 
        ap.id === aporteId 
          ? { ...ap, integrante: nuevoNombreLimpio, monto_cuota: nuevoMontoNum } 
          : ap
      ));
      cancelarEdicionAporte();
      onAporteActualizado?.(aporteMod as CuotaAporte);
    }
  }

  async function eliminarAporte(aporteId: string) {
    const { error } = await supabase
      .from('finanzas_cuotas_familia')
      .delete()
      .eq('id', aporteId);

    if (!error) {
      setAportes(prev => prev.filter(ap => ap.id !== aporteId));
      if (editandoAporteId === aporteId) {
        cancelarEdicionAporte();
      }
      onAporteEliminado?.(aporteId);
    } else {
      alert(`Error al eliminar aporte: ${error.message}`);
    }
  }

  async function guardarEdicionGastoSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editConcepto || !editMonto) return;
    setGuardandoEdicionGasto(true);

    const { error } = await supabase
      .from('finanzas_gastos')
      .update({
        concepto: editConcepto,
        categoria: editCategoria || 'General',
        monto_total: Number(editMonto),
        fecha_vencimiento: editFecha || null
      })
      .eq('id', gasto.id);

    setGuardandoEdicionGasto(false);
    if (error) {
      alert(`Error al actualizar gasto: ${error.message}`);
    } else {
      setModalEditarGasto(false);
      onGastoActualizado();
    }
  }

  async function confirmarEliminarGasto() {
    setEliminandoGasto(true);
    await supabase.from('finanzas_cuotas_familia').delete().eq('gasto_id', gasto.id);
    const { error } = await supabase.from('finanzas_gastos').delete().eq('id', gasto.id);
    setEliminandoGasto(false);

    if (error) {
      alert(`Error al eliminar gasto: ${error.message}`);
    } else {
      setModalEliminarGasto(false);
      onGastoActualizado();
    }
  }

  return (
    <div className={`rounded-3xl p-6 bg-white border shadow-[0_2px_16px_rgba(45,28,20,0.03)] hover:shadow-[0_8px_24px_rgba(45,28,20,0.06)] hover:border-[#D9C4B3] transition-all duration-300 flex flex-col justify-between ${bordeEstado}`}>
      <div className="space-y-4">
        {/* Cabecera de la Tarjeta */}
        <div className="flex justify-between items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F4A39] bg-[#FAF5F0] px-2.5 py-1 rounded-md border border-[#EADBCE]/60 truncate">
            {gasto?.categoria || 'General'}
          </span>
          
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border whitespace-nowrap ${
              porcentaje >= 100 
                ? 'bg-[#FAF5F0] text-[#2D1C14] border-[#EADBCE]' 
                : (estaVencido 
                    ? 'bg-rose-50 text-rose-700 border-rose-200' 
                    : (esUrgente 
                        ? 'bg-amber-50 text-amber-800 border-amber-200' 
                        : 'bg-[#FAF5F0] text-[#8D6B57] border-[#EADBCE]/60'))
            }`}>
              {porcentaje >= 100 ? 'Cubierto ✔' : (
                tieneFecha 
                  ? (estaVencido ? `Vencido (${Math.abs(diasParaVencer)}d)` : (esUrgente ? `Vence en ${diasParaVencer}d` : `Vence: ${gasto.fecha_vencimiento}`)) 
                  : 'Sin fecha'
              )}
            </span>

            {/* Acciones */}
            <button 
              onClick={() => {
                setEditConcepto(gasto.concepto);
                setEditCategoria(gasto.categoria || '');
                setEditMonto(String(gasto.monto_total || ''));
                setEditFecha(gasto.fecha_vencimiento || '');
                setModalEditarGasto(true);
              }}
              className="w-7 h-7 rounded-lg text-[#8D6B57] hover:text-[#2D1C14] hover:bg-[#FAF5F0] flex items-center justify-center transition-colors text-xs active:scale-90"
              title="Editar"
            >
              ✏️
            </button>
            <button 
              onClick={() => setModalEliminarGasto(true)}
              className="w-7 h-7 rounded-lg text-[#8D6B57] hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors text-xs active:scale-90"
              title="Eliminar"
            >
              🗑️
            </button>
          </div>
        </div>
        
        {/* Concepto y Monto en Marrón Elegante */}
        <div>
          <h3 className="text-xl font-bold text-[#2D1C14] tracking-tight leading-snug">{limpiarConceptoGasto(gasto?.concepto)}</h3>
          <p className="text-3xl font-extrabold text-[#2D1C14] mt-1 tracking-tight">${montoTotal.toLocaleString('es-CO')}</p>
        </div>
        
        {/* Barra y Resumen de Progreso */}
        <div className="p-4 bg-[#FAF5F0] rounded-2xl border border-[#EADBCE]/60 space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-[#8D6B57]">Recaudado: <span className="text-[#2D1C14] font-bold">${totalAportado.toLocaleString('es-CO')}</span></span>
            <span className="text-[#2D1C14] font-black">{porcentaje.toFixed(0)}%</span>
          </div>
          
          <div className="w-full bg-[#EADBCE]/60 rounded-full h-2 overflow-hidden">
            <div 
              className="h-2 rounded-full transition-all duration-700 ease-out bg-[#2D1C14]" 
              style={{ width: `${porcentaje}%` }}
            ></div>
          </div>
          
          <p className="text-xs font-semibold text-[#8D6B57]">
            {restante > 0 ? `Faltan: $${restante.toLocaleString('es-CO')}` : '¡Gasto cubierto al 100%!'}
          </p>
        </div>

        {/* Banner de Renovación al Próximo Mes para Gastos 100% Cubiertos */}
        {porcentaje >= 100 && (
          <div className="p-3.5 bg-emerald-50/90 border border-emerald-200/90 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 animate-fade-in shadow-2xs">
            <div className="min-w-0">
              <span className="text-[11px] font-black text-emerald-950 flex items-center gap-1">
                <span>🎉</span> ¡Pago cubierto al 100%!
              </span>
              <p className="text-[10px] text-emerald-800 font-medium mt-0.5">
                Al renovar, se guardará en <strong>Pagos Cubiertos</strong> y se actualizará para el <strong className="font-bold">{formatearFechaBonita(sumarUnMesMismaFecha(gasto.fecha_vencimiento))}</strong>.
              </p>
            </div>
            {onRenovarAlProximoMes && (
              <button
                type="button"
                onClick={async () => {
                  setRenovando(true);
                  try {
                    await onRenovarAlProximoMes(gasto, aportes);
                  } finally {
                    setRenovando(false);
                  }
                }}
                disabled={renovando}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-[#2D1C14] hover:bg-[#3E271D] text-white text-xs font-bold transition-all active:scale-95 shadow-xs shrink-0 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <span>🔄</span>
                <span>{renovando ? 'Guardando...' : 'Guardar y Renovar'}</span>
              </button>
            )}
          </div>
        )}

        {/* Sección de Aportes Registrados o Placeholder Equilibrado */}
        {aportes.length > 0 ? (
          <div className="p-3.5 bg-[#FAF5F0]/60 rounded-2xl border border-[#EADBCE]/60">
            <h4 className="text-[10px] font-bold text-[#8D6B57] uppercase tracking-wider mb-2.5">Aportes ({aportes.length})</h4>
            <ul className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {aportes.map((ap) => (
                <li key={ap.id}>
                  {editandoAporteId === ap.id ? (
                    <form 
                      onSubmit={(e) => guardarEdicionAporte(e, ap.id)}
                      className="p-3 bg-white rounded-xl border border-[#2D1C14] shadow-sm space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8D6B57]">Editar Integrante</span>
                        <span className="text-[10px] font-semibold text-[#8D6B57]">ID: {ap.id.slice(0, 4)}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-[#8D6B57] block mb-1">Nombre</label>
                          <input 
                            type="text" 
                            value={editNombreIntegrante} 
                            onChange={(e) => setEditNombreIntegrante(e.target.value)} 
                            placeholder="Nombre de la persona"
                            className="w-full p-2 text-xs border border-[#EADBCE] rounded-lg bg-[#FAF5F0]/60 font-semibold text-[#2D1C14] outline-none focus:bg-white focus:border-[#2D1C14]" 
                            autoFocus 
                            required 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-[#8D6B57] block mb-1">Monto ($)</label>
                          <input 
                            type="number" 
                            value={editMontoAporte} 
                            onChange={(e) => setEditMontoAporte(e.target.value)} 
                            placeholder="Monto"
                            className="w-full p-2 text-xs border border-[#EADBCE] rounded-lg bg-[#FAF5F0]/60 font-bold text-[#2D1C14] outline-none focus:bg-white focus:border-[#2D1C14]" 
                            required 
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1 border-t border-[#EADBCE]/40">
                        <button 
                          type="button" 
                          onClick={cancelarEdicionAporte} 
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg text-[#8D6B57] hover:bg-[#FAF5F0] active:scale-95 transition-all"
                        >
                          Cancelar
                        </button>
                        <button 
                          type="submit" 
                          disabled={guardandoEdicionAporte}
                          className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#2D1C14] text-white hover:bg-[#3E271D] active:scale-95 transition-all shadow-2xs disabled:opacity-50"
                        >
                          {guardandoEdicionAporte ? 'Guardando...' : 'Guardar'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex justify-between text-xs items-center p-2 rounded-xl hover:bg-white transition-colors bg-white/40 border border-[#EADBCE]/40">
                      <div className="font-semibold text-[#3E271D] flex items-center gap-2 min-w-0 pr-2">
                        <div className="w-6 h-6 rounded-full bg-[#EADBCE] text-[#2D1C14] flex items-center justify-center text-[10px] font-black shrink-0">
                          {ap.integrante ? ap.integrante.charAt(0).toUpperCase() : '?'}
                        </div>
                        <span className="truncate font-bold text-[#2D1C14]" title={ap.integrante}>{ap.integrante}</span>
                      </div>
                      <div className="flex gap-1.5 items-center shrink-0">
                        <span className="text-[#2D1C14] font-extrabold whitespace-nowrap mr-1">${Number(ap.monto_cuota).toLocaleString('es-CO')}</span>
                        <button 
                          type="button"
                          onClick={() => iniciarEdicionAporte(ap)} 
                          className="w-7 h-7 rounded-lg text-[#8D6B57] hover:text-[#2D1C14] hover:bg-white flex items-center justify-center transition-colors text-xs active:scale-90 border border-transparent hover:border-[#EADBCE]"
                          title="Editar persona y monto"
                        >
                          ✏️
                        </button>
                        <button 
                          type="button"
                          onClick={() => eliminarAporte(ap.id)} 
                          className="w-7 h-7 rounded-lg text-[#8D6B57] hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors text-xs active:scale-90 border border-transparent hover:border-rose-200"
                          title="Eliminar aporte"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="p-3 bg-[#FAF5F0]/40 rounded-2xl border border-dashed border-[#EADBCE] text-center text-xs text-[#8D6B57] font-medium">
            Sin aportes registrados aún
          </div>
        )}
      </div>

      {/* Formulario de Aporte en la parte inferior */}
      {restante > 0 && (
        <form onSubmit={agregarAporte} className="mt-4 pt-4 border-t border-[#EADBCE]/50 flex gap-2 items-center">
          <input 
            type="text" 
            placeholder="Integrante" 
            value={nombreIntegrante} 
            onChange={(e) => setNombreIntegrante(e.target.value)} 
            className="w-1/2 p-2.5 text-xs font-medium border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/60 focus:bg-white focus:border-[#2D1C14] text-[#2D1C14] transition-all outline-none placeholder:text-[#8D6B57]/60" 
            required 
          />
          <input 
            type="number" 
            placeholder="Monto" 
            value={montoAporte} 
            onChange={(e) => setMontoAporte(e.target.value)} 
            className="w-1/2 p-2.5 text-xs font-bold border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/60 focus:bg-white focus:border-[#2D1C14] text-[#2D1C14] transition-all outline-none placeholder:text-[#8D6B57]/60" 
            required 
          />
          <button 
            type="submit" 
            disabled={agregandoAporte}
            className="bg-[#2D1C14] text-white font-bold px-3.5 py-2.5 rounded-xl hover:bg-[#3E271D] active:scale-95 transition-all text-xs flex justify-center items-center shadow-xs shrink-0 disabled:opacity-50"
            title="Agregar aporte"
          >
            {agregandoAporte ? '...' : '+'}
          </button>
        </form>
      )}

      {/* Modal para Editar Gasto */}
      {modalEditarGasto && (
        <Modal
          isOpen={modalEditarGasto}
          onClose={() => setModalEditarGasto(false)}
          title="Editar Compromiso Financiero"
        >
          <form onSubmit={guardarEdicionGastoSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#8D6B57] uppercase tracking-wider block mb-1">Concepto</label>
              <input 
                type="text" 
                value={editConcepto} 
                onChange={(e) => setEditConcepto(e.target.value)} 
                className="w-full p-3 border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 focus:bg-white focus:border-[#2D1C14] outline-none font-bold text-sm text-[#2D1C14]" 
                required 
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#8D6B57] uppercase tracking-wider block mb-1">Categoría</label>
              <input 
                type="text" 
                value={editCategoria} 
                onChange={(e) => setEditCategoria(e.target.value)} 
                className="w-full p-3 border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 focus:bg-white focus:border-[#2D1C14] outline-none text-sm text-[#2D1C14]" 
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#8D6B57] uppercase tracking-wider block mb-1">Monto Total</label>
              <input 
                type="number" 
                value={editMonto} 
                onChange={(e) => setEditMonto(e.target.value)} 
                className="w-full p-3 border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 focus:bg-white focus:border-[#2D1C14] outline-none font-bold text-sm text-[#2D1C14]" 
                required 
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#8D6B57] uppercase tracking-wider block mb-1">Fecha de Vencimiento</label>
              <input 
                type="date" 
                value={editFecha} 
                onChange={(e) => setEditFecha(e.target.value)} 
                className="w-full p-3 border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 focus:bg-white focus:border-[#2D1C14] outline-none text-sm text-[#2D1C14]" 
              />
            </div>

            <div className="pt-4 flex gap-3">
              <button 
                type="button" 
                onClick={() => setModalEditarGasto(false)} 
                className="w-1/2 p-3 rounded-xl border border-[#EADBCE] text-[#6F4A39] font-bold hover:bg-[#FAF5F0] text-sm"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={guardandoEdicionGasto}
                className="w-1/2 p-3 rounded-xl bg-[#2D1C14] hover:bg-[#3E271D] text-white font-bold shadow-sm disabled:opacity-50 text-sm"
              >
                {guardandoEdicionGasto ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal para Confirmar Eliminación de Gasto */}
      {modalEliminarGasto && (
        <Modal
          isOpen={modalEliminarGasto}
          onClose={() => setModalEliminarGasto(false)}
          title="Eliminar Gasto"
        >
          <div className="space-y-4">
            <p className="text-sm text-[#6F4A39]">
              ¿Estás seguro de que deseas eliminar el gasto <strong className="text-[#2D1C14]">{limpiarConceptoGasto(gasto.concepto)}</strong>?
            </p>
            <p className="text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">
              Esta acción eliminará el gasto y todos sus aportes registrados de forma permanente.
            </p>
            <div className="pt-2 flex gap-3">
              <button 
                type="button" 
                onClick={() => setModalEliminarGasto(false)} 
                className="w-1/2 p-3 rounded-xl border border-[#EADBCE] text-[#6F4A39] font-bold hover:bg-[#FAF5F0] text-sm"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={confirmarEliminarGasto} 
                disabled={eliminandoGasto}
                className="w-1/2 p-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm disabled:opacity-50 text-sm"
              >
                {eliminandoGasto ? 'Eliminando...' : 'Eliminar Gasto'}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
