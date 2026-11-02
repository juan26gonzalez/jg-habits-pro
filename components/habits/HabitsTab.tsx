import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/ui/Modal';
import type { Habito, HabitoRegistro, UserSession, BloqueHabito } from '@/types';

interface HabitsTabProps {
  habitosCatalogo: Habito[];
  registrosHistoricos: HabitoRegistro[];
  sesion: UserSession;
  strHoy: string;
  onHabitoAgregado: () => void;
  onMarcarHabito: (habitoId: string) => void;
}

const diasSemanaOpciones = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const emojisComunes = ['🏃‍♂️', '💧', '📚', '🏋️‍♂️', '🍎', '🍳', '💤', '💻', '🧘‍♂️', '🧹', '📖', '🚴‍♂️', '💊', '💰', '🚿', '🚗'];

const bloqueConfig: Record<string, { icon: string; color: string; bgTag: string; textTag: string }> = {
  'Mañana': { icon: '🌅', color: 'text-amber-500', bgTag: 'bg-amber-100', textTag: 'text-amber-800' },
  'Tarde': { icon: '☀️', color: 'text-blue-500', bgTag: 'bg-blue-100', textTag: 'text-blue-800' },
  'Noche': { icon: '🌙', color: 'text-indigo-500', bgTag: 'bg-indigo-100', textTag: 'text-indigo-800' }
};

export default function HabitsTab({
  habitosCatalogo,
  registrosHistoricos,
  sesion,
  strHoy,
  onHabitoAgregado,
  onMarcarHabito
}: HabitsTabProps) {
  // Formulario de creación
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevoHabitoNombre, setNuevoHabitoNombre] = useState('');
  const [nuevoHabitoEmoji, setNuevoHabitoEmoji] = useState('🏃‍♂️');
  const [nuevoHabitoHora, setNuevoHabitoHora] = useState(''); 
  const [nuevoHabitoBloque, setNuevoHabitoBloque] = useState<BloqueHabito>('Mañana');
  const [nuevoHabitoDias, setNuevoHabitoDias] = useState<string[]>(diasSemanaOpciones);
  const [guardando, setGuardando] = useState(false);

  // Filtro de bloques
  const [filtroBloque, setFiltroBloque] = useState<'Todos' | BloqueHabito>('Todos');

  // Estado para editar hábito
  const [habitoEditando, setHabitoEditando] = useState<Habito | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [editHora, setEditHora] = useState('');
  const [editBloque, setEditBloque] = useState<BloqueHabito>('Mañana');
  const [editDias, setEditDias] = useState<string[]>([]);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  // Estado para confirmar eliminación
  const [habitoAEliminar, setHabitoAEliminar] = useState<Habito | null>(null);
  const [eliminando, setEliminando] = useState(false);

  function toggleDia(dia: string, lista: string[], setLista: (dias: string[]) => void) {
    if (lista.includes(dia)) {
      setLista(lista.filter(d => d !== dia));
    } else {
      setLista([...lista, dia]);
    }
  }

  async function agregarHabito(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoHabitoNombre || !nuevoHabitoEmoji || !nuevoHabitoHora || !sesion?.user?.id) return;
    if (nuevoHabitoDias.length === 0) {
      alert("Debes seleccionar al menos un día para este hábito.");
      return;
    }
    
    setGuardando(true);
    const { error } = await supabase.from('habitos_catalogo').insert([{ 
      nombre: nuevoHabitoNombre, 
      emoji: nuevoHabitoEmoji, 
      hora: nuevoHabitoHora, 
      bloque: nuevoHabitoBloque, 
      frecuencia: nuevoHabitoDias.join(', '), 
      user_id: sesion.user.id 
    }]);
    
    setGuardando(false);
    if (error) {
      alert(`Error al guardar hábito: ${error.message}`);
    } else {
      setNuevoHabitoNombre('');
      setNuevoHabitoHora('');
      setNuevoHabitoDias(diasSemanaOpciones);
      setMostrarFormulario(false);
      onHabitoAgregado();
    }
  }

  function abrirEdicion(habito: Habito) {
    setHabitoEditando(habito);
    setEditNombre(habito.nombre);
    setEditEmoji(habito.emoji);
    setEditHora(habito.hora || '');
    setEditBloque((habito.bloque as BloqueHabito) || 'Mañana');
    const dias = habito.frecuencia ? habito.frecuencia.split(',').map(d => d.trim()) : diasSemanaOpciones;
    setEditDias(dias);
  }

  async function guardarEdicionHabito(e: React.FormEvent) {
    e.preventDefault();
    if (!habitoEditando || !editNombre || !editEmoji || !editHora || editDias.length === 0) return;
    setGuardandoEdicion(true);

    const { error } = await supabase
      .from('habitos_catalogo')
      .update({
        nombre: editNombre,
        emoji: editEmoji,
        hora: editHora,
        bloque: editBloque,
        frecuencia: editDias.join(', ')
      })
      .eq('id', habitoEditando.id);

    setGuardandoEdicion(false);
    if (error) {
      alert(`Error al actualizar hábito: ${error.message}`);
    } else {
      setHabitoEditando(null);
      onHabitoAgregado();
    }
  }

  async function confirmarEliminarHabito() {
    if (!habitoAEliminar) return;
    setEliminando(true);

    // Eliminar registros asociados y luego el hábito
    await supabase.from('habitos_registros').delete().eq('habito_id', habitoAEliminar.id);
    const { error } = await supabase.from('habitos_catalogo').delete().eq('id', habitoAEliminar.id);

    setEliminando(false);
    if (error) {
      alert(`Error al eliminar hábito: ${error.message}`);
    } else {
      setHabitoAEliminar(null);
      onHabitoAgregado();
    }
  }

  function calcularEstadisticasHabito(habitoId: string) {
    const ultimos7Dias = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    });

    const historial7Dias = ultimos7Dias.reverse().map(fechaStr => 
      registrosHistoricos.some(r => r.habito_id === habitoId && r.fecha === fechaStr)
    );

    const diasCompletados = historial7Dias.filter(Boolean).length;
    const porcentajeSemana = Math.round((diasCompletados / 7) * 100);

    let rachaActual = 0;
    const fechasConRegistro = registrosHistoricos
      .filter(r => r.habito_id === habitoId)
      .map(r => r.fecha)
      .sort()
      .reverse();
    
    if (fechasConRegistro.length > 0) {
      const d = new Date();
      let fechaBusqueda = d.toISOString().split('T')[0];
      
      if (!fechasConRegistro.includes(fechaBusqueda)) {
        d.setDate(d.getDate() - 1);
        fechaBusqueda = d.toISOString().split('T')[0];
      }

      while (fechasConRegistro.includes(fechaBusqueda)) {
        rachaActual++;
        d.setDate(d.getDate() - 1);
        fechaBusqueda = d.toISOString().split('T')[0];
      }
    }

    return { rachaActual, historial7Dias, porcentajeSemana };
  }

  const bloquesVisibles = filtroBloque === 'Todos' 
    ? (['Mañana', 'Tarde', 'Noche'] as const) 
    : [filtroBloque];

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-6">
      
      {/* Botón de apertura / cierre del formulario y Filtro de Bloque */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        <button 
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-2xl active:scale-95 transition-all flex items-center gap-2 shadow-md shadow-blue-500/20"
        >
          <span>{mostrarFormulario ? '✕ Cerrar Formulario' : '✨ Nuevo Hábito'}</span>
        </button>

        <div className="flex items-center gap-1.5 bg-gray-50 p-1.5 rounded-2xl border border-gray-200 text-xs font-bold">
          {(['Todos', 'Mañana', 'Tarde', 'Noche'] as const).map(b => (
            <button
              key={b}
              onClick={() => setFiltroBloque(b)}
              className={`px-3 py-1.5 rounded-xl transition-all ${filtroBloque === b ? 'bg-slate-900 text-white shadow-sm' : 'text-gray-500 hover:text-slate-800'}`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* Formulario Desplegable */}
      {mostrarFormulario && (
        <form onSubmit={agregarHabito} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 animate-fade-in">
          <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">✨ Programar Nuevo Hábito</h3>
          
          <div className="mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-200">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">1. Selecciona un ícono:</p>
            <div className="flex flex-wrap gap-2">
              {emojisComunes.map(emoji => (
                <button 
                  key={emoji} 
                  type="button" 
                  onClick={() => setNuevoHabitoEmoji(emoji)} 
                  className={`text-2xl w-12 h-12 rounded-xl transition-all border-2 flex items-center justify-center active:scale-95 ${nuevoHabitoEmoji === emoji ? 'bg-white border-blue-500 shadow-md scale-110' : 'bg-transparent border-transparent hover:bg-gray-200'}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <input 
              type="text" 
              placeholder="Emoji" 
              value={nuevoHabitoEmoji} 
              onChange={(e) => setNuevoHabitoEmoji(e.target.value)} 
              className="p-4 border border-gray-200 rounded-xl text-slate-900 text-2xl text-center bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500" 
              required 
            />
            <input 
              type="text" 
              placeholder="Nombre de la actividad..." 
              value={nuevoHabitoNombre} 
              onChange={(e) => setNuevoHabitoNombre(e.target.value)} 
              className="p-4 border border-gray-200 rounded-xl text-slate-900 font-medium md:col-span-1 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500" 
              required 
            />
            <input 
              type="time" 
              value={nuevoHabitoHora} 
              onChange={(e) => setNuevoHabitoHora(e.target.value)} 
              className="p-4 border border-gray-200 rounded-xl text-slate-900 font-bold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500" 
              required 
            />
            <select 
              value={nuevoHabitoBloque} 
              onChange={(e) => setNuevoHabitoBloque(e.target.value as BloqueHabito)} 
              className="p-4 border border-gray-200 rounded-xl text-slate-900 font-bold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="Mañana">🌅 Mañana</option>
              <option value="Tarde">☀️ Tarde</option>
              <option value="Noche">🌙 Noche</option>
            </select>
          </div>

          <div className="mb-8">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">2. Selecciona los días a realizar:</p>
            <div className="flex flex-wrap gap-2 md:gap-3">
              {diasSemanaOpciones.map(dia => (
                <button 
                  key={dia} 
                  type="button" 
                  onClick={() => toggleDia(dia, nuevoHabitoDias, setNuevoHabitoDias)} 
                  className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl font-black text-sm shadow-sm transition-all border-2 flex items-center justify-center active:scale-95 ${nuevoHabitoDias.includes(dia) ? 'bg-slate-900 text-white border-slate-900 scale-105' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300 hover:text-slate-700'}`}
                >
                  {dia}
                </button>
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={guardando}
            className="bg-blue-600 text-white font-black py-4 px-6 rounded-2xl hover:bg-blue-700 active:scale-95 transition-all w-full shadow-lg shadow-blue-600/30 text-lg disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar Hábito Programado'}
          </button>
        </form>
      )}

      {/* Columnas de Hábitos por Bloque */}
      <div className={`grid grid-cols-1 ${filtroBloque === 'Todos' ? 'md:grid-cols-3' : 'md:grid-cols-1'} gap-6`}>
        {bloquesVisibles.map((bloque) => {
          const habitosBloque = habitosCatalogo.filter(h => h.bloque === bloque);
          const config = bloqueConfig[bloque];

          return (
            <div key={bloque} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className={`text-lg font-black ${config?.color} mb-5 flex items-center gap-2`}>
                  <span className="text-2xl">{config?.icon}</span> {bloque}
                  <span className="text-xs font-bold text-gray-400 ml-auto bg-gray-50 px-2.5 py-1 rounded-full">
                    {habitosBloque.length}
                  </span>
                </h4>
                
                <ul className="space-y-4">
                  {habitosBloque.length === 0 && (
                    <p className="text-sm font-medium text-gray-400 p-6 border-2 border-dashed border-gray-100 rounded-2xl text-center">
                      Sin hábitos programados en este bloque
                    </p>
                  )}
                  {habitosBloque.map(habito => {
                    const completadoHoy = registrosHistoricos.some(r => r.habito_id === habito.id && r.fecha === strHoy);
                    const { rachaActual, historial7Dias, porcentajeSemana } = calcularEstadisticasHabito(habito.id);
                    
                    return (
                      <li 
                        key={habito.id} 
                        className={`flex flex-col p-4 rounded-2xl transition-all border-2 group ${completadoHoy ? 'bg-green-50/40 border-green-200' : 'bg-white border-gray-100 hover:border-blue-300 hover:shadow-md'}`}
                      >
                        <div className="flex items-start gap-3">
                          
                          {/* Check para completar hábito */}
                          <button 
                            type="button"
                            onClick={() => onMarcarHabito(habito.id)}
                            className="mt-1 cursor-pointer active:scale-90 transition-transform shrink-0"
                            title={completadoHoy ? 'Marcar como pendiente' : 'Marcar como completado'}
                          >
                            {completadoHoy ? (
                              <span className="w-8 h-8 rounded-xl bg-green-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">✓</span>
                            ) : (
                              <div className="w-8 h-8 rounded-xl border-2 border-gray-300 hover:border-blue-500 flex items-center justify-center transition-colors"></div>
                            )}
                          </button>

                          <div className="flex flex-col flex-grow min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{habito.emoji}</span>
                              <span className={`font-black text-base truncate ${completadoHoy ? 'text-green-800 line-through opacity-70' : 'text-slate-800'}`}>
                                {habito.nombre}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              {habito.hora && (
                                <span className="text-xs font-bold text-slate-500 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                                  ⏰ {habito.hora}
                                </span>
                              )}
                              {habito.frecuencia && (
                                <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-md ${completadoHoy ? 'bg-green-200 text-green-800' : `${config?.bgTag} ${config?.textTag}`}`}>
                                  {habito.frecuencia}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Botones de acción: Editar y Eliminar */}
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => abrirEdicion(habito)}
                              className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-600 flex items-center justify-center transition-colors text-xs active:scale-95"
                              title="Editar Hábito"
                            >
                              ✏️
                            </button>
                            <button 
                              onClick={() => setHabitoAEliminar(habito)}
                              className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-600 flex items-center justify-center transition-colors text-xs active:scale-95"
                              title="Eliminar Hábito"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        {/* Barra de progreso y rachas */}
                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1" title={`Racha actual de ${rachaActual} días consecutivos`}>
                            <span className={`text-base ${rachaActual > 0 ? 'opacity-100' : 'opacity-30 grayscale'}`}>🔥</span>
                            <span className="font-black text-slate-700">{rachaActual}</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase">días</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400" title="% cumplimiento en los últimos 7 días">
                              {porcentajeSemana}% sem.
                            </span>
                            <div className="flex gap-1" title="Historial últimos 7 días">
                              {historial7Dias.map((completado, idx) => (
                                <span 
                                  key={idx} 
                                  className={`w-2.5 h-2.5 rounded-full ${completado ? 'bg-green-500' : 'bg-gray-200'} ${idx === 6 ? 'ring-2 ring-gray-200 ring-offset-1' : ''}`}
                                ></span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal para Editar Hábito */}
      {habitoEditando && (
        <Modal 
          isOpen={Boolean(habitoEditando)} 
          onClose={() => setHabitoEditando(null)} 
          title="Editar Hábito"
        >
          <form onSubmit={guardarEdicionHabito} className="space-y-4">
            <div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Nombre</label>
              <input 
                type="text" 
                value={editNombre} 
                onChange={(e) => setEditNombre(e.target.value)} 
                className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold" 
                required 
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Emoji</label>
                <input 
                  type="text" 
                  value={editEmoji} 
                  onChange={(e) => setEditEmoji(e.target.value)} 
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-center text-xl outline-none" 
                  required 
                />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Hora</label>
                <input 
                  type="time" 
                  value={editHora} 
                  onChange={(e) => setEditHora(e.target.value)} 
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 outline-none font-bold" 
                  required 
                />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Bloque</label>
                <select 
                  value={editBloque} 
                  onChange={(e) => setEditBloque(e.target.value as BloqueHabito)} 
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 outline-none font-bold"
                >
                  <option value="Mañana">Mañana</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Noche">Noche</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">Días programados</label>
              <div className="flex flex-wrap gap-2">
                {diasSemanaOpciones.map(dia => (
                  <button 
                    key={dia} 
                    type="button" 
                    onClick={() => toggleDia(dia, editDias, setEditDias)} 
                    className={`w-10 h-10 rounded-xl font-black text-xs transition-all border ${editDias.includes(dia) ? 'bg-slate-900 text-white border-slate-900' : 'bg-gray-50 text-gray-400 border-gray-200'}`}
                  >
                    {dia}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button 
                type="button" 
                onClick={() => setHabitoEditando(null)} 
                className="w-1/2 p-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={guardandoEdicion}
                className="w-1/2 p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md disabled:opacity-50"
              >
                {guardandoEdicion ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {habitoAEliminar && (
        <Modal 
          isOpen={Boolean(habitoAEliminar)} 
          onClose={() => setHabitoAEliminar(null)} 
          title="Eliminar Hábito"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ¿Estás seguro de que deseas eliminar el hábito <strong className="text-slate-800">{habitoAEliminar.emoji} {habitoAEliminar.nombre}</strong>?
            </p>
            <p className="text-xs text-red-500 bg-red-50 p-3 rounded-xl border border-red-200">
              Esta acción eliminará el hábito y todo su historial de registros pasados de forma permanente.
            </p>
            <div className="pt-2 flex gap-3">
              <button 
                type="button" 
                onClick={() => setHabitoAEliminar(null)} 
                className="w-1/2 p-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={confirmarEliminarHabito} 
                disabled={eliminando}
                className="w-1/2 p-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md disabled:opacity-50"
              >
                {eliminando ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
