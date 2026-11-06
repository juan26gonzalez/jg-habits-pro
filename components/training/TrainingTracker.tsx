import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getFechaActualColombia } from '@/lib/dateUtils';
import type { WeeklyTrainingHabit, UserSession } from '@/types';

interface TrainingTrackerProps {
  sesion?: UserSession;
}

// Configuración detallada de cada entrenamiento
const configEntrenamientos: Record<string, { icono: string; categoria: string; descripcion: string; badge: string }> = {
  'Lunes': {
    icono: '🏋️‍♂️',
    categoria: 'Fuerza Pierna',
    badge: 'Leg Day',
    descripcion: 'Sentadillas pesadas, peso muerto rumano, zancadas y tren inferior'
  },
  'Martes': {
    icono: '🚴‍♂️',
    categoria: 'Potencia / Peloton',
    badge: 'Cardio Hiit',
    descripcion: 'Sesión de potencia, intervalos de alta cadencia y resistencia aeróbica'
  },
  'Miércoles': {
    icono: '🏃‍♂️',
    categoria: 'Velocidad en Pista',
    badge: 'Track Intervals',
    descripcion: 'Series de ritmo controlado, técnica de pisada y umbral de lactato'
  },
  'Jueves': {
    icono: '💪',
    categoria: 'Fuerza Espalda',
    badge: 'Pull & Core',
    descripcion: 'Dominadas, jalones al pecho, remo con barra y fortalecimiento de core'
  },
  'Viernes': {
    icono: '⚡',
    categoria: 'Fartlek Asfalto',
    badge: 'Speed Play',
    descripcion: 'Cambios de ritmo continuos en calle simulando ritmos de carrera'
  },
  'Sábado': {
    icono: '🏔️',
    categoria: 'Fondo / Resistencia',
    badge: 'Long Run 12K',
    descripcion: 'Tirada larga de 12 km a ritmo aeróbico constante y fondo cardiovascular'
  },
  'Domingo': {
    icono: '🧘‍♂️',
    categoria: 'Recuperación Activa',
    badge: 'Active Rest',
    descripcion: 'Caminata regenerativa, estiramientos de cadenas miofasciales y movilidad'
  }
};

const diasSemanaOrden = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Hábitos predeterminados iniciales (para disponibilidad instantánea)
const datosInicialesSemana: WeeklyTrainingHabit[] = [
  { id: 'hab-lun', day_of_week: 'Lunes', activity: 'Gym Tren Inferior', is_completed: false },
  { id: 'hab-mar', day_of_week: 'Martes', activity: 'Upper Body Peloton', is_completed: false },
  { id: 'hab-mie', day_of_week: 'Miércoles', activity: 'Pista Trote', is_completed: false },
  { id: 'hab-jue', day_of_week: 'Jueves', activity: 'Gym Espalda', is_completed: false },
  { id: 'hab-vie', day_of_week: 'Viernes', activity: 'Fartlek Calle', is_completed: false },
  { id: 'hab-sab', day_of_week: 'Sábado', activity: 'Tirada Larga 12km', is_completed: false },
  { id: 'hab-dom', day_of_week: 'Domingo', activity: 'Descanso Activo', is_completed: false }
];

const SQL_MIGRACION = `-- Ejecuta este script en Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS public.weekly_training_habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_of_week TEXT NOT NULL,
    activity TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_user_day UNIQUE(user_id, day_of_week)
);

ALTER TABLE public.weekly_training_habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "habitos_entrenamiento_select" ON public.weekly_training_habits FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "habitos_entrenamiento_insert" ON public.weekly_training_habits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "habitos_entrenamiento_update" ON public.weekly_training_habits FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "habitos_entrenamiento_delete" ON public.weekly_training_habits FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.weekly_training_habits;`;

export default function TrainingTracker({ sesion: sesionProp }: TrainingTrackerProps) {
  const [sesion, setSesion] = useState<UserSession>(sesionProp || null);
  const [habits, setHabits] = useState<WeeklyTrainingHabit[]>(datosInicialesSemana);
  const [sincronizadoNube, setSincronizadoNube] = useState(false);
  const [mostrarModalSql, setMostrarModalSql] = useState(false);
  const [sqlCopiado, setSqlCopiado] = useState(false);
  const [notificacionEspecial, setNotificacionEspecial] = useState<{ visible: boolean; mensaje: string } | null>(null);

  // Obtener el día actual en Colombia
  const mapDiaSemanaTexto = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const { diaSemana: diaSemanaIndex, fechaStr } = getFechaActualColombia();
  const diaActualTexto = mapDiaSemanaTexto[diaSemanaIndex] || 'Lunes';

  const claveLocalStorage = sesion?.user?.id 
    ? `jgm_training_habits_${sesion.user.id}` 
    : 'jgm_training_habits_guest';

  // Obtener sesión activa si no vino en props
  useEffect(() => {
    if (sesionProp) {
      setSesion(sesionProp);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSesion(data.session);
    });
  }, [sesionProp]);

  // 1. Cargar hábitos iniciales desde localStorage para renderizado en 0ms
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const guardado = localStorage.getItem(claveLocalStorage);
        if (guardado) {
          const parseado = JSON.parse(guardado);
          if (Array.isArray(parseado) && parseado.length > 0) {
            setHabits(parseado);
          }
        }
      } catch {
        // Fallback a datosInicialesSemana
      }
    }
  }, [claveLocalStorage]);

  // 2. Sincronizar con Supabase (en la nube) si la tabla existe
  const sincronizarConSupabase = useCallback(async () => {
    if (!sesion?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('weekly_training_habits')
        .select('*')
        .eq('user_id', sesion.user.id);

      if (error) {
        // La tabla aún no ha sido creada en Supabase (error 404 de PostgREST)
        setSincronizadoNube(false);
        return;
      }

      setSincronizadoNube(true);

      // Si la tabla existe pero el usuario no tiene registros, los insertamos
      if (!data || data.length === 0) {
        const inserts = datosInicialesSemana.map(item => ({
          user_id: sesion.user.id,
          day_of_week: item.day_of_week,
          activity: item.activity,
          is_completed: false
        }));

        const { data: dataInsertada } = await supabase
          .from('weekly_training_habits')
          .insert(inserts)
          .select();

        if (dataInsertada && dataInsertada.length > 0) {
          setHabits(dataInsertada as WeeklyTrainingHabit[]);
          localStorage.setItem(claveLocalStorage, JSON.stringify(dataInsertada));
        }
      } else {
        setHabits(data as WeeklyTrainingHabit[]);
        localStorage.setItem(claveLocalStorage, JSON.stringify(data));
      }
    } catch {
      setSincronizadoNube(false);
    }
  }, [sesion?.user?.id, claveLocalStorage]);

  useEffect(() => {
    if (sesion?.user?.id) {
      sincronizarConSupabase();
    }
  }, [sesion?.user?.id, sincronizarConSupabase]);

  // 3. Suscripción Realtime a Supabase
  useEffect(() => {
    if (!sesion?.user?.id || !sincronizadoNube) return;

    const canal = supabase
      .channel('realtime_weekly_training_habits')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'weekly_training_habits',
          filter: `user_id=eq.${sesion.user.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as WeeklyTrainingHabit;
            setHabits(prev => {
              const nuevaLista = prev.map(h => (h.id === updated.id ? updated : h));
              localStorage.setItem(claveLocalStorage, JSON.stringify(nuevaLista));
              return nuevaLista;
            });
          } else if (payload.eventType === 'INSERT') {
            const inserted = payload.new as WeeklyTrainingHabit;
            setHabits(prev => {
              if (prev.some(h => h.id === inserted.id)) return prev;
              const nuevaLista = [...prev, inserted];
              localStorage.setItem(claveLocalStorage, JSON.stringify(nuevaLista));
              return nuevaLista;
            });
          } else if (payload.eventType === 'DELETE') {
            setHabits(prev => {
              const nuevaLista = prev.filter(h => h.id !== payload.old.id);
              localStorage.setItem(claveLocalStorage, JSON.stringify(nuevaLista));
              return nuevaLista;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [sesion?.user?.id, sincronizadoNube, claveLocalStorage]);

  // Disparador del evento Grocery: añade "Huevos y Arepa" a la compra actual
  const dispararAgregarHuevosYArepa = async () => {
    if (!sesion?.user?.id) return;

    try {
      const nombreItem = 'Huevos y Arepa (Post-Entreno)';
      const { data: existentes } = await supabase
        .from('mercado_lista')
        .select('id')
        .eq('user_id', sesion.user.id)
        .eq('producto_nombre', nombreItem)
        .limit(1);

      if (!existentes || existentes.length === 0) {
        await supabase.from('mercado_lista').insert([{
          producto_nombre: nombreItem,
          categoria: '🥫 Despensa y Granos',
          cantidad: 1,
          precio_unitario: 14000,
          descuento_porcentaje: 0,
          comprado: false,
          user_id: sesion.user.id
        }]);
      }

      setNotificacionEspecial({
        visible: true,
        mensaje: "🍳 ¡Tirada Larga 12km completada! Añadimos automáticamente 'Huevos y Arepa' a tu lista de Grocery para tu recuperación."
      });
      setTimeout(() => setNotificacionEspecial(null), 6000);
    } catch (err) {
      console.error('Error al agregar a supermercado:', err);
    }
  };

  // Manejador del cambio de checkbox (con actualización optimista, localStorage y realtime)
  const handleCheckboxChange = async (habit: WeeklyTrainingHabit) => {
    const nuevoEstado = !habit.is_completed;

    // 1. Actualización optimista inmediata en la UI y respaldo en localStorage (0ms)
    const habitsActualizados = habits.map(h => (h.id === habit.id ? { ...h, is_completed: nuevoEstado } : h));
    setHabits(habitsActualizados);
    localStorage.setItem(claveLocalStorage, JSON.stringify(habitsActualizados));

    // =====================================================================================
    // 🚨 DISPARADOR DE EVENTO ESPECIAL (SUPERMERCADO):
    // Aquí es donde se dispara el evento cuando el usuario completa la "Tirada Larga 12km"
    // del Sábado, agregando automáticamente "Huevos y Arepa" a la lista de Grocery.
    // =====================================================================================
    if (
      nuevoEstado === true &&
      habit.day_of_week === 'Sábado' &&
      habit.activity.toLowerCase().includes('tirada larga')
    ) {
      await dispararAgregarHuevosYArepa();
    }
    // =====================================================================================

    // 2. Persistencia en Supabase (si la tabla está disponible en la nube)
    if (sincronizadoNube && habit.id && !habit.id.startsWith('hab-')) {
      const { error } = await supabase
        .from('weekly_training_habits')
        .update({ is_completed: nuevoEstado, updated_at: new Date().toISOString() })
        .eq('id', habit.id);

      if (error) {
        console.warn('Error al actualizar en Supabase:', error.message);
      }
    }
  };

  // Reiniciar la semana (todos los hábitos a pendiente)
  const reiniciarSemana = async () => {
    const confirmar = confirm("¿Deseas reiniciar todos los entrenamientos de la semana a pendientes?");
    if (!confirmar) return;

    const reseteados = habits.map(h => ({ ...h, is_completed: false }));
    setHabits(reseteados);
    localStorage.setItem(claveLocalStorage, JSON.stringify(reseteados));

    if (sincronizadoNube && sesion?.user?.id) {
      await supabase
        .from('weekly_training_habits')
        .update({ is_completed: false, updated_at: new Date().toISOString() })
        .eq('user_id', sesion.user.id);
    }
  };

  const copiarSql = () => {
    navigator.clipboard.writeText(SQL_MIGRACION);
    setSqlCopiado(true);
    setTimeout(() => setSqlCopiado(false), 3000);
  };

  // Ordenar hábitos de Lunes a Domingo
  const habitosOrdenados = [...habits].sort(
    (a, b) => diasSemanaOrden.indexOf(a.day_of_week) - diasSemanaOrden.indexOf(b.day_of_week)
  );

  // Identificar el hábito del día actual (Héroe)
  const habitoHoy = habitosOrdenados.find(h => h.day_of_week === diaActualTexto) || habitosOrdenados[0];
  // Los otros 6 días para la cuadrícula secundaria
  const otrosDias = habitosOrdenados.filter(h => h.day_of_week !== diaActualTexto);

  // Cálculos de progreso
  const totalCompletados = habits.filter(h => h.is_completed).length;
  const porcentajeProgreso = habits.length > 0 ? Math.round((totalCompletados / habits.length) * 100) : 0;
  const configHoy = habitoHoy ? configEntrenamientos[habitoHoy.day_of_week] : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      
      {/* Banner de Estado de Sincronización */}
      {!sincronizadoNube && (
        <div className="bg-[#FAF5F0] border border-[#EADBCE] text-[#4A3225] p-3.5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs font-semibold shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-base">💾</span>
            <span>
              <strong>Modo Local Activo:</strong> Tus entrenamientos se guardan y funcionan en este dispositivo.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMostrarModalSql(true)}
            className="text-[11px] font-bold bg-[#2D1C14] hover:bg-[#3E271D] text-white px-3 py-1.5 rounded-xl transition-all active:scale-95 shadow-xs shrink-0 flex items-center gap-1"
          >
            <span>☁️</span> Activar Nube Supabase
          </button>
        </div>
      )}

      {/* Toast Especial Post-Entreno */}
      {notificacionEspecial?.visible && (
        <div className="bg-[#2D1C14] text-white p-4 rounded-3xl border border-[#4A3225] shadow-[0_8px_24px_rgba(45,28,20,0.2)] flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <p className="text-xs sm:text-sm font-bold tracking-tight text-[#FAF7F4]">
              {notificacionEspecial.mensaje}
            </p>
          </div>
          <button
            onClick={() => setNotificacionEspecial(null)}
            className="text-white/60 hover:text-white text-xs font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Cabecera del Submódulo Training Tracker */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#EADBCE]/80 shadow-[0_2px_16px_rgba(45,28,20,0.03)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#FAF5F0] border border-[#EADBCE] text-[#2D1C14] flex items-center justify-center text-base font-bold shadow-2xs">
              🏋️‍♂️
            </span>
            <h2 className="text-xl md:text-2xl font-black text-[#2D1C14] tracking-tight">
              Training Tracker Semanal
            </h2>
          </div>
          <p className="text-xs text-[#8D6B57] mt-1 font-medium">
            Plan semanal de alto rendimiento • Hoy es <strong className="text-[#2D1C14]">{diaActualTexto}</strong> ({fechaStr})
          </p>
        </div>

        {/* Resumen de Progreso y Acciones */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          <div className="text-right">
            <span className="text-[10px] font-bold text-[#8D6B57] uppercase tracking-wider block">Progreso Semanal</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-lg font-black text-[#2D1C14]">{totalCompletados}/7</span>
              <span className="text-xs font-bold text-[#8D6B57]">({porcentajeProgreso}%)</span>
            </div>
            <div className="w-28 h-1.5 bg-[#FAF5F0] rounded-full overflow-hidden mt-1 border border-[#EADBCE]/50">
              <div 
                className="h-full bg-[#2D1C14] transition-all duration-500 rounded-full"
                style={{ width: `${porcentajeProgreso}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={reiniciarSemana}
            className="px-3.5 py-2 rounded-2xl border border-[#EADBCE] bg-[#FAF5F0] hover:bg-white text-[#2D1C14] text-xs font-bold transition-all active:scale-95 shadow-2xs flex items-center gap-1.5"
            title="Reiniciar todos los hábitos de la semana a pendientes"
          >
            <span>🔄</span>
            <span className="hidden sm:inline">Reiniciar</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BENTO GRID DE ENTRENAMIENTOS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
        
        {/* TARJETA HÉROE: ACTIVIDAD DEL DÍA ACTUAL (Bento Principal) */}
        {habitoHoy && (
          <div className="col-span-1 md:col-span-2 lg:col-span-2 md:row-span-2 bg-[#2D1C14] text-white p-6 md:p-8 rounded-3xl shadow-[0_12px_36px_rgba(45,28,20,0.15)] border border-[#3E271D] flex flex-col justify-between relative overflow-hidden group">
            
            <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-[#55382B]/30 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-[#E5C8B4] border border-white/15">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    HOY • {habitoHoy.day_of_week}
                  </span>
                  {configHoy && (
                    <span className="hidden sm:inline-block bg-white/5 px-2.5 py-1 rounded-full text-[10px] font-bold text-white/70 border border-white/10">
                      {configHoy.badge}
                    </span>
                  )}
                </div>

                <span className="text-3xl md:text-4xl filter drop-shadow-md">
                  {configHoy?.icono || '🏃‍♂️'}
                </span>
              </div>

              <div className="space-y-2">
                <span className="text-xs uppercase tracking-wider text-[#C89F89] font-bold">
                  Entrenamiento Programado
                </span>
                <h3 className="text-2xl md:text-4xl font-black text-[#FAF7F4] tracking-tight leading-tight">
                  {habitoHoy.activity}
                </h3>
                {configHoy?.descripcion && (
                  <p className="text-xs md:text-sm text-[#E5C8B4]/80 font-medium leading-relaxed max-w-md pt-1">
                    {configHoy.descripcion}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-8 border-t border-white/10 mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <label className="relative flex items-center justify-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={habitoHoy.is_completed}
                    onChange={() => handleCheckboxChange(habitoHoy)}
                    className="peer appearance-none w-8 h-8 rounded-xl border-2 border-[#E5C8B4]/40 bg-white/10 checked:bg-white checked:border-white transition-all cursor-pointer shadow-inner"
                  />
                  <span className="absolute text-[#2D1C14] font-black text-lg pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity">
                    ✓
                  </span>
                </label>
                <div>
                  <span className="text-xs font-bold block text-white">
                    {habitoHoy.is_completed ? '¡Completado con éxito!' : 'Marcar como completado'}
                  </span>
                  <span className="text-[10px] text-[#C89F89] font-medium">
                    {habitoHoy.is_completed ? 'Tu esfuerzo diario suma al récord semanal' : 'Toca el recuadro para registrar tu sesión'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleCheckboxChange(habitoHoy)}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 shadow-xs flex items-center justify-center gap-2 ${
                  habitoHoy.is_completed
                    ? 'bg-white/15 text-white hover:bg-white/20 border border-white/20'
                    : 'bg-white text-[#2D1C14] hover:bg-[#FAF7F4] shadow-md font-black'
                }`}
              >
                <span>{habitoHoy.is_completed ? 'Desmarcar' : 'Completar Hoy'}</span>
                <span>{habitoHoy.is_completed ? '↩' : '⚡'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TARJETAS BENTO PARA LOS OTROS 6 DÍAS */}
        {otrosDias.map((h) => {
          const config = configEntrenamientos[h.day_of_week];
          const esSabadoTirada = h.day_of_week === 'Sábado';

          return (
            <div
              key={h.id}
              className={`p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between group ${
                h.is_completed
                  ? 'bg-[#FAF5F0]/70 border-[#EADBCE]'
                  : 'bg-white border-[#EADBCE]/80 hover:border-[#B39380] hover:shadow-[0_4px_20px_rgba(45,28,20,0.04)]'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">{config?.icono || '🏋️‍♂️'}</span>
                    <span className="text-xs font-extrabold text-[#2D1C14] tracking-tight">
                      {h.day_of_week}
                    </span>
                  </div>

                  {h.is_completed ? (
                    <span className="text-[9px] font-black uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Listo ✓
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-[#8D6B57] bg-[#FAF5F0] px-2 py-0.5 rounded-md border border-[#EADBCE]/60">
                      {config?.badge || 'Sesión'}
                    </span>
                  )}
                </div>

                <h4
                  className={`font-bold text-sm tracking-tight transition-all ${
                    h.is_completed
                      ? 'text-[#8D6B57] line-through opacity-75'
                      : 'text-[#2D1C14]'
                  }`}
                >
                  {h.activity}
                </h4>

                {config?.descripcion && (
                  <p className="text-[11px] text-[#8D6B57] mt-1 line-clamp-2">
                    {config.descripcion}
                  </p>
                )}

                {esSabadoTirada && !h.is_completed && (
                  <p className="text-[10px] text-[#C89F89] font-semibold mt-2 flex items-center gap-1 bg-[#FAF5F0] px-2 py-1 rounded-lg border border-[#EADBCE]/60">
                    <span>🍳</span> Añade &quot;Huevos y Arepa&quot; al completar
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-[#EADBCE]/50 mt-4 flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#8D6B57]">
                  {h.is_completed ? 'Completado' : 'Pendiente'}
                </span>

                <label className="relative flex items-center justify-center cursor-pointer active:scale-90 transition-transform">
                  <input
                    type="checkbox"
                    checked={h.is_completed}
                    onChange={() => handleCheckboxChange(h)}
                    className="peer appearance-none w-6 h-6 rounded-lg border-2 border-[#EADBCE] bg-[#FAF5F0]/60 checked:bg-[#2D1C14] checked:border-[#2D1C14] transition-all cursor-pointer shadow-2xs"
                  />
                  <span className="absolute text-white font-black text-xs pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity">
                    ✓
                  </span>
                </label>
              </div>
            </div>
          );
        })}

      </div>

      {/* Modal con Script SQL para Supabase */}
      {mostrarModalSql && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-[#EADBCE] shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-[#2D1C14] flex items-center gap-2">
                <span>☁️</span> Activar Nube en Supabase
              </h3>
              <button
                type="button"
                onClick={() => setMostrarModalSql(false)}
                className="text-[#8D6B57] hover:text-[#2D1C14] text-xs font-bold"
              >
                ✕ Cerrar
              </button>
            </div>

            <p className="text-xs text-[#6F4A39]">
              Copia este script y pégalo en el <strong>SQL Editor</strong> de tu consola de Supabase para activar la sincronización multi-dispositivo y en tiempo real:
            </p>

            <pre className="p-3 bg-[#FAF5F0] rounded-xl text-[10px] font-mono text-[#2D1C14] overflow-x-auto max-h-48 border border-[#EADBCE]/70">
              {SQL_MIGRACION}
            </pre>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={copiarSql}
                className="w-full py-2.5 bg-[#2D1C14] hover:bg-[#3E271D] text-white rounded-xl text-xs font-bold active:scale-95 transition-all shadow-xs"
              >
                {sqlCopiado ? '✅ ¡Copiado al Portapapeles!' : '📋 Copiar Script SQL'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
