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

const bloqueConfig: Record<string, { icon: string; bgTag: string; textTag: string }> = {
  'Mañana': { icon: '🌅', bgTag: 'bg-[#FAF5F0]', textTag: 'text-[#4A3225]' },
  'Tarde': { icon: '☀️', bgTag: 'bg-[#FAF5F0]', textTag: 'text-[#4A3225]' },
  'Noche': { icon: '🌙', bgTag: 'bg-[#FAF5F0]', textTag: 'text-[#4A3225]' }
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
      alert(`Error al guardar target: ${error.message}`);
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
      alert(`Error al actualizar target: ${error.message}`);
    } else {
      setHabitoEditando(null);
      onHabitoAgregado();
    }
  }

  async function confirmarEliminarHabito() {
    if (!habitoAEliminar) return;
    setEliminando(true);

    await supabase.from('habitos_registros').delete().eq('habito_id', habitoAEliminar.id);
    const { error } = await supabase.from('habitos_catalogo').delete().eq('id', habitoAEliminar.id);

    setEliminando(false);
    if (error) {
      alert(`Error al eliminar target: ${error.message}`);
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3.5 rounded-3xl border border-[#EADBCE]/80 shadow-[0_2px_16px_rgba(45,28,20,0.03)]">
        <button 
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          className="bg-[#2D1C14] hover:bg-[#3E271D] text-white font-bold px-4 py-2.5 rounded-2xl active:scale-95 transition-all flex items-center gap-2 shadow-xs text-xs"
        >
          <span>{mostrarFormulario ? '✕ Cerrar' : '🎯 Nuevo Target'}</span>
        </button>

        <div className="flex items-center gap-1 bg-[#FAF5F0] p-1 rounded-xl text-xs font-bold border border-[#EADBCE]/60">
          {(['Todos', 'Mañana', 'Tarde', 'Noche'] as const).map(b => (
            <button
              key={b}
              onClick={() => setFiltroBloque(b)}
              className={`px-3 py-1.5 rounded-lg transition-all ${filtroBloque === b ? 'bg-[#2D1C14] text-white shadow-xs' : 'text-[#8D6B57] hover:text-[#2D1C14]'}`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* Formulario Desplegable */}
      {mostrarFormulario && (
        <form onSubmit={agregarHabito} className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_2px_16px_rgba(45,28,20,0.03)] border border-[#EADBCE]/80 animate-fade-in space-y-5">
          <h3 className="text-lg font-bold text-[#2D1C14] flex items-center gap-2">🎯 Programar Nuevo Target</h3>
          
          <div className="bg-[#FAF5F0] p-4 rounded-2xl border border-[#EADBCE]/70">
            <p className="text-xs font-bold text-[#8D6B57] uppercase tracking-wider mb-2.5">1. Selecciona un ícono:</p>
            <div className="flex flex-wrap gap-2">
              {emojisComunes.map(emoji => (
                <button 
                  key={emoji} 
                  type="button" 
                  onClick={() => setNuevoHabitoEmoji(emoji)} 
                  className={`text-xl w-10 h-10 rounded-xl transition-all border flex items-center justify-center active:scale-90 ${nuevoHabitoEmoji === emoji ? 'bg-white border-[#2D1C14] shadow-xs scale-105' : 'bg-transparent border-transparent hover:bg-[#EADBCE]/40'}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input 
              type="text" 
              placeholder="Emoji" 
              value={nuevoHabitoEmoji} 
              onChange={(e) => setNuevoHabitoEmoji(e.target.value)} 
              className="p-3 border border-[#EADBCE] rounded-xl text-[#2D1C14] text-xl text-center bg-[#FAF5F0]/50 outline-none focus:bg-white focus:border-[#2D1C14]" 
              required 
            />
            <input 
              type="text" 
              placeholder="Nombre del target..." 
              value={nuevoHabitoNombre} 
              onChange={(e) => setNuevoHabitoNombre(e.target.value)} 
              className="p-3 border border-[#EADBCE] rounded-xl text-[#2D1C14] font-bold md:col-span-1 bg-[#FAF5F0]/50 outline-none focus:bg-white focus:border-[#2D1C14] text-sm" 
              required 
            />
            <input 
              type="time" 
              value={nuevoHabitoHora} 
              onChange={(e) => setNuevoHabitoHora(e.target.value)} 
              className="p-3 border border-[#EADBCE] rounded-xl text-[#2D1C14] font-bold bg-[#FAF5F0]/50 outline-none focus:bg-white focus:border-[#2D1C14] text-sm" 
              required 
            />
            <select 
              value={nuevoHabitoBloque} 
              onChange={(e) => setNuevoHabitoBloque(e.target.value as BloqueHabito)} 
              className="p-3 border border-[#EADBCE] rounded-xl text-[#2D1C14] font-bold bg-[#FAF5F0]/50 outline-none focus:bg-white focus:border-[#2D1C14] text-sm"
            >
              <option value="Mañana">🌅 Mañana</option>
              <option value="Tarde">☀️ Tarde</option>
              <option value="Noche">🌙 Noche</option>
            </select>
          </div>

          <div>
            <p className="text-xs font-bold text-[#8D6B57] uppercase tracking-wider mb-2.5">2. Selecciona los días a realizar:</p>
            <div className="flex flex-wrap gap-2">
              {diasSemanaOpciones.map(dia => (
                <button 
                  key={dia} 
                  type="button" 
                  onClick={() => toggleDia(dia, nuevoHabitoDias, setNuevoHabitoDias)} 
                  className={`w-11 h-11 rounded-xl font-bold text-xs shadow-2xs transition-all border flex items-center justify-center active:scale-95 ${nuevoHabitoDias.includes(dia) ? 'bg-[#2D1C14] text-white border-[#2D1C14]' : 'bg-white text-[#8D6B57] border-[#EADBCE] hover:text-[#2D1C14]'}`}
                >
                  {dia}
                </button>
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={guardando}
            className="bg-[#2D1C14] text-white font-bold py-3.5 px-6 rounded-xl hover:bg-[#3E271D] active:scale-95 transition-all w-full shadow-xs text-sm disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar Target'}
          </button>
        </form>
      )}

      {/* Columnas de Hábitos por Bloque */}
      <div className={`grid grid-cols-1 ${filtroBloque === 'Todos' ? 'md:grid-cols-3' : 'md:grid-cols-1'} gap-5`}>
        {bloquesVisibles.map((bloque) => {
          const habitosBloque = habitosCatalogo.filter(h => h.bloque === bloque);
          const config = bloqueConfig[bloque];

          return (
            <div key={bloque} className="bg-white p-6 rounded-3xl border border-[#EADBCE]/80 shadow-[0_2px_16px_rgba(45,28,20,0.03)] flex flex-col justify-between">
              <div>
                <h4 className="text-base font-extrabold text-[#2D1C14] mb-4 flex items-center gap-2">
                  <span className="text-xl">{config?.icon}</span> {bloque}
                  <span className="text-[10px] font-bold text-[#8D6B57] ml-auto bg-[#FAF5F0] px-2.5 py-0.5 rounded-full border border-[#EADBCE]/60">
                    {habitosBloque.length}
                  </span>
                </h4>
                
                <ul className="space-y-3">
                  {habitosBloque.length === 0 && (
                    <p className="text-xs font-medium text-[#8D6B57] p-6 border border-dashed border-[#EADBCE] rounded-2xl text-center">
                      Sin targets en este bloque
                    </p>
                  )}
                  {habitosBloque.map(habito => {
                    const completadoHoy = registrosHistoricos.some(r => r.habito_id === habito.id && r.fecha === strHoy);
                    const { rachaActual, historial7Dias, porcentajeSemana } = calcularEstadisticasHabito(habito.id);
                    
                    return (
                      <li 
                        key={habito.id} 
                        className={`flex flex-col p-4 rounded-2xl transition-all border group ${completadoHoy ? 'bg-[#FAF5F0] border-[#EADBCE]' : 'bg-white border-[#EADBCE]/70 hover:border-[#D9C4B3]'}`}
                      >
                        <div className="flex items-start gap-3">
                          
                          {/* Check para completar hábito */}
                          <button 
                            type="button"
                            onClick={() => onMarcarHabito(habito.id)}
                            className="mt-0.5 cursor-pointer active:scale-90 transition-transform shrink-0"
                            title={completadoHoy ? 'Marcar pendiente' : 'Marcar completado'}
                          >
                            {completadoHoy ? (
                              <span className="w-7 h-7 rounded-lg bg-[#2D1C14] text-white flex items-center justify-center font-bold text-sm shadow-xs">✓</span>
                            ) : (
                              <div className="w-7 h-7 rounded-lg border-2 border-[#EADBCE] hover:border-[#2D1C14] flex items-center justify-center transition-colors"></div>
                            )}
                          </button>

                          <div className="flex flex-col flex-grow min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{habito.emoji}</span>
                              <span className={`font-bold text-sm truncate ${completadoHoy ? 'text-[#8D6B57] line-through' : 'text-[#2D1C14]'}`}>
                                {habito.nombre}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              {habito.hora && (
                                <span className="text-[10px] font-bold text-[#8D6B57] bg-[#FAF5F0] px-2 py-0.5 rounded-md border border-[#EADBCE]/50">
                                  ⏰ {habito.hora}
                                </span>
                              )}
                              {habito.frecuencia && (
                                <span className="text-[9px] uppercase font-bold text-[#8D6B57] bg-[#FAF5F0] px-1.5 py-0.5 rounded-md border border-[#EADBCE]/50">
                                  {habito.frecuencia}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Botones de acción: Editar y Eliminar */}
                          <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => abrirEdicion(habito)}
                              className="w-6 h-6 rounded-md hover:bg-[#FAF5F0] text-[#8D6B57] hover:text-[#2D1C14] flex items-center justify-center transition-colors text-xs active:scale-95"
                              title="Editar"
                            >
                              ✏️
                            </button>
                            <button 
                              onClick={() => setHabitoAEliminar(habito)}
                              className="w-6 h-6 rounded-md hover:bg-rose-50 text-[#8D6B57] hover:text-rose-600 flex items-center justify-center transition-colors text-xs active:scale-95"
                              title="Eliminar"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        {/* Barra de progreso y rachas */}
                        <div className="mt-3 pt-2.5 border-t border-[#EADBCE]/50 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1" title={`Racha actual de ${rachaActual} días`}>
                            <span className={`text-sm ${rachaActual > 0 ? 'opacity-100' : 'opacity-20 grayscale'}`}>🔥</span>
                            <span className="font-extrabold text-[#2D1C14] text-xs">{rachaActual}</span>
                            <span className="text-[10px] text-[#8D6B57] font-bold uppercase">días</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-[#8D6B57]" title="% últimos 7 días">
                              {porcentajeSemana}% sem.
                            </span>
                            <div className="flex gap-1" title="Historial últimos 7 días">
                              {historial7Dias.map((completado, idx) => (
                                <span 
                                  key={idx} 
                                  className={`w-2 h-2 rounded-full ${completado ? 'bg-[#2D1C14]' : 'bg-[#EADBCE]'}`}
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
          title="Editar Target"
        >
          <form onSubmit={guardarEdicionHabito} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#8D6B57] uppercase tracking-wider block mb-1">Nombre</label>
              <input 
                type="text" 
                value={editNombre} 
                onChange={(e) => setEditNombre(e.target.value)} 
                className="w-full p-3 border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 focus:bg-white focus:border-[#2D1C14] outline-none font-bold text-sm text-[#2D1C14]" 
                required 
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-bold text-[#8D6B57] uppercase tracking-wider block mb-1">Emoji</label>
                <input 
                  type="text" 
                  value={editEmoji} 
                  onChange={(e) => setEditEmoji(e.target.value)} 
                  className="w-full p-3 border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 text-center text-xl outline-none" 
                  required 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#8D6B57] uppercase tracking-wider block mb-1">Hora</label>
                <input 
                  type="time" 
                  value={editHora} 
                  onChange={(e) => setEditHora(e.target.value)} 
                  className="w-full p-3 border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 outline-none font-bold text-sm text-[#2D1C14]" 
                  required 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#8D6B57] uppercase tracking-wider block mb-1">Bloque</label>
                <select 
                  value={editBloque} 
                  onChange={(e) => setEditBloque(e.target.value as BloqueHabito)} 
                  className="w-full p-3 border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 outline-none font-bold text-sm text-[#2D1C14]"
                >
                  <option value="Mañana">Mañana</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Noche">Noche</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#8D6B57] uppercase tracking-wider block mb-2">Días programados</label>
              <div className="flex flex-wrap gap-2">
                {diasSemanaOpciones.map(dia => (
                  <button 
                    key={dia} 
                    type="button" 
                    onClick={() => toggleDia(dia, editDias, setEditDias)} 
                    className={`w-9 h-9 rounded-xl font-bold text-xs transition-all border ${editDias.includes(dia) ? 'bg-[#2D1C14] text-white border-[#2D1C14]' : 'bg-[#FAF5F0] text-[#8D6B57] border-[#EADBCE]'}`}
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
                className="w-1/2 p-3 rounded-xl border border-[#EADBCE] text-[#6F4A39] font-bold hover:bg-[#FAF5F0] text-sm"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={guardandoEdicion}
                className="w-1/2 p-3 rounded-xl bg-[#2D1C14] hover:bg-[#3E271D] text-white font-bold shadow-xs disabled:opacity-50 text-sm"
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
          title="Eliminar Target"
        >
          <div className="space-y-4">
            <p className="text-sm text-[#6F4A39]">
              ¿Estás seguro de que deseas eliminar el target <strong className="text-[#2D1C14]">{habitoAEliminar.emoji} {habitoAEliminar.nombre}</strong>?
            </p>
            <p className="text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">
              Esta acción eliminará el target y todo su historial de registros pasados de forma permanente.
            </p>
            <div className="pt-2 flex gap-3">
              <button 
                type="button" 
                onClick={() => setHabitoAEliminar(null)} 
                className="w-1/2 p-3 rounded-xl border border-[#EADBCE] text-[#6F4A39] font-bold hover:bg-[#FAF5F0] text-sm"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={confirmarEliminarHabito} 
                disabled={eliminando}
                className="w-1/2 p-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs disabled:opacity-50 text-sm"
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
