import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import TarjetaFinanzas from './TarjetaFinanzas';
import type { Gasto, CuotaAporte, UserSession } from '@/types';

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

  // Sumatoria total de aportes por cada persona agregada en las finanzas
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

  function handleAporteAgregado(nuevoAporte: CuotaAporte) {
    setCuotasFamilia(prev => [...prev, nuevoAporte]);
  }

  function handleAporteActualizado(aporteActualizado: CuotaAporte) {
    setCuotasFamilia(prev => prev.map(c => c.id === aporteActualizado.id ? aporteActualizado : c));
  }

  function handleAporteEliminado(aporteId: string) {
    setCuotasFamilia(prev => prev.filter(c => c.id !== aporteId));
  }

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
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_2px_16px_rgba(45,28,20,0.03)] border border-[#EADBCE]/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8D6B57] block mb-1">
            Distribución del Presupuesto Total
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

      {/* Barra de Acciones y Filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-3.5 rounded-3xl border border-[#EADBCE]/80 shadow-[0_2px_16px_rgba(45,28,20,0.03)]">
        <button 
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          className="bg-[#2D1C14] hover:bg-[#3E271D] text-white font-bold px-4 py-2.5 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xs text-xs"
        >
          <span>{mostrarFormulario ? '✕ Cerrar' : '➕ Nuevo Gasto'}</span>
        </button>

        <div className="flex flex-wrap items-center gap-2 flex-grow sm:justify-end">
          <input 
            type="text" 
            placeholder="Buscar por concepto o categoría..." 
            value={busqueda} 
            onChange={(e) => setBusqueda(e.target.value)} 
            className="p-2 px-3 text-xs font-medium border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 focus:bg-white focus:border-[#2D1C14] text-[#2D1C14] outline-none w-full sm:w-60 transition-all placeholder:text-[#8D6B57]/60" 
          />

          <div className="flex gap-1 bg-[#FAF5F0] p-1 rounded-xl text-xs font-bold border border-[#EADBCE]/60">
            <button
              onClick={() => setFiltroEstado('todos')}
              className={`px-3 py-1.5 rounded-lg transition-all ${filtroEstado === 'todos' ? 'bg-[#2D1C14] text-white shadow-xs' : 'text-[#6F4A39] hover:text-[#2D1C14]'}`}
            >
              Todos ({gastos.length})
            </button>
            <button
              onClick={() => setFiltroEstado('urgentes')}
              className={`px-3 py-1.5 rounded-lg transition-all ${filtroEstado === 'urgentes' ? 'bg-[#2D1C14] text-white shadow-xs font-extrabold' : 'text-[#6F4A39] hover:text-[#2D1C14]'}`}
            >
              Urgentes
            </button>
          </div>
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
              <label className="text-xs font-bold text-[#8D6B57] uppercase tracking-wider block mb-1">Fecha de Vencimiento</label>
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
      
      {/* Grid de Gastos con Espaciado y Distribución Equilibrada */}
      {gastosFiltrados.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-[#EADBCE]/80 text-center text-[#8D6B57]">
          <p className="text-3xl mb-2">💳</p>
          <p className="font-bold text-[#2D1C14] text-sm">No se encontraron compromisos financieros.</p>
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
