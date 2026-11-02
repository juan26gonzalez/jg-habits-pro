import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import type { Gasto, MercadoItem, Habito, HabitoRegistro } from '@/types';

interface DashboardTabProps {
  mesActual: number;
  anioActual: number;
  setMesActual: React.Dispatch<React.SetStateAction<number>>;
  setAnioActual: React.Dispatch<React.SetStateAction<number>>;
  strHoy: string;
  gastos: Gasto[];
  mercadoLista: MercadoItem[];
  habitosCatalogo: Habito[];
  registrosHistoricos: HabitoRegistro[];
}

const nombresMeses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];
const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const mapFrecuenciaDias = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

export default function DashboardTab({
  mesActual,
  anioActual,
  setMesActual,
  setAnioActual,
  strHoy,
  gastos,
  mercadoLista,
  habitosCatalogo,
  registrosHistoricos,
}: DashboardTabProps) {
  const [filtroHabitos, setFiltroHabitos] = useState(true);
  const [filtroFinanzas, setFiltroFinanzas] = useState(true);
  const [filtroMercado, setFiltroMercado] = useState(true);

  // Estado para el modal de detalle del día
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);

  // Cálculos de KPIs superiores
  const fechaHoyObj = new Date();
  const diaSemanaHoy = mapFrecuenciaDias[fechaHoyObj.getDay()];
  const habitosProgramadosHoy = habitosCatalogo.filter(h => h.frecuencia && h.frecuencia.includes(diaSemanaHoy));
  const habitosCompletadosHoy = registrosHistoricos.filter(r => r.fecha === strHoy);
  const porcentajeHoy = habitosProgramadosHoy.length > 0 
    ? Math.round((habitosCompletadosHoy.length / habitosProgramadosHoy.length) * 100) 
    : 0;

  const totalGastosMes = gastos.reduce((sum, g) => sum + (Number(g.monto_total) || 0), 0);
  const totalMercadoProyectado = mercadoLista.reduce(
    (sum, item) => sum + ((item.cantidad * item.precio_unitario) - ((item.cantidad * item.precio_unitario) * ((item.descuento_porcentaje || 0) / 100))), 
    0
  );

  const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
  const primerDiaSemana = new Date(anioActual, mesActual, 1).getDay();
  const celdasCalendario = [];

  for (let i = 0; i < primerDiaSemana; i++) {
    celdasCalendario.push(<div key={`empty-${i}`} className="p-2 border border-transparent"></div>);
  }

  for (let d = 1; d <= diasEnMes; d++) {
    const mesStr = String(mesActual + 1).padStart(2, '0');
    const diaStr = String(d).padStart(2, '0');
    const fechaIteracion = `${anioActual}-${mesStr}-${diaStr}`;
    
    const gastosDelDia = gastos.filter(g => g.fecha_vencimiento === fechaIteracion);
    const comprasDelDia = mercadoLista.filter(m => m.creado_en && m.creado_en.split('T')[0] === fechaIteracion);
    const habitosDelDia = registrosHistoricos.filter(r => r.fecha === fechaIteracion);
    const esHoy = fechaIteracion === strHoy;

    const indiceDiaSemana = new Date(anioActual, mesActual, d).getDay();
    const strDiaCorto = mapFrecuenciaDias[indiceDiaSemana];
    const habitosProgramadosEsteDia = habitosCatalogo.filter(h => h.frecuencia && h.frecuencia.includes(strDiaCorto));
    const porcentajeProgreso = habitosProgramadosEsteDia.length > 0 
      ? Math.min(100, (habitosDelDia.length / habitosProgramadosEsteDia.length) * 100) 
      : 0;

    celdasCalendario.push(
      <div 
        key={d} 
        onClick={() => setDiaSeleccionado(fechaIteracion)}
        className={`p-2 md:p-3 min-h-[105px] border rounded-2xl shadow-sm transition-all flex flex-col cursor-pointer ${
          esHoy 
            ? 'bg-blue-50/60 border-blue-400 ring-2 ring-blue-300' 
            : 'bg-white border-gray-100 hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5'
        }`}
      >
        <div className="flex justify-between items-center mb-2">
          <span className={`font-black text-sm ${esHoy ? 'text-blue-700 bg-blue-200 px-2 py-0.5 rounded-full' : 'text-slate-500'}`}>
            {d}
          </span>
          {filtroHabitos && habitosProgramadosEsteDia.length > 0 && (
            <div className="w-10 md:w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden" title={`${habitosDelDia.length} de ${habitosProgramadosEsteDia.length} hábitos`}>
              <div 
                className={`h-full transition-all duration-500 ${porcentajeProgreso >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} 
                style={{ width: `${porcentajeProgreso}%` }}
              ></div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5 flex-grow">
          {filtroFinanzas && gastosDelDia.map((g, i) => (
            <span key={`g-${i}`} className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 truncate shadow-xs">
              💳 {g.concepto}
            </span>
          ))}
          {filtroMercado && comprasDelDia.length > 0 && (
            <span key="compras" className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 truncate shadow-xs">
              🛒 Súper ({comprasDelDia.length})
            </span>
          )}
          {filtroHabitos && habitosDelDia.map((h, i) => {
            const habitoInfo = habitosCatalogo.find(hc => hc.id === h.habito_id);
            if (!habitoInfo) return null;
            return (
              <span key={`h-${i}`} className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 truncate shadow-xs">
                {habitoInfo.emoji} {habitoInfo.nombre}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  // Elementos para el modal del día seleccionado
  const infoDiaSeleccionado = (() => {
    if (!diaSeleccionado) return null;
    const [y, m, d] = diaSeleccionado.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const diaSemanaStr = mapFrecuenciaDias[dateObj.getDay()];
    
    const gastosDia = gastos.filter(g => g.fecha_vencimiento === diaSeleccionado);
    const comprasDia = mercadoLista.filter(item => item.creado_en && item.creado_en.split('T')[0] === diaSeleccionado);
    const registrosDia = registrosHistoricos.filter(r => r.fecha === diaSeleccionado);
    const programadosDia = habitosCatalogo.filter(h => h.frecuencia && h.frecuencia.includes(diaSemanaStr));

    return {
      fechaFormato: `${d} de ${nombresMeses[m - 1]} de ${y}`,
      gastosDia,
      comprasDia,
      registrosDia,
      programadosDia
    };
  })();

  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-6">
      
      {/* KPI Cards Superiores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl font-black shrink-0">
            🗓️
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Hábitos de Hoy</span>
            <p className="text-2xl font-black text-slate-800">
              {habitosCompletadosHoy.length} / {habitosProgramadosHoy.length}
              <span className="text-sm font-bold text-indigo-600 ml-2">({porcentajeHoy}%)</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-2xl font-black shrink-0">
            💰
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Compromisos Financieros</span>
            <p className="text-2xl font-black text-slate-800">
              ${totalGastosMes.toLocaleString('es-CO')}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl font-black shrink-0">
            🛒
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Proyectado Súper</span>
            <p className="text-2xl font-black text-slate-800">
              ${totalMercadoProyectado.toLocaleString('es-CO')}
            </p>
          </div>
        </div>
      </div>

      {/* Controles de Filtros */}
      <div className="flex flex-wrap gap-2 md:gap-3 bg-white p-2.5 rounded-2xl border border-gray-100 w-max shadow-sm">
        <span className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center px-2 mr-1">Filtros:</span>
        <button 
          onClick={() => setFiltroHabitos(!filtroHabitos)} 
          className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all active:scale-95 ${filtroHabitos ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-50 text-gray-400 opacity-60 border border-gray-200'}`}
        >
          🗓️ Hábitos
        </button>
        <button 
          onClick={() => setFiltroFinanzas(!filtroFinanzas)} 
          className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all active:scale-95 ${filtroFinanzas ? 'bg-red-100 text-red-700' : 'bg-gray-50 text-gray-400 opacity-60 border border-gray-200'}`}
        >
          💰 Gastos
        </button>
        <button 
          onClick={() => setFiltroMercado(!filtroMercado)} 
          className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all active:scale-95 ${filtroMercado ? 'bg-green-100 text-green-700' : 'bg-gray-50 text-gray-400 opacity-60 border border-gray-200'}`}
        >
          🛒 Súper
        </button>
      </div>

      {/* Calendario Interactivo */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">
            {nombresMeses[mesActual]} <span className="text-blue-600">{anioActual}</span>
          </h2>
          <div className="flex gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-200">
            <button 
              onClick={() => { 
                if (mesActual === 0) { 
                  setMesActual(11); 
                  setAnioActual(a => a - 1); 
                } else { 
                  setMesActual(m => m - 1); 
                } 
              }} 
              className="px-4 py-2 bg-white rounded-xl hover:shadow-sm font-bold text-slate-700 active:scale-95 transition-all"
            >
              ◀
            </button>
            <button 
              onClick={() => { 
                setMesActual(new Date().getMonth()); 
                setAnioActual(new Date().getFullYear()); 
              }} 
              className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-md active:scale-95 transition-all"
            >
              Hoy
            </button>
            <button 
              onClick={() => { 
                if (mesActual === 11) { 
                  setMesActual(0); 
                  setAnioActual(a => a + 1); 
                } else { 
                  setMesActual(m => m + 1); 
                } 
              }} 
              className="px-4 py-2 bg-white rounded-xl hover:shadow-sm font-bold text-slate-700 active:scale-95 transition-all"
            >
              ▶
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2 mb-3">
          {diasSemana.map(dia => (
            <div key={dia} className="text-center font-black text-slate-400 text-xs md:text-sm uppercase tracking-widest">{dia}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">{celdasCalendario}</div>
      </div>

      {/* Modal de Detalle de Día */}
      {diaSeleccionado && infoDiaSeleccionado && (
        <Modal 
          isOpen={Boolean(diaSeleccionado)} 
          onClose={() => setDiaSeleccionado(null)} 
          title={`Detalle: ${infoDiaSeleccionado.fechaFormato}`}
        >
          <div className="space-y-6">
            
            {/* Hábitos de este día */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-indigo-600 mb-3 flex items-center gap-1.5">
                <span>🗓️</span> Hábitos del Día ({infoDiaSeleccionado.registrosDia.length} / {infoDiaSeleccionado.programadosDia.length})
              </h4>
              {infoDiaSeleccionado.programadosDia.length === 0 ? (
                <p className="text-sm text-gray-400 bg-gray-50 p-3 rounded-xl border border-gray-100">No hay hábitos programados para este día de la semana.</p>
              ) : (
                <ul className="space-y-2">
                  {infoDiaSeleccionado.programadosDia.map(h => {
                    const completado = infoDiaSeleccionado.registrosDia.some(r => r.habito_id === h.id);
                    return (
                      <li key={h.id} className={`p-3 rounded-xl border flex items-center justify-between text-sm ${completado ? 'bg-green-50/60 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                        <span className="font-bold text-slate-800 flex items-center gap-2">
                          <span className="text-xl">{h.emoji}</span> {h.nombre}
                          <span className="text-xs text-gray-400 font-medium">({h.hora || h.bloque})</span>
                        </span>
                        <span className={`text-xs font-black px-2 py-1 rounded-lg ${completado ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                          {completado ? 'Completado ✔️' : 'Pendiente'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Gastos con vencimiento este día */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-red-600 mb-3 flex items-center gap-1.5">
                <span>💳</span> Compromisos Financieros
              </h4>
              {infoDiaSeleccionado.gastosDia.length === 0 ? (
                <p className="text-sm text-gray-400 bg-gray-50 p-3 rounded-xl border border-gray-100">Sin vencimientos para esta fecha.</p>
              ) : (
                <ul className="space-y-2">
                  {infoDiaSeleccionado.gastosDia.map(g => (
                    <li key={g.id} className="p-3 bg-red-50/40 border border-red-200 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{g.concepto}</p>
                        <span className="text-[10px] font-black uppercase text-red-700 bg-red-100 px-2 py-0.5 rounded-md">{g.categoria || 'General'}</span>
                      </div>
                      <span className="font-black text-slate-900 text-base">${Number(g.monto_total).toLocaleString('es-CO')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Compras de supermercado este día */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-3 flex items-center gap-1.5">
                <span>🛒</span> Compras Registradas
              </h4>
              {infoDiaSeleccionado.comprasDia.length === 0 ? (
                <p className="text-sm text-gray-400 bg-gray-50 p-3 rounded-xl border border-gray-100">Sin compras registradas en esta fecha.</p>
              ) : (
                <ul className="space-y-2">
                  {infoDiaSeleccionado.comprasDia.map(item => (
                    <li key={item.id} className="p-3 bg-emerald-50/40 border border-emerald-200 rounded-xl flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-800">{item.producto_nombre} (x{item.cantidad})</span>
                      <span className="font-black text-emerald-700">${((item.cantidad * item.precio_unitario) * (1 - (item.descuento_porcentaje || 0) / 100)).toLocaleString('es-CO')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>
        </Modal>
      )}

    </div>
  );
}
