import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import TarjetaFinanzas from './TarjetaFinanzas';
import type { Gasto, UserSession } from '@/types';

interface FinancesTabProps {
  gastos: Gasto[];
  sesion: UserSession;
  strHoy: string;
  onGastoAgregado: () => void;
}

// Paleta minimalista en tonos grises elegantes
const coloresCategorias = [
  'bg-zinc-900', 
  'bg-zinc-700', 
  'bg-zinc-500', 
  'bg-zinc-400', 
  'bg-zinc-300', 
  'bg-slate-800', 
  'bg-slate-600', 
  'bg-slate-400'
];

export default function FinancesTab({ gastos, sesion, strHoy, onGastoAgregado }: FinancesTabProps) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendientes' | 'urgentes' | 'pagados'>('todos');

  const [concepto, setConcepto] = useState('');
  const [categoria, setCategoria] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState('');
  const [guardando, setGuardando] = useState(false);

  const categoriasGastos = gastos.reduce((acc: Record<string, number>, g: Gasto) => {
    const cat = g?.categoria || 'General';
    acc[cat] = (acc[cat] || 0) + (Number(g?.monto_total) || 0);
    return acc;
  }, {});

  const totalGastosMes = gastos.reduce((sum: number, g: Gasto) => sum + (Number(g?.monto_total) || 0), 0);

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

  // Filtrado de gastos
  const gastosFiltrados = gastos.filter(g => {
    const coincideTexto = g.concepto.toLowerCase().includes(busqueda.toLowerCase()) || 
                          (g.categoria && g.categoria.toLowerCase().includes(busqueda.toLowerCase()));
    if (!coincideTexto) return false;

    if (filtroEstado === 'todos') return true;

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
      return esUrgente || estaVencido;
    }
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-6">
      
      {/* Distribución del Presupuesto Total */}
      {gastos.length > 0 && (
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-zinc-200/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Distribución del Presupuesto Total
          </span>
          <p className="text-3xl md:text-4xl font-extrabold text-zinc-900 mb-6 tracking-tight">
            ${totalGastosMes.toLocaleString('es-CO')}
          </p>
          
          <div className="w-full h-3 rounded-full flex overflow-hidden mb-4 bg-zinc-100">
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
                <div key={cat} className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 bg-zinc-50 px-2.5 py-1 rounded-lg border border-zinc-200/60">
                  <span className={`w-2 h-2 rounded-full ${coloresCategorias[i % coloresCategorias.length]}`}></span>
                  {cat} <span className="text-zinc-400 font-medium ml-0.5">{totalGastosMes > 0 ? ((valorMonto / totalGastosMes) * 100).toFixed(0) : 0}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Barra de Acciones y Filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-3.5 rounded-3xl border border-zinc-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <button 
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold px-4 py-2.5 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm text-xs"
        >
          <span>{mostrarFormulario ? '✕ Cerrar' : '➕ Nuevo Gasto'}</span>
        </button>

        <div className="flex flex-wrap items-center gap-2 flex-grow sm:justify-end">
          <input 
            type="text" 
            placeholder="Buscar por concepto o categoría..." 
            value={busqueda} 
            onChange={(e) => setBusqueda(e.target.value)} 
            className="p-2 px-3 text-xs font-medium border border-zinc-200 rounded-xl bg-zinc-50 focus:bg-white focus:border-zinc-900 outline-none w-full sm:w-60 transition-all placeholder:text-zinc-400" 
          />

          <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setFiltroEstado('todos')}
              className={`px-3 py-1.5 rounded-lg transition-all ${filtroEstado === 'todos' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'}`}
            >
              Todos ({gastos.length})
            </button>
            <button
              onClick={() => setFiltroEstado('urgentes')}
              className={`px-3 py-1.5 rounded-lg transition-all ${filtroEstado === 'urgentes' ? 'bg-white text-zinc-900 shadow-xs font-extrabold' : 'text-zinc-500 hover:text-zinc-800'}`}
            >
              Urgentes
            </button>
          </div>
        </div>
      </div>

      {/* Formulario para Agregar Gasto */}
      {mostrarFormulario && (
        <form onSubmit={agregarGasto} className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-zinc-200/80 animate-fade-in space-y-4">
          <h3 className="text-lg font-bold text-zinc-900">Registrar Nuevo Compromiso Financiero</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1">Concepto</label>
              <input 
                type="text" 
                placeholder="Ej. Arriendo, Internet, Crédito" 
                value={concepto} 
                onChange={(e) => setConcepto(e.target.value)} 
                className="w-full p-3 border border-zinc-200 rounded-xl bg-zinc-50 focus:bg-white focus:border-zinc-900 outline-none font-bold text-sm transition-all" 
                required 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1">Categoría</label>
              <input 
                type="text" 
                placeholder="Ej. Vivienda, Servicios, Personal" 
                value={categoria} 
                onChange={(e) => setCategoria(e.target.value)} 
                className="w-full p-3 border border-zinc-200 rounded-xl bg-zinc-50 focus:bg-white focus:border-zinc-900 outline-none text-sm transition-all" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1">Monto Total</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-zinc-400 font-bold">$</span>
                <input 
                  type="number" 
                  placeholder="0" 
                  value={monto} 
                  onChange={(e) => setMonto(e.target.value)} 
                  className="w-full p-3 pl-8 border border-zinc-200 rounded-xl bg-zinc-50 focus:bg-white focus:border-zinc-900 outline-none font-bold text-sm transition-all" 
                  required 
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1">Fecha de Vencimiento</label>
              <input 
                type="date" 
                value={fecha} 
                onChange={(e) => setFecha(e.target.value)} 
                className="w-full p-3 border border-zinc-200 rounded-xl bg-zinc-50 focus:bg-white focus:border-zinc-900 outline-none text-sm transition-all" 
              />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={guardando}
            className="w-full bg-zinc-900 text-white font-bold py-3.5 rounded-xl hover:bg-zinc-800 active:scale-95 transition-all text-sm shadow-sm disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar Compromiso'}
          </button>
        </form>
      )}
      
      {/* Grid de Gastos con Espaciado y Distribución Equilibrada */}
      {gastosFiltrados.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-zinc-200/80 text-center text-zinc-400">
          <p className="text-3xl mb-2">💳</p>
          <p className="font-bold text-zinc-700 text-sm">No se encontraron compromisos financieros.</p>
          <p className="text-xs text-zinc-400 mt-1">Prueba cambiando los filtros o agregando uno nuevo.</p>
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
