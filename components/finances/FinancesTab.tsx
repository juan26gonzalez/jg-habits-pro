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

const coloresCategorias = [
  'bg-blue-500', 
  'bg-indigo-500', 
  'bg-purple-500', 
  'bg-pink-500', 
  'bg-rose-500', 
  'bg-orange-500', 
  'bg-emerald-500', 
  'bg-sky-500'
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

    // Calcular días para vencimiento
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
      
      {/* Distribución del Presupuesto */}
      {gastos.length > 0 && (
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Distribución del Presupuesto Total</h3>
          <p className="text-3xl font-black text-slate-900 mb-6">${totalGastosMes.toLocaleString('es-CO')}</p>
          
          <div className="w-full h-4 rounded-full flex overflow-hidden mb-5 bg-gray-100 shadow-inner">
            {Object.entries(categoriasGastos).map(([cat, montoCat], i) => {
              const valorMonto = Number(montoCat) || 0;
              return (
                <div 
                  key={cat} 
                  title={`${cat}: $${valorMonto.toLocaleString()}`} 
                  className={`h-full transition-all duration-1000 ${coloresCategorias[i % coloresCategorias.length]}`} 
                  style={{ width: `${totalGastosMes > 0 ? (valorMonto / totalGastosMes) * 100 : 0}%` }}
                ></div>
              );
            })}
          </div>
          
          <div className="flex flex-wrap gap-2 md:gap-3">
            {Object.entries(categoriasGastos).map(([cat, montoCat], i) => {
              const valorMonto = Number(montoCat) || 0;
              return (
                <div key={cat} className="flex items-center gap-1.5 text-xs font-black text-slate-600 bg-gray-50 px-2.5 py-1.5 rounded-xl border border-gray-100">
                  <span className={`w-2.5 h-2.5 rounded-full shadow-sm ${coloresCategorias[i % coloresCategorias.length]}`}></span>
                  {cat} <span className="text-gray-400 font-bold ml-1">{totalGastosMes > 0 ? ((valorMonto / totalGastosMes) * 100).toFixed(0) : 0}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Barra de Acciones: Botón nuevo gasto y Buscador/Filtro */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        <button 
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-3 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md"
        >
          <span>{mostrarFormulario ? '✕ Cerrar' : '➕ Nuevo Gasto'}</span>
        </button>

        <div className="flex flex-wrap items-center gap-2 flex-grow sm:justify-end">
          <input 
            type="text" 
            placeholder="Buscar por concepto o categoría..." 
            value={busqueda} 
            onChange={(e) => setBusqueda(e.target.value)} 
            className="p-2.5 px-4 text-xs font-medium border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64" 
          />

          <div className="flex gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200 text-xs font-bold">
            <button
              onClick={() => setFiltroEstado('todos')}
              className={`px-3 py-1.5 rounded-lg transition-all ${filtroEstado === 'todos' ? 'bg-slate-900 text-white shadow-xs' : 'text-gray-500 hover:text-slate-800'}`}
            >
              Todos ({gastos.length})
            </button>
            <button
              onClick={() => setFiltroEstado('urgentes')}
              className={`px-3 py-1.5 rounded-lg transition-all ${filtroEstado === 'urgentes' ? 'bg-red-600 text-white shadow-xs' : 'text-gray-500 hover:text-red-600'}`}
            >
              ⚠️ Urgentes
            </button>
          </div>
        </div>
      </div>

      {/* Formulario Desplegable para Agregar Gasto */}
      {mostrarFormulario && (
        <form onSubmit={agregarGasto} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 animate-fade-in">
          <h3 className="text-xl font-black text-slate-800 mb-6">➕ Registrar Nuevo Compromiso Financiero</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <input 
              type="text" 
              placeholder="Concepto (ej. Internet, Arriendo, Crédito)" 
              value={concepto} 
              onChange={(e) => setConcepto(e.target.value)} 
              className="p-4 border border-gray-200 rounded-xl text-slate-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold" 
              required 
            />
            <input 
              type="text" 
              placeholder="Categoría (ej. Servicios, Vivienda, Préstamos)" 
              value={categoria} 
              onChange={(e) => setCategoria(e.target.value)} 
              className="p-4 border border-gray-200 rounded-xl text-slate-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
            />
            <div className="relative">
              <span className="absolute left-4 top-4 text-gray-400 font-bold">$</span>
              <input 
                type="number" 
                placeholder="Monto total" 
                value={monto} 
                onChange={(e) => setMonto(e.target.value)} 
                className="w-full p-4 pl-8 border border-gray-200 rounded-xl text-slate-900 font-bold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                required 
              />
            </div>
            <input 
              type="date" 
              value={fecha} 
              onChange={(e) => setFecha(e.target.value)} 
              className="p-4 border border-gray-200 rounded-xl text-slate-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold" 
            />
          </div>
          <button 
            type="submit" 
            disabled={guardando}
            className="bg-slate-900 text-white font-black py-4 px-6 rounded-2xl hover:bg-slate-800 active:scale-95 transition-all w-full text-lg shadow-lg disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar Compromiso'}
          </button>
        </form>
      )}
      
      {/* Grid de Gastos */}
      {gastosFiltrados.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center text-gray-400">
          <p className="text-4xl mb-3">💳</p>
          <p className="font-bold text-slate-700">No se encontraron compromisos financieros.</p>
          <p className="text-sm mt-1">Prueba cambiando los filtros o agregando uno nuevo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
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
