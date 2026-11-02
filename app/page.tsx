"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ktxbonxgrnpzearsgvtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0eGJvbnhncm5wemVhcnNndnRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyOTI4MDQsImV4cCI6MjEwODg2ODgwNH0.R_lmgkFXALpkmmqbz4rz5XvzqE6VdakUharpVsv-reY';
const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// COMPONENTE: TARJETA DE FINANZAS
// ==========================================
function TarjetaFinanzas({ gasto, sesion, strHoy }: any) {
  const [aportes, setAportes] = useState<any[]>([]);
  const [nombreIntegrante, setNombreIntegrante] = useState('');
  const [montoAporte, setMontoAporte] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nuevoMonto, setNuevoMonto] = useState('');

  const montoTotal = Number(gasto.monto_total) || 0;

  useEffect(() => {
    async function cargarAportes() {
      const { data } = await supabase.from('finanzas_cuotas_familia').select('*').eq('gasto_id', gasto.id);
      if (data) setAportes(data);
    }
    cargarAportes();
  }, [gasto.id]);

  const totalAportado = aportes.reduce((suma, ap) => suma + Number(ap.monto_cuota || 0), 0);
  const restante = montoTotal - totalAportado;
  const porcentaje = montoTotal > 0 ? Math.min(100, (totalAportado / montoTotal) * 100) : 0;

  // NUEVO: CÁLCULO DE ALERTA DE VENCIMIENTO
  let diasParaVencer = null;
  let esUrgente = false;
  let estaVencido = false;
  
  if (gasto.fecha_vencimiento && strHoy) {
    // Usamos T12:00:00 para evitar saltos de zona horaria al comparar
    const fVenc = new Date(`${gasto.fecha_vencimiento}T12:00:00`);
    const fHoy = new Date(`${strHoy}T12:00:00`);
    const diffTime = fVenc.getTime() - fHoy.getTime();
    diasParaVencer = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    esUrgente = diasParaVencer >= 0 && diasParaVencer <= 3;
    estaVencido = diasParaVencer < 0;
  }

  // Estilos dinámicos del borde según el estado
  const bordeEstado = porcentaje >= 100 
    ? 'border-green-300 ring-2 ring-green-50 shadow-green-100' 
    : (estaVencido ? 'border-red-400 ring-2 ring-red-50 shadow-red-100' : (esUrgente ? 'border-amber-400 ring-2 ring-amber-50 shadow-amber-100' : 'border-gray-100'));

  async function agregarAporte(e: any) {
    e.preventDefault();
    if (!nombreIntegrante || !montoAporte) return;
    const { data, error } = await supabase.from('finanzas_cuotas_familia').insert([{ gasto_id: gasto.id, integrante: nombreIntegrante, monto_cuota: Number(montoAporte), user_id: sesion.user.id, pagado: true }]).select();
    if (error) alert(`Error: ${error.message}`);
    else if (data) { setAportes([...aportes, data[0]]); setNombreIntegrante(''); setMontoAporte(''); }
  }

  async function guardarEdicion(aporteId: string) {
    if (!nuevoMonto) return;
    const { error } = await supabase.from('finanzas_cuotas_familia').update({ monto_cuota: Number(nuevoMonto) }).eq('id', aporteId);
    if (!error) { setAportes(aportes.map(ap => ap.id === aporteId ? { ...ap, monto_cuota: Number(nuevoMonto) } : ap)); setEditandoId(null); setNuevoMonto(''); }
  }

  return (
    <div className={`rounded-3xl p-6 md:p-8 bg-white hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-lg ${bordeEstado}`}>
      <div>
        <div className="flex justify-between items-start mb-4 gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl truncate">{gasto.categoria || 'General'}</span>
          
          {/* NUEVO: ETIQUETA DE VENCIMIENTO DINÁMICA */}
          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl whitespace-nowrap ${porcentaje >= 100 ? 'bg-green-100 text-green-700' : (estaVencido ? 'bg-red-100 text-red-700 animate-pulse' : (esUrgente ? 'bg-amber-100 text-amber-700' : 'bg-gray-50 text-gray-500 border border-gray-100'))}`}>
            {porcentaje >= 100 ? 'Pagado ✔️' : (
              gasto.fecha_vencimiento 
                ? (estaVencido ? `Vencido (${Math.abs(diasParaVencer!)}d)` : (esUrgente ? `¡Vence en ${diasParaVencer}d!` : `Vence: ${gasto.fecha_vencimiento}`)) 
                : 'Sin fecha'
            )}
          </span>
        </div>
        
        <h3 className="text-xl md:text-2xl font-bold text-gray-800">{gasto.concepto}</h3>
        <p className="text-3xl md:text-4xl font-black text-slate-900 mt-1 tracking-tight">${montoTotal.toLocaleString('es-CO')}</p>
        
        <div className="mt-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="flex justify-between text-sm font-semibold mb-2">
            <span className="text-gray-500">Recaudado: <span className="text-gray-800">${totalAportado.toLocaleString('es-CO')}</span></span>
            <span className={porcentaje >= 100 ? "text-green-600 font-black" : "text-blue-600 font-black"}>{porcentaje.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
            <div className={`h-3 rounded-full transition-all duration-1000 ease-out ${porcentaje >= 100 ? 'bg-gradient-to-r from-green-400 to-green-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`} style={{ width: `${porcentaje}%` }}></div>
          </div>
          <p className="text-sm font-bold text-amber-600">{restante > 0 ? `Faltan: $${restante.toLocaleString('es-CO')}` : '¡Gasto cubierto al 100%!'}</p>
        </div>

        {aportes.length > 0 && (
          <div className="mt-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Aportes registrados</h4>
            <ul className="space-y-3">
              {aportes.map((ap) => (
                <li key={ap.id} className="flex justify-between text-sm items-center">
                  <span className="font-semibold text-slate-700 flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-black">{ap.integrante.charAt(0)}</div>{ap.integrante}</span>
                  {editandoId === ap.id ? (
                    <div className="flex gap-2 items-center">
                      <input type="number" value={nuevoMonto} onChange={(e) => setNuevoMonto(e.target.value)} className="w-24 p-1.5 text-sm border border-blue-400 rounded-lg bg-white" autoFocus />
                      <button onClick={() => guardarEdicion(ap.id)} className="text-green-600 bg-green-50 p-1.5 rounded-lg active:scale-95">✔️</button>
                      <button onClick={() => setEditandoId(null)} className="text-red-500 bg-red-50 p-1.5 rounded-lg active:scale-95">✖️</button>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <span className="text-slate-800 font-black">${Number(ap.monto_cuota).toLocaleString('es-CO')}</span>
                      <button onClick={() => { setEditandoId(ap.id); setNuevoMonto(ap.monto_cuota); }} className="text-gray-300 hover:text-blue-600 transition-colors active:scale-95">✏️</button>
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
          <input type="text" placeholder="Integrante" value={nombreIntegrante} onChange={(e) => setNombreIntegrante(e.target.value)} className="w-1/2 p-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none" required />
          <input type="number" placeholder="Monto" value={montoAporte} onChange={(e) => setMontoAporte(e.target.value)} className="w-1/2 p-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none" required />
          <button type="submit" className="bg-slate-900 text-white font-black p-3 rounded-xl hover:bg-slate-800 active:scale-95 transition-all flex justify-center items-center shadow-md">➕</button>
        </form>
      )}
    </div>
  );
}

// ==========================================
// APLICACIÓN PRINCIPAL (JG HÁBITS PRO)
// ==========================================
export default function Home() {
  const [sesion, setSesion] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargandoGlobal, setCargandoGlobal] = useState(true);
  const [errorLogin, setErrorLogin] = useState('');
  
  const [pestañaActiva, setPestañaActiva] = useState('calendario'); 

  const [mesActual, setMesActual] = useState(0);
  const [anioActual, setAnioActual] = useState(2026);
  const [strHoy, setStrHoy] = useState('');

  const [gastos, setGastos] = useState<any[]>([]);
  const [concepto, setConcepto] = useState('');
  const [categoria, setCategoria] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState('');

  const [habitosCatalogo, setHabitosCatalogo] = useState<any[]>([]);
  const [registrosHistoricos, setRegistrosHistoricos] = useState<any[]>([]);
  const [nuevoHabitoNombre, setNuevoHabitoNombre] = useState('');
  const [nuevoHabitoEmoji, setNuevoHabitoEmoji] = useState('🏃‍♂️');
  const [nuevoHabitoHora, setNuevoHabitoHora] = useState(''); 
  const [nuevoHabitoBloque, setNuevoHabitoBloque] = useState('Mañana');
  const diasSemanaOpciones = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
  const [nuevoHabitoDias, setNuevoHabitoDias] = useState<string[]>(diasSemanaOpciones);
  const emojisComunes = ['🏃‍♂️', '💧', '📚', '🏋️‍♂️', '🍎', '🍳', '💤', '💻', '🧘‍♂️', '🧹', '📖', '🚴‍♂️', '💊', '💰', '🚿', '🚗'];

  const [mercadoCatalogo, setMercadoCatalogo] = useState<any[]>([]);
  const [mercadoLista, setMercadoLista] = useState<any[]>([]);
  const [presupuestoMercado, setPresupuestoMercado] = useState(0); 
  const [catNombre, setCatNombre] = useState('');
  const [catPrecio, setCatPrecio] = useState('');
  const [catUnidad, setCatUnidad] = useState('und');
  const [catCat, setCatCat] = useState('Abarrotes');

  const [filtroHabitos, setFiltroHabitos] = useState(true);
  const [filtroFinanzas, setFiltroFinanzas] = useState(true);
  const [filtroMercado, setFiltroMercado] = useState(true);

  async function cargarDatosGenerales() {
    setCargandoGlobal(true);
    const fechaHoy = new Date();
    const hoyFechaStr = fechaHoy.toISOString().split('T')[0];
    
    setMesActual(fechaHoy.getMonth());
    setAnioActual(fechaHoy.getFullYear());
    setStrHoy(hoyFechaStr);
    
    const { data: dataGastos } = await supabase.from('finanzas_gastos').select('*');
    if (dataGastos) setGastos(dataGastos);

    const { data: dataHabitos } = await supabase.from('habitos_catalogo').select('*').order('hora', { ascending: true });
    if (dataHabitos) setHabitosCatalogo(dataHabitos);
    const { data: dataRegistros } = await supabase.from('habitos_registros').select('*');
    if (dataRegistros) setRegistrosHistoricos(dataRegistros);

    const { data: dataMercadoCat } = await supabase.from('mercado_catalogo').select('*').order('nombre', { ascending: true });
    if (dataMercadoCat) setMercadoCatalogo(dataMercadoCat);
    const { data: dataMercadoList } = await supabase.from('mercado_lista').select('*').order('creado_en', { ascending: true });
    if (dataMercadoList) setMercadoLista(dataMercadoList);

    setCargandoGlobal(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSesion(session);
      if (session) cargarDatosGenerales();
      else setCargandoGlobal(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesion(session);
      if (session) cargarDatosGenerales();
    });
    return () => subscription.unsubscribe();
  }, []);

  async function iniciarSesion(e: any) {
    e.preventDefault();
    setErrorLogin('Cargando...');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErrorLogin(`Error: ${error.message}`);
    else setErrorLogin('');
  }

  async function agregarGasto(e: any) {
    e.preventDefault();
    if (!concepto || !monto) return;
    const { error } = await supabase.from('finanzas_gastos').insert([{ concepto, categoria: categoria || 'General', monto_total: Number(monto), fecha_vencimiento: fecha || null, user_id: sesion.user.id }]);
    if (error) alert(`Error al guardar: ${error.message}`);
    else { setConcepto(''); setCategoria(''); setMonto(''); setFecha(''); cargarDatosGenerales(); }
  }

  function toggleDia(dia: string) {
    if (nuevoHabitoDias.includes(dia)) setNuevoHabitoDias(nuevoHabitoDias.filter(d => d !== dia));
    else setNuevoHabitoDias([...nuevoHabitoDias, dia]);
  }

  async function agregarHabito(e: any) {
    e.preventDefault();
    if (!nuevoHabitoNombre || !nuevoHabitoEmoji || !nuevoHabitoHora) return;
    if (nuevoHabitoDias.length === 0) return alert("Debes seleccionar al menos un día para este hábito.");
    
    const { error } = await supabase.from('habitos_catalogo').insert([{ nombre: nuevoHabitoNombre, emoji: nuevoHabitoEmoji, hora: nuevoHabitoHora, bloque: nuevoHabitoBloque, frecuencia: nuevoHabitoDias.join(', '), user_id: sesion.user.id }]);
    
    if (error) alert(`Error al guardar hábito: ${error.message}`);
    else { setNuevoHabitoNombre(''); setNuevoHabitoHora(''); setNuevoHabitoDias(diasSemanaOpciones); cargarDatosGenerales(); }
  }

  async function marcarHabito(habitoId: string) {
    const registroExistente = registrosHistoricos.find(r => r.habito_id === habitoId && r.fecha === strHoy);
    if (registroExistente) {
      const { error } = await supabase.from('habitos_registros').delete().eq('id', registroExistente.id);
      if (!error) setRegistrosHistoricos(registrosHistoricos.filter(r => r.id !== registroExistente.id));
    } else {
      const { data, error } = await supabase.from('habitos_registros').insert([{ habito_id: habitoId, fecha: strHoy, completado: true, user_id: sesion.user.id }]).select();
      if (!error && data) setRegistrosHistoricos([...registrosHistoricos, data[0]]);
    }
  }

  function calcularEstadisticasHabito(habitoId: string) {
    const ultimos7Dias = Array.from({length: 7}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    });

    const historial7Dias = ultimos7Dias.reverse().map(fechaStr => 
      registrosHistoricos.some(r => r.habito_id === habitoId && r.fecha === fechaStr)
    );

    let rachaActual = 0;
    const fechasConRegistro = registrosHistoricos.filter(r => r.habito_id === habitoId).map(r => r.fecha).sort().reverse();
    
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

    return { rachaActual, historial7Dias };
  }

  async function crearProductoCatalogo(e: any) {
    e.preventDefault();
    if (!catNombre || !catPrecio) return;
    const { error } = await supabase.from('mercado_catalogo').insert([{ nombre: catNombre, categoria: catCat, precio_referencia: Number(catPrecio), unidad: catUnidad, user_id: sesion.user.id }]);
    if (error) alert(`Error: ${error.message}`);
    else { setCatNombre(''); setCatPrecio(''); cargarDatosGenerales(); }
  }

  async function agregarAlCarrito(producto: any) {
    if (mercadoLista.some(item => item.producto_nombre === producto.nombre)) return alert("Este producto ya está en tu lista actual.");
    const { data, error } = await supabase.from('mercado_lista').insert([{ producto_nombre: producto.nombre, categoria: producto.categoria, cantidad: 1, precio_unitario: producto.precio_referencia, descuento_porcentaje: 0, comprado: false, user_id: sesion.user.id }]).select();
    if (!error && data) setMercadoLista([...mercadoLista, data[0]]);
  }

  async function actualizarItemLista(id: string, campo: string, valor: any) {
    setMercadoLista(mercadoLista.map(item => item.id === id ? { ...item, [campo]: valor } : item));
    await supabase.from('mercado_lista').update({ [campo]: valor }).eq('id', id);
  }

  async function eliminarDeLista(id: string) {
    setMercadoLista(mercadoLista.filter(item => item.id !== id));
    await supabase.from('mercado_lista').delete().eq('id', id);
  }

  const totalProyectado = mercadoLista.reduce((suma, item) => suma + ((item.cantidad * item.precio_unitario) - ((item.cantidad * item.precio_unitario) * ((item.descuento_porcentaje || 0) / 100))), 0);
  const totalCarrito = mercadoLista.filter(i => i.comprado).reduce((suma, item) => suma + ((item.cantidad * item.precio_unitario) - ((item.cantidad * item.precio_unitario) * ((item.descuento_porcentaje || 0) / 100))), 0);
  const pendientes = totalProyectado - totalCarrito;

  if (!sesion && !cargandoGlobal) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
        <form onSubmit={iniciarSesion} className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-gray-100 w-full max-w-md transition-all">
          <div className="w-16 h-16 bg-gradient-to-br from-slate-900 to-slate-700 text-white rounded-2xl flex items-center justify-center text-3xl shadow-lg mb-6 mx-auto">⚙️</div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2 text-center tracking-tight">JG Hábits Pro</h2>
          <p className="text-sm text-gray-500 mb-8 text-center">Tu sistema operativo personal</p>
          {errorLogin && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium text-center">{errorLogin}</div>}
          <input type="email" placeholder="Correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 border border-gray-200 rounded-2xl mb-4 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white transition-all" required />
          <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 border border-gray-200 rounded-2xl mb-6 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white transition-all" required />
          <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 active:scale-95 transition-all shadow-md">Acceder al Sistema</button>
        </form>
      </main>
    );
  }

  if (cargandoGlobal) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 md:p-12 animate-pulse">
        <div className="max-w-6xl mx-auto mb-8 flex justify-between items-center">
          <div className="h-10 bg-gray-200 rounded-xl w-48"></div>
          <div className="h-6 bg-gray-200 rounded-xl w-24"></div>
        </div>
        <div className="max-w-6xl mx-auto flex gap-4 mb-8">
          <div className="h-10 bg-gray-200 rounded-xl w-32"></div>
          <div className="h-10 bg-gray-200 rounded-xl w-32"></div>
          <div className="h-10 bg-gray-200 rounded-xl w-32"></div>
        </div>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="h-64 bg-white border border-gray-100 rounded-3xl w-full"></div>
          <div className="h-64 bg-white border border-gray-100 rounded-3xl w-full"></div>
          <div className="h-64 bg-white border border-gray-100 rounded-3xl w-full"></div>
        </div>
      </main>
    );
  }

  const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
  const primerDiaSemana = new Date(anioActual, mesActual, 1).getDay();
  const celdasCalendario = [];
  const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const mapFrecuenciaDias = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

  for (let i = 0; i < primerDiaSemana; i++) celdasCalendario.push(<div key={`empty-${i}`} className="p-2 border border-transparent"></div>);

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
    const habitosProgramadosHoy = habitosCatalogo.filter(h => h.frecuencia && h.frecuencia.includes(strDiaCorto));
    const porcentajeProgreso = habitosProgramadosHoy.length > 0 ? Math.min(100, (habitosDelDia.length / habitosProgramadosHoy.length) * 100) : 0;

    celdasCalendario.push(
      <div key={d} className={`p-2 md:p-3 min-h-[100px] border border-gray-200 rounded-2xl shadow-sm transition-all flex flex-col ${esHoy ? 'bg-blue-50/50 border-blue-400 ring-2 ring-blue-200' : 'bg-white hover:border-blue-300 hover:shadow-md'}`}>
        <div className="flex justify-between items-center mb-2">
          <span className={`font-black text-sm ${esHoy ? 'text-blue-700 bg-blue-200 px-2.5 py-1 rounded-full' : 'text-slate-400'}`}>{d}</span>
          {filtroHabitos && habitosProgramadosHoy.length > 0 && (
            <div className="w-10 md:w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden" title={`${habitosDelDia.length} de ${habitosProgramadosHoy.length} hábitos`}>
              <div className={`h-full transition-all duration-500 ${porcentajeProgreso >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${porcentajeProgreso}%` }}></div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5 flex-grow">
          {filtroFinanzas && gastosDelDia.map((g, i) => <span key={`g-${i}`} className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 truncate shadow-sm">💳 {g.concepto}</span>)}
          {filtroMercado && comprasDelDia.length > 0 && <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 truncate shadow-sm">🛒 Súper ({comprasDelDia.length})</span>}
          {filtroHabitos && habitosDelDia.map((h, i) => {
            const habitoInfo = habitosCatalogo.find(hc => hc.id === h.habito_id);
            if (!habitoInfo) return null;
            return <span key={`h-${i}`} className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 truncate shadow-sm">{habitoInfo.emoji} {habitoInfo.nombre}</span>;
          })}
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'calendario', icon: '📅', label: 'Dashboard' },
    { id: 'habitos', icon: '🗓️', label: 'Habits' },
    { id: 'finanzas', icon: '💰', label: 'Finances' },
    { id: 'supermercado', icon: '🛒', label: 'Grocery' }
  ];

  // NUEVO: CÁLCULOS PARA EL DASHBOARD FINANCIERO
  const categoriasGastos = gastos.reduce((acc, g) => {
    const cat = g.categoria || 'General';
    acc[cat] = (acc[cat] || 0) + Number(g.monto_total);
    return acc;
  }, {} as Record<string, number>);
  const totalGastosMes = gastos.reduce((sum, g) => sum + Number(g.monto_total), 0);
  const coloresCategorias = ['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-rose-500', 'bg-orange-500', 'bg-emerald-500', 'bg-sky-500'];

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-24 md:pb-12 p-4 md:p-8">
      
      <div className="max-w-6xl mx-auto mb-6 md:mb-8 pt-4 md:pt-0">
        <div className="flex justify-between items-center bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center text-lg shadow-md">⚙️</div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">JG Hábits Pro</h1>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="text-sm font-bold text-gray-400 hover:text-red-500 transition-colors bg-gray-50 px-4 py-2 rounded-xl active:scale-95">Log Out</button>
        </div>
        
        <div className="hidden md:flex gap-2 mt-6 overflow-x-auto scrollbar-hide bg-white p-2 rounded-2xl shadow-sm border border-gray-100 w-max">
          {navItems.map(item => (
            <button 
              key={item.id}
              onClick={() => setPestañaActiva(item.id)} 
              className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2 active:scale-95 ${pestañaActiva === item.id ? 'bg-slate-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-slate-800'}`}
            >
              <span className="text-lg">{item.icon}</span> {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================== */}
      {/* 1. VISTA: CALENDARIO MAESTRO               */}
      {/* ========================================== */}
      {pestañaActiva === 'calendario' && (
        <div className="max-w-6xl mx-auto animate-fade-in">
          <div className="flex flex-wrap gap-2 md:gap-3 mb-4 bg-white p-2.5 rounded-2xl border border-gray-100 w-max shadow-sm">
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center px-2 mr-1">Filtros:</span>
            <button onClick={() => setFiltroHabitos(!filtroHabitos)} className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all active:scale-95 ${filtroHabitos ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-50 text-gray-400 opacity-60 border border-gray-200'}`}>🗓️ Hábitos</button>
            <button onClick={() => setFiltroFinanzas(!filtroFinanzas)} className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all active:scale-95 ${filtroFinanzas ? 'bg-red-100 text-red-700' : 'bg-gray-50 text-gray-400 opacity-60 border border-gray-200'}`}>💰 Gastos</button>
            <button onClick={() => setFiltroMercado(!filtroMercado)} className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all active:scale-95 ${filtroMercado ? 'bg-green-100 text-green-700' : 'bg-gray-50 text-gray-400 opacity-60 border border-gray-200'}`}>🛒 Súper</button>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                {nombresMeses[mesActual]} <span className="text-blue-600">{anioActual}</span>
              </h2>
              <div className="flex gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-200">
                <button onClick={() => { if(mesActual === 0) {setMesActual(11); setAnioActual(a => a-1);} else setMesActual(m => m-1); }} className="px-4 py-2 bg-white rounded-xl hover:shadow-sm font-bold text-slate-700 active:scale-95 transition-all">◀</button>
                <button onClick={() => { setMesActual(new Date().getMonth()); setAnioActual(new Date().getFullYear()); }} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-md active:scale-95 transition-all">Hoy</button>
                <button onClick={() => { if(mesActual === 11) {setMesActual(0); setAnioActual(a => a+1);} else setMesActual(m => m+1); }} className="px-4 py-2 bg-white rounded-xl hover:shadow-sm font-bold text-slate-700 active:scale-95 transition-all">▶</button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2 mb-3">
              {diasSemana.map(dia => <div key={dia} className="text-center font-black text-slate-300 text-xs md:text-sm uppercase tracking-widest">{dia}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2">{celdasCalendario}</div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 2. VISTA: HÁBITOS                          */}
      {/* ========================================== */}
      {pestañaActiva === 'habitos' && (
        <div className="max-w-5xl mx-auto animate-fade-in">
          <form onSubmit={agregarHabito} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 mb-8">
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">✨ Programar Nuevo Hábito</h3>
            
            <div className="mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-200">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">1. Selecciona un ícono:</p>
              <div className="flex flex-wrap gap-2">
                {emojisComunes.map(emoji => (
                  <button key={emoji} type="button" onClick={() => setNuevoHabitoEmoji(emoji)} className={`text-2xl w-12 h-12 rounded-xl transition-all border-2 flex items-center justify-center active:scale-95 ${nuevoHabitoEmoji === emoji ? 'bg-white border-blue-500 shadow-md scale-110' : 'bg-transparent border-transparent hover:bg-gray-200'}`}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <input type="text" placeholder="Emoji" value={nuevoHabitoEmoji} onChange={(e) => setNuevoHabitoEmoji(e.target.value)} className="p-4 border border-gray-200 rounded-xl text-slate-900 text-2xl text-center bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500" required />
              <input type="text" placeholder="Nombre de la actividad..." value={nuevoHabitoNombre} onChange={(e) => setNuevoHabitoNombre(e.target.value)} className="p-4 border border-gray-200 rounded-xl text-slate-900 font-medium md:col-span-1 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500" required />
              <input type="time" value={nuevoHabitoHora} onChange={(e) => setNuevoHabitoHora(e.target.value)} className="p-4 border border-gray-200 rounded-xl text-slate-900 font-bold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500" required />
              <select value={nuevoHabitoBloque} onChange={(e) => setNuevoHabitoBloque(e.target.value)} className="p-4 border border-gray-200 rounded-xl text-slate-900 font-bold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                <option value="Mañana">🌅 Mañana</option>
                <option value="Tarde">☀️ Tarde</option>
                <option value="Noche">🌙 Noche</option>
              </select>
            </div>

            <div className="mb-8">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">2. Selecciona los días a realizar:</p>
              <div className="flex flex-wrap gap-2 md:gap-3">
                {diasSemanaOpciones.map(dia => (
                  <button key={dia} type="button" onClick={() => toggleDia(dia)} className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl font-black text-sm shadow-sm transition-all border-2 flex items-center justify-center active:scale-95 ${nuevoHabitoDias.includes(dia) ? 'bg-slate-900 text-white border-slate-900 scale-105' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300 hover:text-slate-700'}`}>
                    {dia}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="bg-blue-600 text-white font-black py-4 px-6 rounded-2xl hover:bg-blue-700 active:scale-95 transition-all w-full shadow-lg shadow-blue-600/30 text-lg">Guardar Hábito Programado</button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['Mañana', 'Tarde', 'Noche'].map((bloque) => {
              const habitosBloque = habitosCatalogo.filter(h => h.bloque === bloque);
              const config = {
                'Mañana': { icon: '🌅', color: 'text-amber-500', bgTag: 'bg-amber-100', textTag: 'text-amber-800' },
                'Tarde': { icon: '☀️', color: 'text-blue-500', bgTag: 'bg-blue-100', textTag: 'text-blue-800' },
                'Noche': { icon: '🌙', color: 'text-indigo-500', bgTag: 'bg-indigo-100', textTag: 'text-indigo-800' }
              }[bloque];

              return (
                <div key={bloque} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <h4 className={`text-lg font-black ${config?.color} mb-5 flex items-center gap-2`}><span className="text-2xl">{config?.icon}</span> {bloque}</h4>
                  <ul className="space-y-4">
                    {habitosBloque.length === 0 && <p className="text-sm font-medium text-gray-400 p-4 border-2 border-dashed border-gray-100 rounded-xl text-center">Sin hábitos programados</p>}
                    {habitosBloque.map(habito => {
                      const completadoHoy = registrosHistoricos.some(r => r.habito_id === habito.id && r.fecha === strHoy);
                      const { rachaActual, historial7Dias } = calcularEstadisticasHabito(habito.id);
                      
                      return (
                        <li key={habito.id} className={`flex flex-col p-4 rounded-2xl transition-all border-2 ${completadoHoy ? 'bg-green-50/50 border-green-200' : 'bg-white border-gray-100 hover:border-blue-300 hover:shadow-md'}`}>
                          
                          <div className="flex items-center gap-4 cursor-pointer active:scale-95" onClick={() => marcarHabito(habito.id)}>
                            <span className="text-3xl bg-gray-50 w-12 h-12 flex items-center justify-center rounded-xl shrink-0">{habito.emoji}</span>
                            <div className="flex flex-col flex-grow">
                              <span className={`font-black text-md ${completadoHoy ? 'text-green-700 line-through opacity-60' : 'text-slate-800'}`}>{habito.nombre}</span>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                {habito.hora && <span className={`text-xs font-bold ${completadoHoy ? 'text-green-600' : 'text-slate-500'}`}>{habito.hora}</span>}
                                {habito.frecuencia && <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-md ${completadoHoy ? 'bg-green-200 text-green-800' : `${config?.bgTag} ${config?.textTag}`}`}>{habito.frecuencia}</span>}
                              </div>
                            </div>
                            <div className="ml-auto shrink-0">
                              {completadoHoy ? <span className="text-green-500 text-2xl">✔️</span> : <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>}
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-1" title={`Racha de ${rachaActual} días seguidos`}>
                              <span className={`text-lg ${rachaActual > 0 ? 'opacity-100' : 'opacity-20 grayscale'}`}>🔥</span>
                              <span className="text-sm font-black text-slate-700">{rachaActual} <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">días</span></span>
                            </div>
                            <div className="flex gap-1" title="Historial de los últimos 7 días">
                              {historial7Dias.map((completado, idx) => (
                                <span key={idx} className={`w-2.5 h-2.5 rounded-full ${completado ? 'bg-green-500' : 'bg-gray-200'} ${idx === 6 ? 'ring-2 ring-gray-100 ring-offset-1' : ''}`}></span>
                              ))}
                            </div>
                          </div>

                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 3. VISTA: FINANZAS CON MEJORAS             */}
      {/* ========================================== */}
      {pestañaActiva === 'finanzas' && (
        <div className="max-w-4xl mx-auto animate-fade-in">
          
          {/* NUEVO: DASHBOARD GRÁFICO DE FINANZAS */}
          {gastos.length > 0 && (
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 mb-8">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Distribución del Presupuesto Total</h3>
              <p className="text-3xl font-black text-slate-900 mb-6">${totalGastosMes.toLocaleString('es-CO')}</p>
              
              <div className="w-full h-4 rounded-full flex overflow-hidden mb-5 bg-gray-100 shadow-inner">
                {Object.entries(categoriasGastos).map(([cat, monto], i) => (
                  <div key={cat} title={`${cat}: $${monto.toLocaleString()}`} className={`h-full transition-all duration-1000 ${coloresCategorias[i % coloresCategorias.length]}`} style={{ width: `${totalGastosMes > 0 ? (monto / totalGastosMes) * 100 : 0}%` }}></div>
                ))}
              </div>
              
              <div className="flex flex-wrap gap-3 md:gap-4">
                {Object.entries(categoriasGastos).map(([cat, monto], i) => (
                  <div key={cat} className="flex items-center gap-1.5 text-xs font-black text-slate-600 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                    <span className={`w-2.5 h-2.5 rounded-full shadow-sm ${coloresCategorias[i % coloresCategorias.length]}`}></span>
                    {cat} <span className="text-gray-400 font-bold ml-1">{((monto / totalGastosMes) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={agregarGasto} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 mb-8">
            <h3 className="text-xl font-black text-slate-800 mb-6">➕ Registrar Nuevo Gasto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <input type="text" placeholder="Concepto (ej. Internet)" value={concepto} onChange={(e) => setConcepto(e.target.value)} className="p-4 border border-gray-200 rounded-xl text-slate-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" required />
              <input type="text" placeholder="Categoría (ej. Servicios)" value={categoria} onChange={(e) => setCategoria(e.target.value)} className="p-4 border border-gray-200 rounded-xl text-slate-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              <div className="relative">
                <span className="absolute left-4 top-4 text-gray-400 font-bold">$</span>
                <input type="number" placeholder="Monto total" value={monto} onChange={(e) => setMonto(e.target.value)} className="w-full p-4 pl-8 border border-gray-200 rounded-xl text-slate-900 font-bold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" required />
              </div>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="p-4 border border-gray-200 rounded-xl text-slate-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            </div>
            <button type="submit" className="bg-slate-900 text-white font-black py-4 px-6 rounded-2xl hover:bg-slate-800 active:scale-95 transition-all w-full text-lg shadow-lg">Guardar Gasto</button>
          </form>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {gastos.map((gasto) => <TarjetaFinanzas key={gasto.id} gasto={gasto} sesion={sesion} strHoy={strHoy} />)}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 4. VISTA: SUPERMERCADO                     */}
      {/* ========================================== */}
      {pestañaActiva === 'supermercado' && (
        <div className="max-w-6xl mx-auto animate-fade-in">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Límite Presupuesto</span>
              <div className="flex items-center mt-2">
                <span className="text-2xl font-black text-gray-300 mr-2">$</span>
                <input type="number" value={presupuestoMercado || ''} onChange={(e) => setPresupuestoMercado(Number(e.target.value))} className="text-3xl font-black text-slate-900 bg-transparent outline-none w-full border-b-2 border-dashed border-gray-200 focus:border-blue-500 transition-all" placeholder="0" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl shadow-lg text-white">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Proyectado</span>
              <p className="text-4xl font-black mt-2 tracking-tight">${totalProyectado.toLocaleString('es-CO')}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-3xl shadow-lg text-white">
              <span className="text-xs font-bold text-emerald-100 uppercase tracking-widest">En Carrito ✔️</span>
              <p className="text-4xl font-black mt-2 tracking-tight">${totalCarrito.toLocaleString('es-CO')}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-400 to-amber-500 p-6 rounded-3xl shadow-lg text-white">
              <span className="text-xs font-bold text-amber-100 uppercase tracking-widest">Falta por recoger</span>
              <p className="text-4xl font-black mt-2 tracking-tight">${pendientes.toLocaleString('es-CO')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 flex flex-col gap-6">
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-black text-slate-800 mb-5">📚 Agregar al Catálogo</h3>
                <form onSubmit={crearProductoCatalogo} className="space-y-4">
                  <input type="text" placeholder="Nombre del producto..." value={catNombre} onChange={(e) => setCatNombre(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 outline-none" required />
                  <div className="flex gap-2">
                    <div className="relative w-1/2">
                      <span className="absolute left-3 top-3 text-gray-400 font-bold">$</span>
                      <input type="number" placeholder="Precio" value={catPrecio} onChange={(e) => setCatPrecio(e.target.value)} className="w-full p-3 pl-7 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 outline-none" required />
                    </div>
                    <select value={catUnidad} onChange={(e) => setCatUnidad(e.target.value)} className="w-1/2 p-3 border border-gray-200 rounded-xl bg-gray-50 font-medium outline-none">
                      <option value="und">Unidad</option><option value="lb">Libras (lb)</option><option value="kg">Kilos (kg)</option><option value="pack">Bandeja</option>
                    </select>
                  </div>
                  <input type="text" placeholder="Categoría (ej. Lácteos)" value={catCat} onChange={(e) => setCatCat(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 outline-none" />
                  <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl active:scale-95 transition-all shadow-md">Guardar Producto</button>
                </form>
              </div>

              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 h-96 overflow-y-auto">
                <h3 className="text-lg font-black text-slate-800 mb-4 sticky top-0 bg-white pb-3 border-b border-gray-100 z-10">Mis Productos Frecuentes</h3>
                <ul className="space-y-3">
                  {mercadoCatalogo.length === 0 && <p className="text-sm font-medium text-gray-400 p-4 border-2 border-dashed border-gray-100 rounded-xl text-center">Catálogo vacío.</p>}
                  {mercadoCatalogo.map(prod => (
                    <li key={prod.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-blue-300 hover:shadow-sm transition-all group">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{prod.nombre}</span>
                        <span className="text-xs font-bold text-gray-400 mt-1">${Number(prod.precio_referencia).toLocaleString('es-CO')} / {prod.unidad}</span>
                      </div>
                      <button onClick={() => agregarAlCarrito(prod)} className="bg-white border-2 border-gray-200 text-slate-800 w-10 h-10 rounded-full font-black text-lg group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white active:scale-90 transition-all shadow-sm">+</button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 min-h-[600px]">
                <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">🛒 Compra Actual</h3>
                
                {mercadoLista.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-80 text-gray-400 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                     <span className="text-6xl mb-4 grayscale opacity-50">🛍️</span>
                     <p className="font-bold text-lg text-gray-500">Tu carrito está vacío.</p>
                     <p className="text-sm">Agrega productos desde tu catálogo a la izquierda.</p>
                   </div>
                ) : (
                  <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b-2 border-gray-100 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                          <th className="p-4 w-10">Check</th>
                          <th className="p-4">Producto</th>
                          <th className="p-4 text-center w-24">Cant.</th>
                          <th className="p-4 text-center w-24">Dcto</th>
                          <th className="p-4 text-right">Subtotal</th>
                          <th className="p-4 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {mercadoLista.map(item => {
                          const finalPrice = (item.cantidad * item.precio_unitario) - ((item.cantidad * item.precio_unitario) * ((item.descuento_porcentaje || 0) / 100));
                          return (
                            <tr key={item.id} className={`border-b border-gray-50 transition-all hover:bg-gray-50/50 ${item.comprado ? 'opacity-60 bg-green-50/30' : ''}`}>
                              <td className="p-4 text-center">
                                <div className="relative flex items-center justify-center">
                                  <input type="checkbox" checked={item.comprado} onChange={(e) => actualizarItemLista(item.id, 'comprado', e.target.checked)} className="peer appearance-none w-7 h-7 border-2 border-gray-300 rounded-lg checked:bg-green-500 checked:border-green-500 cursor-pointer transition-all" />
                                  <span className="absolute text-white font-bold text-sm pointer-events-none opacity-0 peer-checked:opacity-100">✓</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className={`font-black text-lg block ${item.comprado ? 'text-gray-500 line-through' : 'text-slate-800'}`}>{item.producto_nombre}</span>
                                <div className="text-xs font-bold text-gray-400 mt-1">${Number(item.precio_unitario).toLocaleString('es-CO')} c/u</div>
                              </td>
                              <td className="p-4 text-center">
                                <input type="number" min="1" value={item.cantidad} onChange={(e) => actualizarItemLista(item.id, 'cantidad', Number(e.target.value))} className="w-16 p-2 border-2 border-gray-200 rounded-xl text-center text-sm font-bold text-slate-800 bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all" disabled={item.comprado} />
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex items-center border-2 border-gray-200 rounded-xl bg-gray-50 overflow-hidden w-20 focus-within:border-blue-500 focus-within:bg-white transition-all">
                                  <input type="number" min="0" max="100" value={item.descuento_porcentaje} onChange={(e) => actualizarItemLista(item.id, 'descuento_porcentaje', Number(e.target.value))} className="w-full p-2 text-center text-sm font-bold text-blue-600 bg-transparent outline-none" disabled={item.comprado} />
                                  <span className="pr-2 text-gray-400 font-black text-xs">%</span>
                                </div>
                              </td>
                              <td className="p-4 text-right font-black text-slate-800 text-lg">
                                ${finalPrice.toLocaleString('es-CO')}
                              </td>
                              <td className="p-4 text-center">
                                <button onClick={() => eliminarDeLista(item.id)} className="w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white active:scale-90 transition-all flex items-center justify-center" title="Quitar">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* NAVEGACIÓN INFERIOR MÓVIL (BOTTOM NAV BAR) */}
      {/* ========================================== */}
      {sesion && (
        <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-xl border-t border-gray-200 z-50 flex justify-around items-center p-2 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          {navItems.map(item => (
            <button 
              key={item.id}
              onClick={() => setPestañaActiva(item.id)} 
              className={`flex flex-col items-center p-2 min-w-[70px] rounded-2xl transition-all ${pestañaActiva === item.id ? 'text-blue-600 scale-110' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <span className={`text-2xl mb-1 ${pestañaActiva === item.id ? 'opacity-100' : 'opacity-70 grayscale'}`}>{item.icon}</span>
              <span className={`text-[10px] font-black uppercase tracking-wider ${pestañaActiva === item.id ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                {item.label.split(' ')[0]}
              </span>
            </button>
          ))}
        </nav>
      )}

    </main>
  );
}