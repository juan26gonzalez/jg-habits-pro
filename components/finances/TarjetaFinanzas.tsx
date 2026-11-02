import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/ui/Modal';
import type { Gasto, CuotaAporte, UserSession } from '@/types';

interface TarjetaFinanzasProps {
  gasto: Gasto;
  sesion: UserSession;
  strHoy: string;
  onGastoActualizado: () => void;
}

export default function TarjetaFinanzas({ gasto, sesion, strHoy, onGastoActualizado }: TarjetaFinanzasProps) {
  const [aportes, setAportes] = useState<CuotaAporte[]>([]);
  const [nombreIntegrante, setNombreIntegrante] = useState('');
  const [montoAporte, setMontoAporte] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nuevoMonto, setNuevoMonto] = useState('');

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
    ? 'border-green-300 ring-2 ring-green-50 shadow-green-100' 
    : (estaVencido ? 'border-red-400 ring-2 ring-red-50 shadow-red-100' : (esUrgente ? 'border-amber-400 ring-2 ring-amber-50 shadow-amber-100' : 'border-gray-100'));

  async function agregarAporte(e: React.FormEvent) {
    e.preventDefault();
    if (!nombreIntegrante || !montoAporte || !sesion?.user?.id || !gasto?.id) return;
    const { data, error } = await supabase
      .from('finanzas_cuotas_familia')
      .insert([{ 
        gasto_id: gasto.id, 
        integrante: nombreIntegrante, 
        monto_cuota: Number(montoAporte), 
        user_id: sesion.user.id, 
        pagado: true 
      }])
      .select();

    if (error) {
      alert(`Error: ${error.message}`);
    } else if (data && data[0]) {
      setAportes([...aportes, data[0] as CuotaAporte]);
      setNombreIntegrante('');
      setMontoAporte('');
      onGastoActualizado();
    }
  }

  async function guardarEdicionAporte(aporteId: string) {
    if (!nuevoMonto) return;
    const { error } = await supabase
      .from('finanzas_cuotas_familia')
      .update({ monto_cuota: Number(nuevoMonto) })
      .eq('id', aporteId);

    if (!error) {
      setAportes(aportes.map(ap => ap.id === aporteId ? { ...ap, monto_cuota: Number(nuevoMonto) } : ap));
      setEditandoId(null);
      setNuevoMonto('');
      onGastoActualizado();
    }
  }

  async function eliminarAporte(aporteId: string) {
    const { error } = await supabase
      .from('finanzas_cuotas_familia')
      .delete()
      .eq('id', aporteId);

    if (!error) {
      setAportes(aportes.filter(ap => ap.id !== aporteId));
      onGastoActualizado();
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
    // Eliminar aportes asociados primero
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
    <div className={`rounded-3xl p-6 md:p-8 bg-white hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-lg ${bordeEstado}`}>
      <div>
        <div className="flex justify-between items-start mb-4 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl truncate">
              {gasto?.categoria || 'General'}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl whitespace-nowrap ${porcentaje >= 100 ? 'bg-green-100 text-green-700' : (estaVencido ? 'bg-red-100 text-red-700 animate-pulse' : (esUrgente ? 'bg-amber-100 text-amber-700' : 'bg-gray-50 text-gray-500 border border-gray-100'))}`}>
              {porcentaje >= 100 ? 'Pagado ✔️' : (
                tieneFecha 
                  ? (estaVencido ? `Vencido (${Math.abs(diasParaVencer)}d)` : (esUrgente ? `¡Vence en ${diasParaVencer}d!` : `Vence: ${gasto.fecha_vencimiento}`)) 
                  : 'Sin fecha'
              )}
            </span>

            {/* Menú de acciones del gasto */}
            <button 
              onClick={() => {
                setEditConcepto(gasto.concepto);
                setEditCategoria(gasto.categoria || '');
                setEditMonto(String(gasto.monto_total || ''));
                setEditFecha(gasto.fecha_vencimiento || '');
                setModalEditarGasto(true);
              }}
              className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-600 flex items-center justify-center transition-colors text-xs active:scale-95"
              title="Editar Gasto"
            >
              ✏️
            </button>
            <button 
              onClick={() => setModalEliminarGasto(true)}
              className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-600 flex items-center justify-center transition-colors text-xs active:scale-95"
              title="Eliminar Gasto"
            >
              🗑️
            </button>
          </div>
        </div>
        
        <h3 className="text-xl md:text-2xl font-bold text-gray-800">{gasto?.concepto}</h3>
        <p className="text-3xl md:text-4xl font-black text-slate-900 mt-1 tracking-tight">${montoTotal.toLocaleString('es-CO')}</p>
        
        <div className="mt-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="flex justify-between text-sm font-semibold mb-2">
            <span className="text-gray-500">Recaudado: <span className="text-gray-800">${totalAportado.toLocaleString('es-CO')}</span></span>
            <span className={porcentaje >= 100 ? "text-green-600 font-black" : "text-blue-600 font-black"}>{porcentaje.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
            <div 
              className={`h-3 rounded-full transition-all duration-1000 ease-out ${porcentaje >= 100 ? 'bg-gradient-to-r from-green-400 to-green-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`} 
              style={{ width: `${porcentaje}%` }}
            ></div>
          </div>
          <p className="text-sm font-bold text-amber-600">
            {restante > 0 ? `Faltan: $${restante.toLocaleString('es-CO')}` : '¡Gasto cubierto al 100%!'}
          </p>
        </div>

        {aportes.length > 0 && (
          <div className="mt-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Aportes registrados ({aportes.length})</h4>
            <ul className="space-y-3">
              {aportes.map((ap) => (
                <li key={ap.id} className="flex justify-between text-sm items-center">
                  <span className="font-semibold text-slate-700 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-black">
                      {ap.integrante ? ap.integrante.charAt(0).toUpperCase() : '?'}
                    </div>
                    {ap.integrante}
                  </span>
                  {editandoId === ap.id ? (
                    <div className="flex gap-2 items-center">
                      <input 
                        type="number" 
                        value={nuevoMonto} 
                        onChange={(e) => setNuevoMonto(e.target.value)} 
                        className="w-24 p-1.5 text-sm border border-blue-400 rounded-lg bg-white" 
                        autoFocus 
                      />
                      <button onClick={() => guardarEdicionAporte(ap.id)} className="text-green-600 bg-green-50 p-1.5 rounded-lg active:scale-95" title="Guardar">✔️</button>
                      <button onClick={() => setEditandoId(null)} className="text-red-500 bg-red-50 p-1.5 rounded-lg active:scale-95" title="Cancelar">✖️</button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5 items-center">
                      <span className="text-slate-800 font-black mr-1">${Number(ap.monto_cuota).toLocaleString('es-CO')}</span>
                      <button 
                        onClick={() => { setEditandoId(ap.id); setNuevoMonto(String(ap.monto_cuota || '')); }} 
                        className="text-gray-300 hover:text-blue-600 p-1 rounded-md transition-colors active:scale-95"
                        title="Modificar cuota"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => eliminarAporte(ap.id)} 
                        className="text-gray-300 hover:text-red-600 p-1 rounded-md transition-colors active:scale-95"
                        title="Eliminar cuota"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {restante > 0 && (
        <form onSubmit={agregarAporte} className="mt-5 pt-5 border-t border-gray-100 flex gap-2">
          <input 
            type="text" 
            placeholder="Integrante" 
            value={nombreIntegrante} 
            onChange={(e) => setNombreIntegrante(e.target.value)} 
            className="w-1/2 p-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none" 
            required 
          />
          <input 
            type="number" 
            placeholder="Monto" 
            value={montoAporte} 
            onChange={(e) => setMontoAporte(e.target.value)} 
            className="w-1/2 p-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none" 
            required 
          />
          <button type="submit" className="bg-slate-900 text-white font-black p-3 rounded-xl hover:bg-slate-800 active:scale-95 transition-all flex justify-center items-center shadow-md">➕</button>
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
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Concepto</label>
              <input 
                type="text" 
                value={editConcepto} 
                onChange={(e) => setEditConcepto(e.target.value)} 
                className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold" 
                required 
              />
            </div>

            <div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Categoría</label>
              <input 
                type="text" 
                value={editCategoria} 
                onChange={(e) => setEditCategoria(e.target.value)} 
                className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>

            <div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Monto Total</label>
              <input 
                type="number" 
                value={editMonto} 
                onChange={(e) => setEditMonto(e.target.value)} 
                className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold" 
                required 
              />
            </div>

            <div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Fecha de Vencimiento</label>
              <input 
                type="date" 
                value={editFecha} 
                onChange={(e) => setEditFecha(e.target.value)} 
                className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>

            <div className="pt-4 flex gap-3">
              <button 
                type="button" 
                onClick={() => setModalEditarGasto(false)} 
                className="w-1/2 p-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={guardandoEdicionGasto}
                className="w-1/2 p-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-md disabled:opacity-50"
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
            <p className="text-sm text-gray-600">
              ¿Estás seguro de que deseas eliminar el gasto <strong className="text-slate-800">{gasto.concepto}</strong>?
            </p>
            <p className="text-xs text-red-500 bg-red-50 p-3 rounded-xl border border-red-200">
              Esta acción eliminará el gasto y todos sus aportes registrados de forma permanente.
            </p>
            <div className="pt-2 flex gap-3">
              <button 
                type="button" 
                onClick={() => setModalEliminarGasto(false)} 
                className="w-1/2 p-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={confirmarEliminarGasto} 
                disabled={eliminandoGasto}
                className="w-1/2 p-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md disabled:opacity-50"
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
