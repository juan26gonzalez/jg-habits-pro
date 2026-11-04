import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { getFechaActualColombia, sumarDiasFechaStr } from '@/lib/dateUtils';
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
  onMarcarHabito: (habitoId: string, fecha?: string) => void;
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
  onMarcarHabito,
}: DashboardTabProps) {
  const [filtroHabitos, setFiltroHabitos] = useState(true);
  const [filtroFinanzas, setFiltroFinanzas] = useState(true);
  const [filtroMercado, setFiltroMercado] = useState(true);

  // Estado para el modal de detalle del día
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);

  // Cálculos de KPIs superiores con hora de Colombia
  const { diaSemana: diaSemanaCol } = getFechaActualColombia();
  const diaSemanaHoy = mapFrecuenciaDias[diaSemanaCol];
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
        className={`p-2 md:p-3 min-h-[105px] border rounded-2xl transition-all flex flex-col cursor-pointer ${
          esHoy 
            ? 'bg-[#FAF5F0] border-[#2D1C14] shadow-xs ring-1 ring-[#2D1C14]/10' 
            : 'bg-white border-[#EADBCE]/80 hover:border-[#B39380] hover:shadow-xs'
        }`}
      >
        <div className="flex justify-between items-center mb-2">
          <span className={`font-black text-xs px-2 py-0.5 rounded-full ${esHoy ? 'bg-[#2D1C14] text-white' : 'text-[#8D6B57]'}`}>
            {d}
          </span>
          {filtroHabitos && habitosProgramadosEsteDia.length > 0 && (
            <div className="w-10 md:w-14 h-1.5 bg-[#FAF5F0] rounded-full overflow-hidden" title={`${habitosDelDia.length} de ${habitosProgramadosEsteDia.length} hábitos`}>
              <div 
                className="h-full transition-all duration-500 bg-[#2D1C14] rounded-full" 
                style={{ width: `${porcentajeProgreso}%` }}
              ></div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5 flex-grow">
          {filtroFinanzas && gastosDelDia.map((g, i) => (
            <span key={`g-${i}`} className="bg-[#FAF5F0] text-[#3E271D] border border-[#EADBCE] text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 truncate shadow-2xs">
              💳 {g.concepto}
            </span>
          ))}
          {filtroMercado && comprasDelDia.length > 0 && (
            <span key="compras" className="bg-[#FAF5F0] text-[#3E271D] border border-[#EADBCE] text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 truncate shadow-2xs">
              🛒 Súper ({comprasDelDia.length})
            </span>
          )}
          {/* Solo actividades programadas para este día */}
          {filtroHabitos && habitosProgramadosEsteDia.slice(0, 3).map((h) => {
            const completado = habitosDelDia.some(r => r.habito_id === h.id);
            return (
              <span 
                key={`prog-${h.id}`} 
                className={`border text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center justify-between gap-1 truncate shadow-2xs transition-all ${
                  completado 
                    ? 'bg-[#FAF5F0] border-[#EADBCE] text-[#2D1C14]' 
                    : 'bg-white border-[#EADBCE]/60 text-[#6F4A39]'
                }`}
                title={`${h.nombre} (${h.hora || h.bloque}) - ${completado ? 'Completado' : 'Pendiente'}`}
              >
                <span className="truncate flex items-center gap-1">
                  <span>{h.emoji}</span>
                  <span className={`truncate ${completado ? 'line-through opacity-75' : ''}`}>{h.nombre}</span>
                </span>
                {completado ? (
                  <span className="text-[9px] text-[#2D1C14] font-black shrink-0">✓</span>
                ) : (
                  <span className="text-[8px] text-[#8D6B57] font-semibold shrink-0">
                    {h.hora ? (h.hora.includes(' - ') ? h.hora.split(' - ')[0] : h.hora) : ''}
                  </span>
                )}
              </span>
            );
          })}
          {filtroHabitos && habitosProgramadosEsteDia.length > 3 && (
            <span className="text-[9px] font-bold text-[#8D6B57] px-1">
              +{habitosProgramadosEsteDia.length - 3} más
            </span>
          )}
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
      
      {/* KPI Cards Superiores en Marrón Elegante y Blanco */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-[#EADBCE]/80 shadow-[0_2px_16px_rgba(45,28,20,0.03)] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF5F0] text-[#2D1C14] flex items-center justify-center text-xl font-bold shrink-0 border border-[#EADBCE]/60">
            🗓️
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8D6B57]">Hábitos de Hoy</span>
            <p className="text-2xl font-extrabold text-[#2D1C14]">
              {habitosCompletadosHoy.length} / {habitosProgramadosHoy.length}
              <span className="text-xs font-bold text-[#8D6B57] ml-2">({porcentajeHoy}%)</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[#EADBCE]/80 shadow-[0_2px_16px_rgba(45,28,20,0.03)] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF5F0] text-[#2D1C14] flex items-center justify-center text-xl font-bold shrink-0 border border-[#EADBCE]/60">
            💰
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8D6B57]">Compromisos Financieros</span>
            <p className="text-2xl font-extrabold text-[#2D1C14]">
              ${totalGastosMes.toLocaleString('es-CO')}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[#EADBCE]/80 shadow-[0_2px_16px_rgba(45,28,20,0.03)] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF5F0] text-[#2D1C14] flex items-center justify-center text-xl font-bold shrink-0 border border-[#EADBCE]/60">
            🛒
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8D6B57]">Total Proyectado Súper</span>
            <p className="text-2xl font-extrabold text-[#2D1C14]">
              ${totalMercadoProyectado.toLocaleString('es-CO')}
            </p>
          </div>
        </div>
      </div>

      {/* Controles de Filtros */}
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-[#EADBCE]/80 w-max shadow-[0_2px_16px_rgba(45,28,20,0.03)] text-xs font-bold">
        <span className="text-[#8D6B57] uppercase tracking-wider text-[10px] flex items-center px-2 mr-1">Filtros:</span>
        <button 
          onClick={() => setFiltroHabitos(!filtroHabitos)} 
          className={`px-3 py-1.5 rounded-xl transition-all active:scale-95 ${filtroHabitos ? 'bg-[#2D1C14] text-white shadow-xs' : 'bg-[#FAF5F0] text-[#8D6B57]'}`}
        >
          🗓️ Targets
        </button>
        <button 
          onClick={() => setFiltroFinanzas(!filtroFinanzas)} 
          className={`px-3 py-1.5 rounded-xl transition-all active:scale-95 ${filtroFinanzas ? 'bg-[#2D1C14] text-white shadow-xs' : 'bg-[#FAF5F0] text-[#8D6B57]'}`}
        >
          💰 Gastos
        </button>
        <button 
          onClick={() => setFiltroMercado(!filtroMercado)} 
          className={`px-3 py-1.5 rounded-xl transition-all active:scale-95 ${filtroMercado ? 'bg-[#2D1C14] text-white shadow-xs' : 'bg-[#FAF5F0] text-[#8D6B57]'}`}
        >
          🛒 Súper
        </button>
      </div>

      {/* Calendario Minimalista */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_2px_16px_rgba(45,28,20,0.03)] border border-[#EADBCE]/80">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#2D1C14] tracking-tight">
            {nombresMeses[mesActual]} <span className="text-[#8D6B57] font-medium">{anioActual}</span>
          </h2>
          <div className="flex gap-1.5 bg-[#FAF5F0] p-1.5 rounded-2xl border border-[#EADBCE]/60 text-xs font-bold">
            <button 
              onClick={() => { 
                if (mesActual === 0) { 
                  setMesActual(11); 
                  setAnioActual(a => a - 1); 
                } else { 
                  setMesActual(m => m - 1); 
                } 
              }} 
              className="px-3.5 py-1.5 bg-white rounded-xl shadow-2xs text-[#2D1C14] active:scale-95 transition-all"
            >
              ◀
            </button>
            <button 
              type="button"
              onClick={() => { 
                const fechaAyer = sumarDiasFechaStr(strHoy, -1);
                setDiaSeleccionado(fechaAyer);
              }} 
              className="px-3.5 py-1.5 bg-white hover:bg-[#FAF5F0] text-[#6F4A39] hover:text-[#2D1C14] rounded-xl shadow-2xs active:scale-95 transition-all flex items-center gap-1 border border-[#EADBCE]/60"
              title="Abrir y editar actividades de ayer"
            >
              <span>⏪</span> Ayer
            </button>
            <button 
              onClick={() => { 
                const { mes, anio } = getFechaActualColombia();
                setMesActual(mes); 
                setAnioActual(anio); 
              }} 
              className="px-5 py-1.5 bg-[#2D1C14] text-white rounded-xl shadow-xs active:scale-95 transition-all"
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
              className="px-3.5 py-1.5 bg-white rounded-xl shadow-2xs text-[#2D1C14] active:scale-95 transition-all"
            >
              ▶
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2 mb-2">
          {diasSemana.map(dia => (
            <div key={dia} className="text-center font-bold text-[#8D6B57] text-xs uppercase tracking-wider">{dia}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">{celdasCalendario}</div>
      </div>

      {/* Modal de Detalle de Día */}
      {diaSeleccionado && infoDiaSeleccionado && (
        <Modal 
          isOpen={Boolean(diaSeleccionado)} 
          onClose={() => setDiaSeleccionado(null)} 
          title={`Actividades: ${infoDiaSeleccionado.fechaFormato}`}
        >
          <div className="space-y-6">
            
            {/* Navegación rápida de días dentro del modal */}
            <div className="flex items-center justify-between bg-[#FAF5F0] p-2.5 rounded-2xl border border-[#EADBCE]/60 text-xs">
              <button 
                type="button"
                onClick={() => setDiaSeleccionado(sumarDiasFechaStr(diaSeleccionado, -1))}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF5F0] text-[#2D1C14] font-bold border border-[#EADBCE]/60 flex items-center gap-1 active:scale-95 transition-all shadow-2xs"
                title="Ir al día anterior"
              >
                <span>◀</span> Anterior
              </button>
              <div className="text-center">
                <span className="font-extrabold text-[#2D1C14] text-xs block">
                  {diaSeleccionado === strHoy ? '✨ Hoy' : (diaSeleccionado === sumarDiasFechaStr(strHoy, -1) ? '⏪ Ayer' : infoDiaSeleccionado.fechaFormato)}
                </span>
                <span className="text-[10px] text-[#8D6B57] font-semibold">
                  {diaSeleccionado}
                </span>
              </div>
              <button 
                type="button"
                onClick={() => setDiaSeleccionado(sumarDiasFechaStr(diaSeleccionado, 1))}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF5F0] text-[#2D1C14] font-bold border border-[#EADBCE]/60 flex items-center gap-1 active:scale-95 transition-all shadow-2xs"
                title="Ir al día siguiente"
              >
                Siguiente <span>▶</span>
              </button>
            </div>
            
            {/* Hábitos de este día */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#8D6B57] flex items-center gap-1.5">
                  <span>🎯</span> Targets Programados ({infoDiaSeleccionado.registrosDia.length} / {infoDiaSeleccionado.programadosDia.length})
                </h4>
                {diaSeleccionado === sumarDiasFechaStr(strHoy, -1) && (
                  <span className="text-[10px] font-bold text-[#8D6B57] bg-[#FAF5F0] px-2 py-0.5 rounded-md border border-[#EADBCE]/60">
                    Editando ayer
                  </span>
                )}
              </div>

              {infoDiaSeleccionado.programadosDia.length === 0 ? (
                <p className="text-xs text-[#8D6B57] bg-[#FAF5F0] p-4 rounded-2xl border border-[#EADBCE] text-center font-medium">
                  Sin targets programados para este día.
                </p>
              ) : (
                <ul className="space-y-2">
                  {infoDiaSeleccionado.programadosDia.map(h => {
                    const completado = infoDiaSeleccionado.registrosDia.some(r => r.habito_id === h.id);
                    return (
                      <li 
                        key={h.id} 
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          completado ? 'bg-[#FAF5F0] border-[#EADBCE]' : 'bg-white border-[#EADBCE]/70 hover:border-[#D9C4B3]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Botón Checkbox interactivo para editar el día */}
                          <button 
                            type="button"
                            onClick={() => onMarcarHabito(h.id, diaSeleccionado)}
                            className="cursor-pointer active:scale-90 transition-transform shrink-0"
                            title={completado ? 'Marcar como pendiente' : 'Marcar como completado'}
                          >
                            {completado ? (
                              <span className="w-7 h-7 rounded-lg bg-[#2D1C14] text-white flex items-center justify-center font-bold text-sm shadow-xs">✓</span>
                            ) : (
                              <div className="w-7 h-7 rounded-lg border-2 border-[#EADBCE] hover:border-[#2D1C14] flex items-center justify-center transition-colors"></div>
                            )}
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{h.emoji}</span>
                              <span className={`font-bold text-sm truncate ${completado ? 'text-[#8D6B57] line-through' : 'text-[#2D1C14]'}`}>
                                {h.nombre}
                              </span>
                            </div>

                            {/* Horario bien detallado (Inicio y Fin) */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {h.hora ? (
                                <span className="text-[10px] font-bold text-[#4A3225] bg-white px-2 py-0.5 rounded-md border border-[#EADBCE]/80 flex items-center gap-1 shadow-2xs">
                                  <span>⏰</span>
                                  {h.hora.includes(' - ') ? (
                                    <span>
                                      Inicio: <strong className="text-[#2D1C14]">{h.hora.split(' - ')[0]}</strong> • Fin: <strong className="text-[#2D1C14]">{h.hora.split(' - ')[1]}</strong>
                                    </span>
                                  ) : (
                                    <span>
                                      Hora: <strong className="text-[#2D1C14]">{h.hora}</strong>
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-[10px] text-[#8D6B57] bg-white px-2 py-0.5 rounded-md border border-[#EADBCE]/60">
                                  Sin horario asignado
                                </span>
                              )}
                              {h.bloque && (
                                <span className="text-[9px] font-bold uppercase text-[#8D6B57] bg-white px-1.5 py-0.5 rounded border border-[#EADBCE]/70">
                                  {h.bloque}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Botón de acción directo */}
                        <button 
                          type="button"
                          onClick={() => onMarcarHabito(h.id, diaSeleccionado)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all active:scale-95 shrink-0 ${
                            completado 
                              ? 'bg-[#2D1C14] text-white border-[#2D1C14] shadow-xs' 
                              : 'bg-[#FAF5F0] text-[#6F4A39] border-[#EADBCE] hover:border-[#2D1C14]'
                          }`}
                        >
                          {completado ? 'Listo ✔' : 'Completar'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Gastos con vencimiento este día */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#8D6B57] mb-2 flex items-center gap-1.5">
                <span>💳</span> Compromisos Financieros
              </h4>
              {infoDiaSeleccionado.gastosDia.length === 0 ? (
                <p className="text-xs text-[#8D6B57] bg-[#FAF5F0] p-3 rounded-xl border border-[#EADBCE]">Sin vencimientos para esta fecha.</p>
              ) : (
                <ul className="space-y-1.5">
                  {infoDiaSeleccionado.gastosDia.map(g => (
                    <li key={g.id} className="p-2.5 bg-[#FAF5F0] border border-[#EADBCE] rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-[#2D1C14]">{g.concepto}</p>
                        <span className="text-[9px] font-bold uppercase text-[#8D6B57] bg-white px-1.5 py-0.5 rounded border border-[#EADBCE]">{g.categoria || 'General'}</span>
                      </div>
                      <span className="font-extrabold text-[#2D1C14] text-sm">${Number(g.monto_total).toLocaleString('es-CO')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Compras de supermercado este día */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#8D6B57] mb-2 flex items-center gap-1.5">
                <span>🛒</span> Compras Registradas
              </h4>
              {infoDiaSeleccionado.comprasDia.length === 0 ? (
                <p className="text-xs text-[#8D6B57] bg-[#FAF5F0] p-3 rounded-xl border border-[#EADBCE]">Sin compras registradas en esta fecha.</p>
              ) : (
                <ul className="space-y-1.5">
                  {infoDiaSeleccionado.comprasDia.map(item => (
                    <li key={item.id} className="p-2.5 bg-[#FAF5F0] border border-[#EADBCE] rounded-xl flex items-center justify-between text-xs">
                      <span className="font-bold text-[#2D1C14]">{item.producto_nombre} (x{item.cantidad})</span>
                      <span className="font-extrabold text-[#2D1C14]">${((item.cantidad * item.precio_unitario) * (1 - (item.descuento_porcentaje || 0) / 100)).toLocaleString('es-CO')}</span>
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
