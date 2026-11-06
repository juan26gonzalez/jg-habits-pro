import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getFechaActualColombia } from '@/lib/dateUtils';
import type { WeeklyTrainingHabit, UserSession } from '@/types';

interface TrainingTrackerProps {
  sesion?: UserSession;
}

// Configuración de metadatos por día y tipo de entrenamiento
const configEntrenamientos: Record<string, { icono: string; categoria: string; colorTag: string; descripcion: string }> = {
  'Lunes': {
    icono: '🏋️‍♂️',
    categoria: 'Fuerza Pierna',
    colorTag: 'bg-[#FAF5F0] text-[#4A3225] border-[#EADBCE]',
    descripcion: 'Sentadillas, peso muerto y fuerza de tren inferior'
  },
  'Martes': {
    icono: '🚴‍♂️',
    categoria: 'Ciclismo / Cardio',
    colorTag: 'bg-[#FAF5F0] text-[#4A3225] border-[#EADBCE]',
    descripcion: 'Sesión de potencia y cadencia en Peloton'
  },
  'Miércoles': {
    icono: '🏃‍♂️',
    categoria: 'Velocidad Pista',
    colorTag: 'bg-[#FAF5F0] text-[#4A3225] border-[#EADBCE]',
    descripcion: 'Series de ritmo controlado y técnica de carrera'
  },
  'Jueves': {
    icono: '💪',
    categoria: 'Fuerza Superior',
    colorTag: 'bg-[#FAF5F0] text-[#4A3225] border-[#EADBCE]',
    descripcion: 'Espalda, jalones, dominadas y tren superior'
  },
  'Viernes': {
    icono: '⚡',
    categoria: 'Fartlek Asfalto',
    colorTag: 'bg-[#FAF5F0] text-[#4A3225] border-[#EADBCE]',
    descripcion: 'Juegos de velocidad y cambios de ritmo en calle'
  },
  'Sábado': {
    icono: '🏔️',
    categoria: 'Fondo / Resistencia',
    colorTag: 'bg-[#FAF5F0] text-[#4A3225] border-[#EADBCE]',
    descripcion: 'Tirada larga de 12 km a ritmo aeróbico constante'
  },
  'Domingo': {
    icono: '🧘‍♂️',
    categoria: 'Recuperación',
    colorTag: 'bg-[#FAF5F0] text-[#4A3225] border-[#EADBCE]',
    descripcion: 'Caminata suave, estiramientos y movilidad articular'
  }
};

const diasSemanaOrden = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const datosInicialesSemana = [
  { day_of_week: 'Lunes', activity: 'Gym Tren Inferior' },
  { day_of_week: 'Martes', activity: 'Upper Body Peloton' },
  { day_of_week: 'Miércoles', activity: 'Pista Trote' },
  { day_of_week: 'Jueves', activity: 'Gym Espalda' },
  { day_of_week: 'Viernes', activity: 'Fartlek Calle' },
  { day_of_week: 'Sábado', activity: 'Tirada Larga 12km' },
  { day_of_week: 'Domingo', activity: 'Descanso Activo' }
];

export default function TrainingTracker({ sesion: sesionProp }: TrainingTrackerProps) {
  const [sesion, setSesion] = useState<UserSession>(sesionProp || null);
  const [habits, setHabits] = useState<WeeklyTrainingHabit[]>([]);
  const [cargando, setCargando] = useState(true);
  const [notificacionEspecial, setNotificacionEspecial] = useState<{ visible: boolean; mensaje: string } | null>(null);

  // Obtener el día actual en Colombia
  const mapDiaSemanaTexto = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const { diaSemana: diaSemanaIndex, fechaStr } = getFechaActualColombia();
  const diaActualTexto = mapDiaSemanaTexto[diaSemanaIndex] || 'Lunes';

  // Verificar o recuperar sesión si no vino por props
  useEffect(() => {
    if (sesionProp) {
      setSesion(sesionProp);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session);
    });
  }, [sesionProp]);

  // Cargar hábitos de la base de datos
  const cargarHabitos = useCallback(async () => {
    if (!sesion?.user?.id) return;
    setCargando(true);

    const { data, error } = await supabase
      .from('weekly_training_habits')
      .select('*')
      .eq('user_id', sesion.user.id);

    if (error) {
      console.error('Error al cargar weekly_training_habits:', error.message);
      setCargando(false);
      return;
    }

    // Si el usuario aún no tiene los hábitos insertados, los creamos automáticamente
    if (!data || data.length === 0) {
      const inserts = datosInicialesSemana.map(item => ({
        user_id: sesion.user.id,
        day_of_week: item.day_of_week,
        activity: item.activity,
        is_completed: false
      }));

      const { data: dataInsertada, error: errInsert } = await supabase
        .from('weekly_training_habits')
        .insert(inserts)
        .select();

      if (!errInsert && dataInsertada) {
        setHabits(dataInsertada as WeeklyTrainingHabit[]);
      }
    } else {
      setHabits(data as WeeklyTrainingHabit[]);
    }

    setCargando(false);
  }, [sesion?.user?.id]);

  useEffect(() => {
    if (sesion?.user?.id) {
      cargarHabitos();
    }
  }, [sesion?.user?.id, cargarHabitos]);

  // Suscripción en Realtime de Supabase
  useEffect(() => {
    if (!sesion?.user?.id) return;

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
            setHabits(prev => prev.map(h => (h.id === updated.id ? updated : h)));
          } else if (payload.eventType === 'INSERT') {
            const inserted = payload.new as WeeklyTrainingHabit;
            setHabits(prev => {
              if (prev.some(h => h.id === inserted.id)) return prev;
              return [...prev, inserted];
            });
          } else if (payload.eventType === 'DELETE') {
            setHabits(prev => prev.filter(h => h.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [sesion?.user?.id]);

  // Función para añadir "Huevos y Arepa" al supermercado (Grocery)
  const dispararAgregarHuevosYArepa = async () => {
    if (!sesion?.user?.id) return;

    try {
      const nombreItem = 'Huevos y Arepa';
      // Verificamos si ya está en la compra actual
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

  // Manejador del cambio de checkbox (con actualización optimista y realtime)
  const handleCheckboxChange = async (habit: WeeklyTrainingHabit) => {
    const nuevoEstado = !habit.is_completed;

    // 1. Actualización optimista inmediata en la UI (0ms de retraso)
    setHabits(prev => prev.map(h => (h.id === habit.id ? { ...h, is_completed: nuevoEstado } : h)));

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

    // 2. Persistencia en Supabase
    const { error } = await supabase
      .from('weekly_training_habits')
      .update({ is_completed: nuevoEstado, updated_at: new Date().toISOString() })
      .eq('id', habit.id);

    if (error) {
      // Revertir estado si ocurre error
      setHabits(prev => prev.map(h => (h.id === habit.id ? { ...h, is_completed: !nuevoEstado } : h)));
      alert(`Error al actualizar hábito de entrenamiento: ${error.message}`);
    }
  };

  // Reiniciar la semana (todos los hábitos a pendiente)
  const reiniciarSemana = async () => {
    if (!sesion?.user?.id) return;
    const confirmar = confirm("¿Deseas reiniciar los entrenamientos de la semana a pendientes?");
    if (!confirmar) return;

    // Actualización optimista
    setHabits(prev => prev.map(h => ({ ...h, is_completed: false })));

    await supabase
      .from('weekly_training_habits')
      .update({ is_completed: false, updated_at: new Date().toISOString() })
      .eq('user_id', sesion.user.id);
  };

  // Ordenar los hábitos por orden natural de la semana (Lunes a Domingo)
  const habitosOrdenados = [...habits].sort(
    (a, b) => diasSemanaOrden.indexOf(a.day_of_week) - diasSemanaOrden.indexOf(b.day_of_week)
  );

  // Encontrar el hábito del día de hoy (Tarjeta Héroe)
  const habitoHoy = habitosOrdenados.find(h => h.day_of_week === diaActualTexto) || habitosOrdenados[0];
  // Los otros 6 días
  const otrosDias = habitosOrdenados.filter(h => h.day_of_week !== diaActualTexto);

  // Métricas generales
  const totalCompletados = habits.filter(h => h.is_completed).length;
  const porcentajeProgreso = habits.length > 0 ? Math.round((totalCompletados / habits.length) * 100) : 0;
  const configHoy = habitoHoy ? configEntrenamientos[habitoHoy.day_of_week] : null;

  if (cargando && habits.length === 0) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-[#EADBCE]/80 shadow-[0_2px_16px_rgba(45,28,20,0.03)] animate-pulse flex flex-col items-center justify-center min-h-[300px]">
        <span className="text-3xl mb-2">🏋️‍♂️</span>
        <p className="text-sm font-bold text-[#8D6B57]">Cargando Training Tracker...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      
      {/* Notificación Especial (Post-Entreno) */}
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
            title="Reiniciar todos los hábitos de la semana"
          >
            <span>🔄</span>
            <span className="hidden sm:inline">Reiniciar</span>
          </button>
        </div>
      </div>

      {/* BENTO GRID DE ENTRENAMIENTOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
        
        {/* ================================================================= */}
        {/* TARJETA HÉROE: ACTIVIDAD DEL DÍA ACTUAL (Bento Grid Principal) */}
        {/* ================================================================= */}
        {habitoHoy && (
          <div className="col-span-1 md:col-span-2 lg:col-span-2 md:row-span-2 bg-[#2D1C14] text-white p-6 md:p-8 rounded-3xl shadow-[0_12px_36px_rgba(45,28,20,0.15)] border border-[#3E271D] flex flex-col justify-between relative overflow-hidden group">
            
            {/* Resplandor decorativo sutil en estilo Liquid Glass */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-[#55382B]/30 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div>
              {/* Badge Dinámico de Hoy */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-[#E5C8B4] border border-white/15">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    HOY • {habitoHoy.day_of_week}
                  </span>
                  {configHoy && (
                    <span className="hidden sm:inline-block bg-white/5 px-2.5 py-1 rounded-full text-[10px] font-bold text-white/70 border border-white/10">
                      {configHoy.categoria}
                    </span>
                  )}
                </div>

                <span className="text-3xl md:text-4xl filter drop-shadow-md">
                  {configHoy?.icono || '🏃‍♂️'}
                </span>
              </div>

              {/* Título de la Actividad de Hoy */}
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

            {/* Checkbox / Botón de Acción Principal para Hoy */}
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

        {/* ================================================================= */}
        {/* TARJETAS BENTO PARA LOS OTROS DÍAS DE LA SEMANA */}
        {/* ================================================================= */}
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
                {/* Cabecera del día */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">{config?.icono || '🏋️‍♂️'}</span>
                    <span className="text-xs font-extrabold text-[#2D1C14] tracking-tight">
                      {h.day_of_week}
                    </span>
                  </div>

                  {/* Badge de completado o categoría */}
                  {h.is_completed ? (
                    <span className="text-[9px] font-black uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Listo ✓
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-[#8D6B57] bg-[#FAF5F0] px-2 py-0.5 rounded-md border border-[#EADBCE]/60">
                      {config?.categoria || 'Entreno'}
                    </span>
                  )}
                </div>

                {/* Actividad */}
                <h4
                  className={`font-bold text-sm tracking-tight transition-all ${
                    h.is_completed
                      ? 'text-[#8D6B57] line-through opacity-75'
                      : 'text-[#2D1C14]'
                  }`}
                >
                  {h.activity}
                </h4>

                {/* Detalle especial para Sábado */}
                {esSabadoTirada && !h.is_completed && (
                  <p className="text-[10px] text-[#C89F89] font-semibold mt-1 flex items-center gap-1">
                    <span>🍳</span> Añade &quot;Huevos y Arepa&quot; al completar
                  </p>
                )}
              </div>

              {/* Checkbox y acción de toggle */}
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

    </div>
  );
}
