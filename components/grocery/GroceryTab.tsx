import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/ui/Modal';
import { extraerCompraDeGasto } from '@/types';
import type { MercadoProducto, MercadoItem, UserSession, Gasto, CompraHistorial, CompraHistorialItem } from '@/types';

interface GroceryTabProps {
  mercadoCatalogo: MercadoProducto[];
  mercadoLista: MercadoItem[];
  presupuestoMercado: number;
  setPresupuestoMercado: (val: number) => void;
  sesion: UserSession;
  gastos?: Gasto[];
  strHoy?: string;
  onMercadoActualizado: () => void;
  onAgregarAlCarrito: (prod: MercadoProducto) => void;
  onActualizarItem: (id: string, campo: string, valor: any) => void;
  onEliminarItem: (id: string) => void;
  onLimpiarCarrito: () => void;
}

export const categoriasSugeridas = [
  { id: '🥫 Despensa y Granos', label: '🥫 Despensa y Granos', tag: 'Despensa' },
  { id: '🥩 Carnes, Pollo y Pescado', label: '🥩 Carnes, Pollo y Pescado', tag: 'Carnes' },
  { id: '🍎 Frutas y Verduras', label: '🍎 Frutas y Verduras', tag: 'Frutas/Verduras' },
  { id: '🥛 Lácteos y Huevos', label: '🥛 Lácteos y Huevos', tag: 'Lácteos' },
  { id: '🍞 Panadería y Arepas', label: '🍞 Panadería y Arepas', tag: 'Panadería' },
  { id: '🧼 Aseo y Limpieza', label: '🧼 Aseo y Limpieza', tag: 'Aseo' },
  { id: '🧴 Cuidado Personal', label: '🧴 Cuidado Personal', tag: 'Cuidado Personal' },
  { id: '🥤 Bebidas y Cafés', label: '🥤 Bebidas y Cafés', tag: 'Bebidas' },
  { id: '🥓 Embutidos y Charcutería', label: '🥓 Embutidos y Charcutería', tag: 'Embutidos' },
  { id: '🍪 Snacks y Pasabocas', label: '🍪 Snacks y Pasabocas', tag: 'Snacks' },
  { id: '🧊 Congelados', label: '🧊 Congelados', tag: 'Congelados' },
  { id: '🧂 Condimentos y Salsas', label: '🧂 Condimentos y Salsas', tag: 'Condimentos' },
  { id: '🐾 Mascotas', label: '🐾 Mascotas', tag: 'Mascotas' },
  { id: '💊 Salud y Botiquín', label: '💊 Salud y Botiquín', tag: 'Salud' },
  { id: '📦 General / Otros', label: '📦 General / Otros', tag: 'General' },
  { id: 'Otro', label: '✏️ Otra categoría (Personalizada)', tag: 'Personalizada' },
];

const nombresMeses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function formatearFechaBonita(fechaStr: string): string {
  if (!fechaStr) return '';
  const [y, m, d] = fechaStr.split('-').map(Number);
  if (!y || !m || !d) return fechaStr;
  const diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const diaSemanaIndex = new Date(y, m - 1, d, 12, 0, 0).getDay();
  return `${diasNombres[diaSemanaIndex]}, ${d} de ${nombresMeses[m - 1]} de ${y}`;
}

function PrecioInput({
  valorInicial,
  disabled,
  onGuardar
}: {
  valorInicial: number;
  disabled: boolean;
  onGuardar: (val: number) => void;
}) {
  const [val, setVal] = useState(String(valorInicial));

  useEffect(() => {
    setVal(String(valorInicial));
  }, [valorInicial]);

  return (
    <div className="flex items-center border border-[#EADBCE] rounded-lg bg-[#FAF5F0]/50 overflow-hidden w-24 focus-within:border-[#2D1C14] focus-within:bg-white transition-all mx-auto shadow-2xs">
      <span className="pl-1.5 text-[#8D6B57] font-bold text-xs">$</span>
      <input 
        type="number" 
        min="0" 
        step="100"
        title="Editar valor unitario del producto"
        value={val} 
        onChange={(e) => setVal(e.target.value)} 
        onBlur={() => {
          const num = Math.max(0, Number(val) || 0);
          setVal(String(num));
          if (num !== valorInicial) {
            onGuardar(num);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="w-full p-1.5 text-right pr-2 text-xs font-bold text-[#2D1C14] bg-transparent outline-none" 
        disabled={disabled} 
      />
    </div>
  );
}

export default function GroceryTab({
  mercadoCatalogo,
  mercadoLista,
  presupuestoMercado,
  setPresupuestoMercado,
  sesion,
  gastos = [],
  strHoy = new Date().toISOString().split('T')[0],
  onMercadoActualizado,
  onAgregarAlCarrito,
  onActualizarItem,
  onEliminarItem,
  onLimpiarCarrito
}: GroceryTabProps) {
  // Selector de vista principal: Compra Actual vs Historial de Compras Guardadas
  const [vistaPrincipal, setVistaPrincipal] = useState<'compra_actual' | 'historial'>('compra_actual');

  // Formulario Catálogo nuevo
  const [catNombre, setCatNombre] = useState('');
  const [catPrecio, setCatPrecio] = useState('');
  const [catUnidad, setCatUnidad] = useState('und');
  const [catCat, setCatCat] = useState('🥫 Despensa y Granos');
  const [catPersonalizada, setCatPersonalizada] = useState('');
  const [guardandoProd, setGuardandoProd] = useState(false);

  // Buscador de catálogo
  const [busquedaCatalogo, setBusquedaCatalogo] = useState('');
  // Producto de catálogo a eliminar
  const [prodAEliminar, setProdAEliminar] = useState<MercadoProducto | null>(null);

  // Producto de catálogo a editar
  const [prodAEditar, setProdAEditar] = useState<MercadoProducto | null>(null);
  const [editProdNombre, setEditProdNombre] = useState('');
  const [editProdPrecio, setEditProdPrecio] = useState('');
  const [editProdUnidad, setEditProdUnidad] = useState('und');
  const [editProdCat, setEditProdCat] = useState('🥫 Despensa y Granos');
  const [editProdCatPersonalizada, setEditProdCatPersonalizada] = useState('');
  const [guardandoEdicionProd, setGuardandoEdicionProd] = useState(false);

  // Item de la compra actual a editar en modal
  const [itemAEditar, setItemAEditar] = useState<MercadoItem | null>(null);
  const [editItemNombre, setEditItemNombre] = useState('');
  const [editItemPrecio, setEditItemPrecio] = useState('');
  const [editItemCantidad, setEditItemCantidad] = useState('1');
  const [editItemDescuento, setEditItemDescuento] = useState('0');

  // Filtros de lista de compra actual
  const [filtroLista, setFiltroLista] = useState<'todos' | 'pendientes' | 'carrito'>('todos');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);

  // Modal para confirmar vaciado de lista
  const [modalVaciar, setModalVaciar] = useState(false);

  // Modal para Guardar Compra Realizada
  const [modalGuardarCompra, setModalGuardarCompra] = useState(false);
  const [nombreNuevaCompra, setNombreNuevaCompra] = useState('');
  const [fechaNuevaCompra, setFechaNuevaCompra] = useState(strHoy);
  const [guardarSoloComprados, setGuardarSoloComprados] = useState(false);
  const [registrarEnFinanzas, setRegistrarEnFinanzas] = useState(true);
  const [vaciarListaTrasGuardar, setVaciarListaTrasGuardar] = useState(true);
  const [guardandoCompra, setGuardandoCompra] = useState(false);
  const [mensajeExitoCompra, setMensajeExitoCompra] = useState<string | null>(null);

  // Estado del historial de compras
  const [comprasLocales, setComprasLocales] = useState<CompraHistorial[]>([]);
  const [compraExpandidaId, setCompraExpandidaId] = useState<string | null>(null);

  // Cargar compras guardadas desde localStorage y sincronizar con gastos
  useEffect(() => {
    if (typeof window !== 'undefined' && sesion?.user?.id) {
      try {
        const guardadas = JSON.parse(localStorage.getItem(`jgm_compras_${sesion.user.id}`) || '[]');
        if (Array.isArray(guardadas)) {
          setComprasLocales(guardadas);
        }
      } catch {
        // ignore JSON parse error
      }
    }
  }, [sesion?.user?.id]);

  // Combinar compras desde finanzas_gastos (en la nube) y compras locales (backup)
  const comprasDesdeGastos: CompraHistorial[] = gastos
    .map(extraerCompraDeGasto)
    .filter((c): c is CompraHistorial => c !== null);

  const historialCompleto = [...comprasDesdeGastos, ...comprasLocales].reduce<CompraHistorial[]>((acc, compra) => {
    const yaExiste = acc.some(c => c.id === compra.id || (c.gasto_id && c.gasto_id === compra.gasto_id));
    if (!yaExiste) {
      acc.push(compra);
    }
    return acc;
  }, []).sort((a, b) => {
    const fechaA = a.creado_en || a.fecha;
    const fechaB = b.creado_en || b.fecha;
    return fechaB.localeCompare(fechaA);
  });

  const totalProyectado = mercadoLista.reduce(
    (suma, item) => suma + ((item.cantidad * item.precio_unitario) - ((item.cantidad * item.precio_unitario) * ((item.descuento_porcentaje || 0) / 100))), 
    0
  );
  const totalCarrito = mercadoLista
    .filter(i => i.comprado)
    .reduce((suma, item) => suma + ((item.cantidad * item.precio_unitario) - ((item.cantidad * item.precio_unitario) * ((item.descuento_porcentaje || 0) / 100))), 0);
  const pendientes = totalProyectado - totalCarrito;

  // Cálculos de presupuesto
  const porcentajePresupuesto = presupuestoMercado > 0 
    ? Math.min(150, (totalProyectado / presupuestoMercado) * 100) 
    : 0;
  const presupuestoExcedido = presupuestoMercado > 0 && totalProyectado > presupuestoMercado;
  const saldoPresupuesto = presupuestoMercado - totalProyectado;

  const resumenCategoriasMercado = mercadoLista.reduce((acc: Record<string, number>, item: MercadoItem) => {
    const cat = item?.categoria || 'General';
    const precioFinal = (Number(item?.cantidad) * Number(item?.precio_unitario)) * (1 - (Number(item?.descuento_porcentaje) || 0) / 100);
    acc[cat] = (acc[cat] || 0) + precioFinal;
    return acc;
  }, {});

  // Cálculos de KPIs del historial de compras
  const totalHistoricoGastado = historialCompleto.reduce((acc, c) => acc + (Number(c.total) || 0), 0);
  const promedioPorCompra = historialCompleto.length > 0 
    ? Math.round(totalHistoricoGastado / historialCompleto.length) 
    : 0;

  async function crearProductoCatalogo(e: React.FormEvent) {
    e.preventDefault();
    if (!catNombre || !catPrecio || !sesion?.user?.id) return;
    setGuardandoProd(true);

    const categoriaFinal = catCat === 'Otro' 
      ? (catPersonalizada.trim() || 'General') 
      : catCat;

    const { error } = await supabase.from('mercado_catalogo').insert([{ 
      nombre: catNombre.trim(), 
      categoria: categoriaFinal, 
      precio_referencia: Number(catPrecio), 
      unidad: catUnidad, 
      user_id: sesion.user.id 
    }]);

    setGuardandoProd(false);
    if (error) {
      alert(`Error al guardar en catálogo: ${error.message}`);
    } else {
      setCatNombre('');
      setCatPrecio('');
      setCatPersonalizada('');
      onMercadoActualizado();
    }
  }

  function abrirEdicionProd(prod: MercadoProducto) {
    setProdAEditar(prod);
    setEditProdNombre(prod.nombre);
    setEditProdPrecio(String(prod.precio_referencia));
    setEditProdUnidad(prod.unidad || 'und');
    const match = categoriasSugeridas.find(c => c.label === prod.categoria || c.id === prod.categoria);
    if (match) {
      setEditProdCat(match.id);
      setEditProdCatPersonalizada('');
    } else {
      setEditProdCat('Otro');
      setEditProdCatPersonalizada(prod.categoria || '');
    }
  }

  async function guardarEdicionProductoCatalogo(e: React.FormEvent) {
    e.preventDefault();
    if (!prodAEditar || !editProdNombre || !editProdPrecio) return;
    setGuardandoEdicionProd(true);

    const categoriaFinal = editProdCat === 'Otro' 
      ? (editProdCatPersonalizada.trim() || 'General') 
      : editProdCat;

    const { error } = await supabase
      .from('mercado_catalogo')
      .update({
        nombre: editProdNombre.trim(),
        precio_referencia: Number(editProdPrecio),
        unidad: editProdUnidad,
        categoria: categoriaFinal
      })
      .eq('id', prodAEditar.id);

    setGuardandoEdicionProd(false);
    if (error) {
      alert(`Error al actualizar producto: ${error.message}`);
    } else {
      setProdAEditar(null);
      onMercadoActualizado();
    }
  }

  async function eliminarProductoCatalogo(prodId: string) {
    const { error } = await supabase.from('mercado_catalogo').delete().eq('id', prodId);
    if (!error) {
      setProdAEliminar(null);
      onMercadoActualizado();
    } else {
      alert(`Error al eliminar: ${error.message}`);
    }
  }

  function abrirEdicionItem(item: MercadoItem) {
    setItemAEditar(item);
    setEditItemNombre(item.producto_nombre);
    setEditItemPrecio(String(item.precio_unitario));
    setEditItemCantidad(String(item.cantidad));
    setEditItemDescuento(String(item.descuento_porcentaje || 0));
  }

  async function guardarEdicionItem(e: React.FormEvent) {
    e.preventDefault();
    if (!itemAEditar) return;
    const numPrecio = Math.max(0, Number(editItemPrecio) || 0);
    const numCant = Math.max(1, Number(editItemCantidad) || 1);
    const numDcto = Math.min(100, Math.max(0, Number(editItemDescuento) || 0));
    const nuevoNom = editItemNombre.trim() || itemAEditar.producto_nombre;

    await supabase.from('mercado_lista').update({
      producto_nombre: nuevoNom,
      precio_unitario: numPrecio,
      cantidad: numCant,
      descuento_porcentaje: numDcto
    }).eq('id', itemAEditar.id);

    setItemAEditar(null);
    onMercadoActualizado();
  }

  // Guardar la Compra Realizada en el Historial y en Finanzas
  async function guardarCompraRealizada(e: React.FormEvent) {
    e.preventDefault();
    if (!sesion?.user?.id) return;

    const itemsSeleccionados = guardarSoloComprados
      ? mercadoLista.filter(i => i.comprado)
      : mercadoLista;

    if (itemsSeleccionados.length === 0) {
      alert("No hay productos seleccionados para guardar en esta compra.");
      return;
    }

    setGuardandoCompra(true);

    const totalCalculado = itemsSeleccionados.reduce(
      (sum, item) => sum + ((item.cantidad * item.precio_unitario) * (1 - ((item.descuento_porcentaje || 0) / 100))),
      0
    );

    const compraId = 'compra_' + Date.now();
    const fechaFinal = fechaNuevaCompra || strHoy;
    const nombreFinal = nombreNuevaCompra.trim() || `Compra Mercado - ${fechaFinal}`;

    const nuevaCompra: CompraHistorial = {
      id: compraId,
      nombre: nombreFinal,
      fecha: fechaFinal,
      creado_en: new Date().toISOString(),
      total: Math.round(totalCalculado),
      items_count: itemsSeleccionados.length,
      items: itemsSeleccionados.map(i => ({
        nombre: i.producto_nombre,
        categoria: i.categoria || 'General',
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        descuento_porcentaje: i.descuento_porcentaje || 0,
        subtotal: Math.round((i.cantidad * i.precio_unitario) * (1 - ((i.descuento_porcentaje || 0) / 100)))
      })),
      user_id: sesion.user.id
    };

    // 1. Guardar en Supabase en finanzas_gastos para sincronización con la nube
    if (registrarEnFinanzas) {
      const conceptoGasto = `${nombreFinal} (${nuevaCompra.items_count} prods) ||JGM_COMPRA::${JSON.stringify(nuevaCompra)}`;
      const { data: gastoData, error: errGasto } = await supabase.from('finanzas_gastos').insert([{
        concepto: conceptoGasto,
        categoria: 'Supermercado',
        monto_total: Math.round(totalCalculado),
        fecha_vencimiento: fechaFinal,
        user_id: sesion.user.id
      }]).select();

      if (!errGasto && gastoData && gastoData[0]) {
        nuevaCompra.gasto_id = gastoData[0].id;
      }
    }

    // 2. Guardar en localStorage para disponibilidad instantánea
    if (typeof window !== 'undefined') {
      const keyStorage = `jgm_compras_${sesion.user.id}`;
      const previo = JSON.parse(localStorage.getItem(keyStorage) || '[]');
      const actualizado = [nuevaCompra, ...previo.filter((c: any) => c.id !== nuevaCompra.id)];
      localStorage.setItem(keyStorage, JSON.stringify(actualizado));
      setComprasLocales(actualizado);
    }

    // 3. Vaciar los productos guardados de la compra actual si el usuario lo marcó
    if (vaciarListaTrasGuardar) {
      if (guardarSoloComprados) {
        for (const item of itemsSeleccionados) {
          await supabase.from('mercado_lista').delete().eq('id', item.id);
        }
      } else {
        await supabase.from('mercado_lista').delete().eq('user_id', sesion.user.id);
      }
    }

    setGuardandoCompra(false);
    setModalGuardarCompra(false);
    setMensajeExitoCompra(`¡"${nombreFinal}" guardada con éxito en tu historial!`);
    setTimeout(() => setMensajeExitoCompra(null), 4500);

    onMercadoActualizado();
    setVistaPrincipal('historial');
  }

  // Cargar productos de una compra pasada a la compra actual
  async function cargarCompraAListaActual(compra: CompraHistorial) {
    if (!sesion?.user?.id) return;
    const confirmar = confirm(`¿Deseas agregar los ${compra.items.length} productos de "${compra.nombre}" a tu compra actual?`);
    if (!confirmar) return;

    for (const item of compra.items) {
      if (!mercadoLista.some(m => m.producto_nombre === item.nombre)) {
        await supabase.from('mercado_lista').insert([{
          producto_nombre: item.nombre,
          categoria: item.categoria || 'General',
          cantidad: item.cantidad || 1,
          precio_unitario: item.precio_unitario || 0,
          descuento_porcentaje: item.descuento_porcentaje || 0,
          comprado: false,
          user_id: sesion.user.id
        }]);
      }
    }

    onMercadoActualizado();
    setVistaPrincipal('compra_actual');
  }

  // Eliminar una compra del historial
  async function eliminarCompraDelHistorial(compra: CompraHistorial) {
    const confirmar = confirm(`¿Estás seguro de que deseas eliminar la compra "${compra.nombre}" del historial?`);
    if (!confirmar) return;

    if (compra.gasto_id) {
      await supabase.from('finanzas_gastos').delete().eq('id', compra.gasto_id);
    }

    if (typeof window !== 'undefined' && sesion?.user?.id) {
      const keyStorage = `jgm_compras_${sesion.user.id}`;
      const previo = JSON.parse(localStorage.getItem(keyStorage) || '[]');
      const filtrado = previo.filter((c: any) => c.id !== compra.id && (!compra.gasto_id || c.gasto_id !== compra.gasto_id));
      localStorage.setItem(keyStorage, JSON.stringify(filtrado));
      setComprasLocales(filtrado);
    }

    onMercadoActualizado();
  }

  // Filtrado de catálogo
  const catalogoFiltrado = mercadoCatalogo.filter(p => 
    p.nombre.toLowerCase().includes(busquedaCatalogo.toLowerCase()) || 
    (p.categoria && p.categoria.toLowerCase().includes(busquedaCatalogo.toLowerCase()))
  );

  // Filtrado de lista de compras actual
  const listaFiltrada = mercadoLista.filter(item => {
    if (filtroLista === 'pendientes' && item.comprado) return false;
    if (filtroLista === 'carrito' && !item.comprado) return false;
    if (categoriaFiltro && (item.categoria || 'General') !== categoriaFiltro) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-6">
      
      {/* Selector Principal: Compra Actual vs Historial de Compras */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3 rounded-3xl border border-[#EADBCE]/80 shadow-[0_2px_16px_rgba(45,28,20,0.03)]">
        <div className="flex items-center gap-1.5 bg-[#FAF5F0] p-1 rounded-2xl border border-[#EADBCE]/60 text-xs font-bold">
          <button
            type="button"
            onClick={() => setVistaPrincipal('compra_actual')}
            className={`px-4 py-2 rounded-xl transition-all active:scale-95 flex items-center gap-2 ${
              vistaPrincipal === 'compra_actual'
                ? 'bg-[#2D1C14] text-white shadow-xs'
                : 'text-[#8D6B57] hover:text-[#2D1C14]'
            }`}
          >
            <span>🛒 Compra Actual</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
              vistaPrincipal === 'compra_actual' ? 'bg-[#FAF5F0] text-[#2D1C14]' : 'bg-white text-[#8D6B57]'
            }`}>
              {mercadoLista.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setVistaPrincipal('historial')}
            className={`px-4 py-2 rounded-xl transition-all active:scale-95 flex items-center gap-2 ${
              vistaPrincipal === 'historial'
                ? 'bg-[#2D1C14] text-white shadow-xs'
                : 'text-[#8D6B57] hover:text-[#2D1C14]'
            }`}
          >
            <span>📋 Historial de Compras</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
              vistaPrincipal === 'historial' ? 'bg-[#FAF5F0] text-[#2D1C14]' : 'bg-white text-[#8D6B57]'
            }`}>
              {historialCompleto.length}
            </span>
          </button>
        </div>

        {/* Notificación de éxito al guardar compra */}
        {mensajeExitoCompra && (
          <div className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200 shadow-2xs animate-fade-in flex items-center gap-1.5">
            <span>✅</span> {mensajeExitoCompra}
          </div>
        )}
      </div>

      {/* VISTA 1: COMPRA ACTUAL */}
      {vistaPrincipal === 'compra_actual' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Métricas Principales en Marrón y Blanco */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Límite Presupuesto */}
            <div className="bg-white p-6 rounded-3xl border border-[#EADBCE]/80 shadow-[0_2px_16px_rgba(45,28,20,0.03)] flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-[#8D6B57] uppercase tracking-wider">Límite Presupuesto</span>
                {presupuestoMercado > 0 && (
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${presupuestoExcedido ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-[#FAF5F0] text-[#4A3225] border border-[#EADBCE]'}`}>
                    {presupuestoExcedido ? `Excedido -$${Math.abs(saldoPresupuesto).toLocaleString('es-CO')}` : `Disponible $${saldoPresupuesto.toLocaleString('es-CO')}`}
                  </span>
                )}
              </div>
              <div className="flex items-center mt-2">
                <span className="text-2xl font-bold text-[#8D6B57]/40 mr-2">$</span>
                <input 
                  type="number" 
                  value={presupuestoMercado || ''} 
                  onChange={(e) => setPresupuestoMercado(Number(e.target.value))} 
                  className="text-3xl font-extrabold text-[#2D1C14] bg-transparent outline-none w-full border-b border-dashed border-[#EADBCE] focus:border-[#2D1C14] transition-all" 
                  placeholder="0" 
                />
              </div>
              {presupuestoMercado > 0 && (
                <div className="w-full bg-[#FAF5F0] h-1.5 rounded-full overflow-hidden mt-3">
                  <div 
                    className={`h-full transition-all duration-500 ${presupuestoExcedido ? 'bg-rose-600' : 'bg-[#2D1C14]'}`} 
                    style={{ width: `${Math.min(100, porcentajePresupuesto)}%` }}
                  ></div>
                </div>
              )}
            </div>

            {/* Total Proyectado */}
            <div className="bg-[#2D1C14] p-6 rounded-3xl shadow-xs text-white flex flex-col justify-between">
              <span className="text-[10px] font-bold text-[#C89F89] uppercase tracking-wider">Total Proyectado</span>
              <p className="text-3xl font-extrabold mt-2 tracking-tight">${totalProyectado.toLocaleString('es-CO')}</p>
              <span className="text-xs text-[#C89F89] mt-2 font-medium">{mercadoLista.length} artículos en lista</span>
            </div>

            {/* En Carrito */}
            <div className="bg-[#3E271D] p-6 rounded-3xl shadow-xs text-white flex flex-col justify-between">
              <span className="text-[10px] font-bold text-[#E3C3AF] uppercase tracking-wider">En Carrito ✔</span>
              <p className="text-3xl font-extrabold mt-2 tracking-tight">${totalCarrito.toLocaleString('es-CO')}</p>
              <span className="text-xs text-[#E3C3AF] mt-2 font-medium">{mercadoLista.filter(i => i.comprado).length} de {mercadoLista.length} listos</span>
            </div>

            {/* Falta por recoger */}
            <div className="bg-[#55382B] p-6 rounded-3xl shadow-xs text-white flex flex-col justify-between">
              <span className="text-[10px] font-bold text-[#F3E4D8] uppercase tracking-wider">Falta por Recoger</span>
              <p className="text-3xl font-extrabold mt-2 tracking-tight">${pendientes.toLocaleString('es-CO')}</p>
              <span className="text-xs text-[#F3E4D8] mt-2 font-medium">{mercadoLista.filter(i => !i.comprado).length} pendientes</span>
            </div>
          </div>

          {/* Resumen por Categorías con filtro interactivo */}
          {Object.keys(resumenCategoriasMercado).length > 0 && (
            <div className="bg-white p-5 rounded-3xl shadow-[0_2px_16px_rgba(45,28,20,0.03)] border border-[#EADBCE]/80">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#8D6B57]">Resumen por Categoría</h3>
                {categoriaFiltro && (
                  <button 
                    onClick={() => setCategoriaFiltro(null)}
                    className="text-xs font-bold text-[#2D1C14] hover:underline"
                  >
                    ✕ Ver todas
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(resumenCategoriasMercado).map(([cat, total]) => (
                  <button 
                    key={cat} 
                    onClick={() => setCategoriaFiltro(categoriaFiltro === cat ? null : cat)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all active:scale-95 text-xs ${
                      categoriaFiltro === cat 
                        ? 'bg-[#2D1C14] text-white border-[#2D1C14] shadow-2xs' 
                        : 'bg-[#FAF5F0] text-[#4A3225] border-[#EADBCE]/60 hover:border-[#D9C4B3]'
                    }`}
                  >
                    <span className="font-semibold">{cat}</span>
                    <span className={`font-bold ${categoriaFiltro === cat ? 'text-[#C89F89]' : 'text-[#2D1C14]'}`}>${Number(total).toLocaleString('es-CO')}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sección Principal: Catálogo y Lista Activa */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Columna Izquierda: Formulario y Catálogo Frecuente */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              
              {/* Formulario Agregar Producto al Catálogo con Lista de Opciones */}
              <div className="bg-white p-6 rounded-3xl shadow-[0_2px_16px_rgba(45,28,20,0.03)] border border-[#EADBCE]/80">
                <h3 className="text-base font-bold text-[#2D1C14] mb-4">📚 Agregar al Catálogo</h3>
                <form onSubmit={crearProductoCatalogo} className="space-y-3.5">
                  <div>
                    <label className="text-[10px] font-bold text-[#8D6B57] uppercase tracking-wider block mb-1">
                      Nombre del producto
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ej. Pechuga de pollo, Arroz, Leche..." 
                      value={catNombre} 
                      onChange={(e) => setCatNombre(e.target.value)} 
                      className="w-full p-2.5 border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 focus:bg-white focus:border-[#2D1C14] text-[#2D1C14] outline-none font-bold text-xs" 
                      required 
                    />
                  </div>

                  <div className="flex gap-2">
                    <div className="relative w-1/2">
                      <label className="text-[10px] font-bold text-[#8D6B57] uppercase tracking-wider block mb-1">
                        Precio Ref. ($)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-[#8D6B57] font-bold text-xs">$</span>
                        <input 
                          type="number" 
                          placeholder="0" 
                          value={catPrecio} 
                          onChange={(e) => setCatPrecio(e.target.value)} 
                          className="w-full p-2.5 pl-6 border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 focus:bg-white focus:border-[#2D1C14] text-[#2D1C14] outline-none font-bold text-xs" 
                          required 
                        />
                      </div>
                    </div>

                    <div className="w-1/2">
                      <label className="text-[10px] font-bold text-[#8D6B57] uppercase tracking-wider block mb-1">
                        Unidad
                      </label>
                      <select 
                        value={catUnidad} 
                        onChange={(e) => setCatUnidad(e.target.value)} 
                        className="w-full p-2.5 border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 text-[#2D1C14] font-bold outline-none text-xs"
                      >
                        <option value="und">Unidad</option>
                        <option value="lb">Libras (lb)</option>
                        <option value="kg">Kilos (kg)</option>
                        <option value="pack">Bandeja/Pack</option>
                        <option value="lt">Litros (L)</option>
                      </select>
                    </div>
                  </div>

                  {/* Lista de Opciones de Tipo de Producto */}
                  <div>
                    <label className="text-[10px] font-bold text-[#8D6B57] uppercase tracking-wider block mb-1.5">
                      Tipo de producto / Categoría:
                    </label>
                    
                    <select 
                      value={catCat} 
                      onChange={(e) => {
                        setCatCat(e.target.value);
                        if (e.target.value !== 'Otro') {
                          setCatPersonalizada('');
                        }
                      }} 
                      className="w-full p-2.5 border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 focus:bg-white focus:border-[#2D1C14] text-[#2D1C14] font-bold outline-none text-xs shadow-2xs"
                    >
                      {categoriasSugeridas.map(c => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>

                    {/* Chips de selección rápida */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {categoriasSugeridas.slice(0, 8).map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setCatCat(c.id);
                            setCatPersonalizada('');
                          }}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border transition-all active:scale-95 ${
                            catCat === c.id 
                              ? 'bg-[#2D1C14] text-white border-[#2D1C14] shadow-2xs' 
                              : 'bg-[#FAF5F0] text-[#6F4A39] border-[#EADBCE]/70 hover:border-[#2D1C14]'
                          }`}
                        >
                          {c.tag}
                        </button>
                      ))}
                    </div>

                    {catCat === 'Otro' && (
                      <input 
                        type="text" 
                        placeholder="Escribe el tipo de producto personalizado..." 
                        value={catPersonalizada} 
                        onChange={(e) => setCatPersonalizada(e.target.value)} 
                        className="w-full mt-2 p-2.5 border border-[#EADBCE] rounded-xl bg-white focus:border-[#2D1C14] text-[#2D1C14] font-bold outline-none text-xs animate-fade-in shadow-2xs" 
                        required 
                      />
                    )}
                  </div>

                  <button 
                    type="submit" 
                    disabled={guardandoProd}
                    className="w-full bg-[#2D1C14] text-white font-bold py-3 rounded-xl hover:bg-[#3E271D] active:scale-95 transition-all shadow-xs disabled:opacity-50 text-xs mt-2"
                  >
                    {guardandoProd ? 'Guardando...' : 'Guardar en Catálogo'}
                  </button>
                </form>
              </div>

              {/* Lista de Catálogo Frecuente con Buscador */}
              <div className="bg-white p-6 rounded-3xl shadow-[0_2px_16px_rgba(45,28,20,0.03)] border border-[#EADBCE]/80 flex flex-col max-h-[480px]">
                <div className="sticky top-0 bg-white pb-3 border-b border-[#EADBCE]/60 z-10 space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-[#2D1C14]">Productos Frecuentes</h3>
                    <span className="text-[10px] font-bold text-[#8D6B57] bg-[#FAF5F0] px-2 py-0.5 rounded-md border border-[#EADBCE]/60">
                      {mercadoCatalogo.length}
                    </span>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Buscar en catálogo..." 
                    value={busquedaCatalogo} 
                    onChange={(e) => setBusquedaCatalogo(e.target.value)} 
                    className="w-full p-2 text-xs border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 focus:bg-white focus:border-[#2D1C14] text-[#2D1C14] outline-none"
                  />
                </div>

                <ul className="space-y-2.5 overflow-y-auto pt-2.5 flex-grow pr-1">
                  {catalogoFiltrado.length === 0 && (
                    <p className="text-xs font-medium text-[#8D6B57] p-6 border border-dashed border-[#EADBCE] rounded-xl text-center">
                      No hay productos en catálogo.
                    </p>
                  )}
                  {catalogoFiltrado.map(prod => (
                    <li key={prod.id} className="flex justify-between items-center p-3 bg-[#FAF5F0]/60 rounded-2xl border border-[#EADBCE]/60 hover:border-[#D9C4B3] transition-all group">
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="font-bold text-[#2D1C14] text-xs truncate">{prod.nombre}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] font-bold text-[#6F4A39]">${Number(prod.precio_referencia).toLocaleString('es-CO')} / {prod.unidad}</span>
                          {prod.categoria && (
                            <span className="text-[9px] font-medium text-[#8D6B57] bg-white px-1.5 py-0.2 rounded border border-[#EADBCE]">
                              {prod.categoria}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        <button 
                          type="button"
                          onClick={() => abrirEdicionProd(prod)}
                          className="w-7 h-7 rounded-full text-[#8D6B57] hover:text-[#2D1C14] hover:bg-white flex items-center justify-center transition-colors text-xs active:scale-90 border border-transparent hover:border-[#EADBCE]"
                          title="Editar producto del catálogo"
                        >
                          ✏️
                        </button>
                        <button 
                          type="button"
                          onClick={() => setProdAEliminar(prod)}
                          className="w-7 h-7 rounded-full text-[#8D6B57] hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors text-xs active:scale-90"
                          title="Eliminar de catálogo"
                        >
                          🗑️
                        </button>
                        <button 
                          type="button"
                          onClick={() => onAgregarAlCarrito(prod)} 
                          className="bg-white border border-[#EADBCE] text-[#2D1C14] w-7 h-7 rounded-full font-extrabold text-sm hover:bg-[#2D1C14] hover:border-[#2D1C14] hover:text-white active:scale-90 transition-all shadow-2xs flex items-center justify-center"
                          title="Agregar a compra actual"
                        >
                          +
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Columna Derecha: Tabla Interactiva de Compra Actual */}
            <div className="lg:col-span-2">
              <div className="bg-white p-6 rounded-3xl shadow-[0_2px_16px_rgba(45,28,20,0.03)] border border-[#EADBCE]/80 min-h-[580px] flex flex-col justify-between">
                <div>
                  {/* Encabezado y Acciones de la Lista */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 pb-3 border-b border-[#EADBCE]/60">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-[#2D1C14] flex items-center gap-2">
                        <span>🛒</span> Compra Actual
                      </h3>
                      <span className="text-[10px] font-bold text-[#8D6B57] bg-[#FAF5F0] px-2 py-0.5 rounded-lg border border-[#EADBCE]/60">
                        {listaFiltrada.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex bg-[#FAF5F0] p-1 rounded-xl text-xs font-bold border border-[#EADBCE]/60">
                        <button
                          type="button"
                          onClick={() => setFiltroLista('todos')}
                          className={`px-3 py-1.5 rounded-lg transition-all ${filtroLista === 'todos' ? 'bg-[#2D1C14] text-white shadow-xs' : 'text-[#6F4A39] hover:text-[#2D1C14]'}`}
                        >
                          Todos
                        </button>
                        <button
                          type="button"
                          onClick={() => setFiltroLista('pendientes')}
                          className={`px-3 py-1.5 rounded-lg transition-all ${filtroLista === 'pendientes' ? 'bg-[#2D1C14] text-white shadow-xs font-bold' : 'text-[#6F4A39] hover:text-[#2D1C14]'}`}
                        >
                          Pendientes
                        </button>
                        <button
                          type="button"
                          onClick={() => setFiltroLista('carrito')}
                          className={`px-3 py-1.5 rounded-lg transition-all ${filtroLista === 'carrito' ? 'bg-[#2D1C14] text-white shadow-xs font-bold' : 'text-[#6F4A39] hover:text-[#2D1C14]'}`}
                        >
                          En Carrito
                        </button>
                      </div>

                      {/* Botón Guardar Compra Realizada */}
                      {mercadoLista.length > 0 && (
                        <button 
                          type="button"
                          onClick={() => {
                            setNombreNuevaCompra(`Compra Supermercado - ${strHoy}`);
                            setFechaNuevaCompra(strHoy);
                            setGuardarSoloComprados(false);
                            setModalGuardarCompra(true);
                          }}
                          className="bg-[#2D1C14] hover:bg-[#3E271D] text-white font-bold px-3.5 py-1.5 rounded-xl transition-all active:scale-95 shadow-xs text-xs flex items-center gap-1.5"
                          title="Guardar la compra realizada en el historial"
                        >
                          <span>💾</span> Guardar Compra
                        </button>
                      )}

                      {mercadoLista.length > 0 && (
                        <button 
                          type="button"
                          onClick={() => setModalVaciar(true)} 
                          className="text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white px-3 py-1.5 rounded-xl transition-all active:scale-95 shadow-2xs border border-rose-200"
                        >
                          🗑️ Vaciar
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Tabla de Artículos con Edición Directa de Valor */}
                  {listaFiltrada.length === 0 ? (
                     <div className="flex flex-col items-center justify-center h-80 text-[#8D6B57] bg-[#FAF5F0]/50 rounded-2xl border border-dashed border-[#EADBCE]">
                       <span className="text-4xl mb-3 opacity-40">🛍️</span>
                       <p className="font-bold text-sm text-[#3E271D]">No hay productos en esta vista.</p>
                       <p className="text-xs text-[#8D6B57] mt-1">Agrega productos desde tu catálogo a la izquierda.</p>
                     </div>
                  ) : (
                    <div className="overflow-x-auto scrollbar-hide">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#EADBCE]/60 text-[10px] font-bold text-[#8D6B57] uppercase tracking-wider">
                            <th className="p-2.5 w-10 text-center">Listo</th>
                            <th className="p-2.5">Producto</th>
                            <th className="p-2.5 text-center w-28">Precio ($)</th>
                            <th className="p-2.5 text-center w-20">Cant.</th>
                            <th className="p-2.5 text-center w-20">Dcto (%)</th>
                            <th className="p-2.5 text-right">Subtotal</th>
                            <th className="p-2.5 w-16 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {listaFiltrada.map(item => {
                            const finalPrice = (item.cantidad * item.precio_unitario) - ((item.cantidad * item.precio_unitario) * ((item.descuento_porcentaje || 0) / 100));
                            return (
                              <tr key={item.id} className={`border-b border-[#FAF5F0] transition-all hover:bg-[#FAF5F0]/60 ${item.comprado ? 'opacity-50 bg-[#FAF5F0]/30' : ''}`}>
                                <td className="p-2.5 text-center">
                                  <div className="relative flex items-center justify-center">
                                    <input 
                                      type="checkbox" 
                                      checked={item.comprado} 
                                      onChange={(e) => onActualizarItem(item.id, 'comprado', e.target.checked)} 
                                      className="peer appearance-none w-5 h-5 border-2 border-[#EADBCE] rounded-md checked:bg-[#2D1C14] checked:border-[#2D1C14] cursor-pointer transition-all" 
                                    />
                                    <span className="absolute text-white font-bold text-xs pointer-events-none opacity-0 peer-checked:opacity-100">✓</span>
                                  </div>
                                </td>
                                <td className="p-2.5">
                                  <span className={`font-bold text-sm block ${item.comprado ? 'text-[#8D6B57] line-through' : 'text-[#2D1C14]'}`}>
                                    {item.producto_nombre}
                                  </span>
                                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-[#8D6B57] font-medium">
                                    {item.categoria && (
                                      <span className="bg-[#FAF5F0] px-1.5 py-0.2 rounded text-[9px] font-bold text-[#6F4A39] border border-[#EADBCE]/50">
                                        {item.categoria}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Campo Editable: Valor / Precio del producto */}
                                <td className="p-2.5 text-center">
                                  <PrecioInput 
                                    valorInicial={item.precio_unitario} 
                                    disabled={item.comprado} 
                                    onGuardar={(nuevoPrecio) => onActualizarItem(item.id, 'precio_unitario', nuevoPrecio)}
                                  />
                                </td>

                                <td className="p-2.5 text-center">
                                  <input 
                                    type="number" 
                                    min="1" 
                                    value={item.cantidad} 
                                    onChange={(e) => onActualizarItem(item.id, 'cantidad', Math.max(1, Number(e.target.value)))} 
                                    className="w-14 p-1.5 border border-[#EADBCE] rounded-lg text-center text-xs font-bold text-[#2D1C14] bg-[#FAF5F0]/50 focus:bg-white focus:border-[#2D1C14] outline-none transition-all shadow-2xs" 
                                    disabled={item.comprado} 
                                  />
                                </td>
                                <td className="p-2.5 text-center">
                                  <div className="flex items-center border border-[#EADBCE] rounded-lg bg-[#FAF5F0]/50 overflow-hidden w-16 focus-within:border-[#2D1C14] focus-within:bg-white transition-all mx-auto shadow-2xs">
                                    <input 
                                      type="number" 
                                      min="0" 
                                      max="100" 
                                      value={item.descuento_porcentaje} 
                                      onChange={(e) => onActualizarItem(item.id, 'descuento_porcentaje', Math.min(100, Math.max(0, Number(e.target.value))))} 
                                      className="w-full p-1.5 text-center text-xs font-bold text-[#2D1C14] bg-transparent outline-none" 
                                      disabled={item.comprado} 
                                    />
                                    <span className="pr-1.5 text-[#8D6B57] font-bold text-[10px]">%</span>
                                  </div>
                                </td>
                                <td className="p-2.5 text-right font-extrabold text-[#2D1C14] text-sm">
                                  ${Math.round(finalPrice).toLocaleString('es-CO')}
                                </td>
                                <td className="p-2.5 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button 
                                      type="button"
                                      onClick={() => abrirEdicionItem(item)}
                                      className="w-6 h-6 rounded-full bg-[#FAF5F0] text-[#8D6B57] hover:bg-[#EADBCE] hover:text-[#2D1C14] active:scale-90 transition-all flex items-center justify-center text-xs shadow-2xs" 
                                      title="Editar precio y detalles"
                                    >
                                      ✏️
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => onEliminarItem(item.id)} 
                                      className="w-6 h-6 rounded-full bg-[#FAF5F0] text-[#8D6B57] hover:bg-rose-50 hover:text-rose-600 active:scale-90 transition-all flex items-center justify-center text-xs shadow-2xs" 
                                      title="Quitar de compra"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Pie de Tabla con Resumen de Compra y Botón Guardar */}
                {mercadoLista.length > 0 && (
                  <div className="mt-6 pt-3 border-t border-[#EADBCE]/60 flex flex-col sm:flex-row justify-between items-center gap-3 bg-[#FAF5F0] p-4 rounded-2xl text-xs">
                    <span className="font-semibold text-[#6F4A39]">
                      Progreso: <strong className="text-[#2D1C14] font-bold">{mercadoLista.filter(i => i.comprado).length} de {mercadoLista.length} listos</strong>
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="uppercase font-bold text-[#8D6B57] text-[10px]">Total:</span>
                        <span className="text-xl font-black text-[#2D1C14]">${totalProyectado.toLocaleString('es-CO')}</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          setNombreNuevaCompra(`Compra Supermercado - ${strHoy}`);
                          setFechaNuevaCompra(strHoy);
                          setGuardarSoloComprados(false);
                          setModalGuardarCompra(true);
                        }}
                        className="bg-[#2D1C14] hover:bg-[#3E271D] text-white font-bold px-4 py-2 rounded-xl transition-all active:scale-95 shadow-xs text-xs flex items-center gap-1.5"
                      >
                        <span>💾</span> Guardar Compra
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

        </div>
      )}

      {/* VISTA 2: HISTORIAL DE COMPRAS GUARDADAS */}
      {vistaPrincipal === 'historial' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Métricas del Historial */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-[#EADBCE]/80 shadow-[0_2px_16px_rgba(45,28,20,0.03)] flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF5F0] text-[#2D1C14] flex items-center justify-center text-xl font-bold shrink-0 border border-[#EADBCE]/60">
                💰
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8D6B57]">Total Invertido en Compras</span>
                <p className="text-2xl font-extrabold text-[#2D1C14] tracking-tight">
                  ${totalHistoricoGastado.toLocaleString('es-CO')}
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#EADBCE]/80 shadow-[0_2px_16px_rgba(45,28,20,0.03)] flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF5F0] text-[#2D1C14] flex items-center justify-center text-xl font-bold shrink-0 border border-[#EADBCE]/60">
                🛍️
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8D6B57]">Compras Realizadas</span>
                <p className="text-2xl font-extrabold text-[#2D1C14] tracking-tight">
                  {historialCompleto.length} <span className="text-xs font-semibold text-[#8D6B57]">guardadas</span>
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#EADBCE]/80 shadow-[0_2px_16px_rgba(45,28,20,0.03)] flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF5F0] text-[#2D1C14] flex items-center justify-center text-xl font-bold shrink-0 border border-[#EADBCE]/60">
                📊
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8D6B57]">Promedio por Compra</span>
                <p className="text-2xl font-extrabold text-[#2D1C14] tracking-tight">
                  ${promedioPorCompra.toLocaleString('es-CO')}
                </p>
              </div>
            </div>
          </div>

          {/* Listado de Compras Guardadas */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_2px_16px_rgba(45,28,20,0.03)] border border-[#EADBCE]/80">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-[#EADBCE]/60">
              <h3 className="text-lg font-bold text-[#2D1C14] flex items-center gap-2">
                <span>📋</span> Compras Registradas en Historial
              </h3>
              <button
                type="button"
                onClick={() => setVistaPrincipal('compra_actual')}
                className="text-xs font-bold text-[#2D1C14] hover:underline flex items-center gap-1"
              >
                <span>➕ Ir a Compra Actual</span>
              </button>
            </div>

            {historialCompleto.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[#8D6B57] bg-[#FAF5F0]/50 rounded-2xl border border-dashed border-[#EADBCE]">
                <span className="text-4xl mb-3 opacity-40">🧾</span>
                <p className="font-bold text-sm text-[#3E271D]">Aún no tienes compras guardadas en el historial.</p>
                <p className="text-xs text-[#8D6B57] mt-1 max-w-sm text-center">
                  Agrega los productos en &quot;Compra Actual&quot; y haz clic en &quot;💾 Guardar Compra&quot; para registrar cada compra que realices.
                </p>
                <button
                  type="button"
                  onClick={() => setVistaPrincipal('compra_actual')}
                  className="mt-4 px-4 py-2 bg-[#2D1C14] text-white rounded-xl text-xs font-bold active:scale-95 transition-all shadow-xs"
                >
                  Ir a Compra Actual
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {historialCompleto.map((compra) => {
                  const expandida = compraExpandidaId === compra.id;
                  return (
                    <div 
                      key={compra.id} 
                      className="p-5 rounded-2xl border border-[#EADBCE]/80 bg-[#FAF5F0]/40 hover:bg-[#FAF5F0]/80 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🛍️</span>
                            <span className="font-extrabold text-[#2D1C14] text-base">{compra.nombre}</span>
                            <span className="text-[10px] font-bold text-[#8D6B57] bg-white px-2 py-0.5 rounded-md border border-[#EADBCE]/60">
                              {compra.items_count || compra.items?.length || 0} productos
                            </span>
                          </div>
                          <p className="text-xs text-[#8D6B57] font-medium flex items-center gap-1">
                            <span>📅</span> {formatearFechaBonita(compra.fecha)}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-[#8D6B57] uppercase block">Total Compra</span>
                            <span className="text-xl font-black text-[#2D1C14] tracking-tight">
                              ${Number(compra.total).toLocaleString('es-CO')}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Botón Ver Productos */}
                            <button
                              type="button"
                              onClick={() => setCompraExpandidaId(expandida ? null : compra.id)}
                              className="px-3 py-1.5 rounded-xl border border-[#EADBCE] bg-white hover:bg-[#FAF5F0] text-[#2D1C14] text-xs font-bold transition-all active:scale-95 shadow-2xs flex items-center gap-1"
                              title="Ver desglose de productos"
                            >
                              <span>{expandida ? '▲ Ocultar' : '▼ Productos'}</span>
                            </button>

                            {/* Botón Cargar de nuevo en Compra Actual */}
                            <button
                              type="button"
                              onClick={() => cargarCompraAListaActual(compra)}
                              className="px-3 py-1.5 rounded-xl border border-[#2D1C14] bg-[#2D1C14] hover:bg-[#3E271D] text-white text-xs font-bold transition-all active:scale-95 shadow-xs flex items-center gap-1"
                              title="Cargar estos productos a la compra actual para volver a comprarlos"
                            >
                              <span>🔄 Repetir</span>
                            </button>

                            {/* Botón Eliminar del historial */}
                            <button
                              type="button"
                              onClick={() => eliminarCompraDelHistorial(compra)}
                              className="w-8 h-8 rounded-xl text-[#8D6B57] hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors text-xs active:scale-90 border border-[#EADBCE]/60"
                              title="Eliminar compra del historial"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Desglose Expandido de Productos */}
                      {expandida && (
                        <div className="pt-3 border-t border-[#EADBCE]/60 animate-fade-in space-y-2">
                          <p className="text-[11px] font-bold text-[#8D6B57] uppercase tracking-wider">
                            Detalle de productos comprados:
                          </p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="border-b border-[#EADBCE]/60 text-[10px] font-bold text-[#8D6B57] uppercase">
                                  <th className="py-2 px-3">Producto</th>
                                  <th className="py-2 px-3">Categoría</th>
                                  <th className="py-2 px-3 text-center">Cant.</th>
                                  <th className="py-2 px-3 text-right">Precio Unit.</th>
                                  <th className="py-2 px-3 text-right">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#EADBCE]/40 bg-white rounded-xl">
                                {compra.items.map((it: CompraHistorialItem, idx: number) => (
                                  <tr key={idx} className="hover:bg-[#FAF5F0]/50 transition-colors">
                                    <td className="py-2.5 px-3 font-bold text-[#2D1C14]">{it.nombre}</td>
                                    <td className="py-2.5 px-3 text-[#8D6B57]">{it.categoria || 'General'}</td>
                                    <td className="py-2.5 px-3 text-center font-bold text-[#2D1C14]">{it.cantidad}</td>
                                    <td className="py-2.5 px-3 text-right text-[#6F4A39]">${Number(it.precio_unitario).toLocaleString('es-CO')}</td>
                                    <td className="py-2.5 px-3 text-right font-extrabold text-[#2D1C14]">${Number(it.subtotal).toLocaleString('es-CO')}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Modal para Guardar Compra Realizada */}
      {modalGuardarCompra && (
        <Modal
          isOpen={modalGuardarCompra}
          onClose={() => setModalGuardarCompra(false)}
          title="💾 Guardar Compra Realizada"
        >
          <form onSubmit={guardarCompraRealizada} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-[#8D6B57] uppercase tracking-wider block mb-1">
                Nombre o Establecimiento de la Compra
              </label>
              <input
                type="text"
                placeholder="Ej. Éxito, Olímpica, Carulla, D1 o Compra del Mes..."
                value={nombreNuevaCompra}
                onChange={(e) => setNombreNuevaCompra(e.target.value)}
                className="w-full p-2.5 border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 focus:bg-white focus:border-[#2D1C14] text-[#2D1C14] font-bold outline-none text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-[#8D6B57] uppercase tracking-wider block mb-1">
                  Fecha de la compra
                </label>
                <input
                  type="date"
                  value={fechaNuevaCompra}
                  onChange={(e) => setFechaNuevaCompra(e.target.value)}
                  className="w-full p-2.5 border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 focus:bg-white focus:border-[#2D1C14] text-[#2D1C14] font-bold outline-none text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#8D6B57] uppercase tracking-wider block mb-1">
                  Productos a Guardar
                </label>
                <select
                  value={guardarSoloComprados ? 'solo_listos' : 'todos'}
                  onChange={(e) => setGuardarSoloComprados(e.target.value === 'solo_listos')}
                  className="w-full p-2.5 border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 text-[#2D1C14] font-bold outline-none text-xs"
                >
                  <option value="todos">Todos los productos ({mercadoLista.length})</option>
                  <option value="solo_listos">Solo los marcados ✔ ({mercadoLista.filter(i => i.comprado).length})</option>
                </select>
              </div>
            </div>

            {/* Resumen del Monto a Registrar */}
            <div className="bg-[#FAF5F0] p-4 rounded-2xl border border-[#EADBCE] space-y-1.5 text-xs">
              <div className="flex justify-between text-[#8D6B57]">
                <span>Artículos incluidos:</span>
                <strong className="text-[#2D1C14]">
                  {guardarSoloComprados ? mercadoLista.filter(i => i.comprado).length : mercadoLista.length} productos
                </strong>
              </div>
              <div className="flex justify-between items-center text-sm pt-1 border-t border-[#EADBCE]/60">
                <span className="font-bold text-[#2D1C14]">Total a Registrar:</span>
                <span className="font-extrabold text-xl text-[#2D1C14]">
                  ${Math.round(
                    (guardarSoloComprados ? mercadoLista.filter(i => i.comprado) : mercadoLista).reduce(
                      (sum, item) => sum + ((item.cantidad * item.precio_unitario) * (1 - ((item.descuento_porcentaje || 0) / 100))),
                      0
                    )
                  ).toLocaleString('es-CO')}
                </span>
              </div>
            </div>

            {/* Opciones Adicionales */}
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#2D1C14]">
                <input
                  type="checkbox"
                  checked={registrarEnFinanzas}
                  onChange={(e) => setRegistrarEnFinanzas(e.target.checked)}
                  className="w-4 h-4 rounded text-[#2D1C14] border-[#EADBCE] focus:ring-[#2D1C14]"
                />
                <span>Registrar también en Gastos / Finanzas (Categoría Supermercado)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#2D1C14]">
                <input
                  type="checkbox"
                  checked={vaciarListaTrasGuardar}
                  onChange={(e) => setVaciarListaTrasGuardar(e.target.checked)}
                  className="w-4 h-4 rounded text-[#2D1C14] border-[#EADBCE] focus:ring-[#2D1C14]"
                />
                <span>Vaciar los productos guardados de la compra actual para iniciar una nueva</span>
              </label>
            </div>

            <div className="pt-3 flex gap-3">
              <button
                type="button"
                onClick={() => setModalGuardarCompra(false)}
                className="w-1/2 p-3 rounded-xl border border-[#EADBCE] text-[#6F4A39] font-bold hover:bg-[#FAF5F0] text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoCompra}
                className="w-1/2 p-3 rounded-xl bg-[#2D1C14] hover:bg-[#3E271D] text-white font-bold shadow-xs text-sm disabled:opacity-50"
              >
                {guardandoCompra ? 'Guardando...' : 'Confirmar y Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal para Editar Producto de la Compra Actual */}
      {itemAEditar && (
        <Modal
          isOpen={Boolean(itemAEditar)}
          onClose={() => setItemAEditar(null)}
          title="Editar Producto en Compra Actual"
        >
          <form onSubmit={guardarEdicionItem} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-[#8D6B57] uppercase tracking-wider block mb-1">
                Nombre del producto
              </label>
              <input
                type="text"
                value={editItemNombre}
                onChange={(e) => setEditItemNombre(e.target.value)}
                className="w-full p-2.5 border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 focus:bg-white focus:border-[#2D1C14] text-[#2D1C14] outline-none font-bold text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-[#8D6B57] uppercase tracking-wider block mb-1">
                  Valor / Precio Unitario ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-[#8D6B57] font-bold text-xs">$</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={editItemPrecio}
                    onChange={(e) => setEditItemPrecio(e.target.value)}
                    className="w-full p-2.5 pl-6 border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 focus:bg-white focus:border-[#2D1C14] text-[#2D1C14] outline-none font-bold text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#8D6B57] uppercase tracking-wider block mb-1">
                  Cantidad
                </label>
                <input
                  type="number"
                  min="1"
                  value={editItemCantidad}
                  onChange={(e) => setEditItemCantidad(e.target.value)}
                  className="w-full p-2.5 border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 focus:bg-white focus:border-[#2D1C14] text-[#2D1C14] outline-none font-bold text-xs"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#8D6B57] uppercase tracking-wider block mb-1">
                Descuento (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editItemDescuento}
                  onChange={(e) => setEditItemDescuento(e.target.value)}
                  className="w-full p-2.5 border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 focus:bg-white focus:border-[#2D1C14] text-[#2D1C14] outline-none font-bold text-xs"
                />
                <span className="absolute right-3 top-2.5 text-[#8D6B57] font-bold text-xs">%</span>
              </div>
            </div>

            <div className="bg-[#FAF5F0] p-3 rounded-2xl border border-[#EADBCE] flex justify-between items-center text-xs">
              <span className="font-bold text-[#8D6B57]">Subtotal calculado:</span>
              <span className="font-extrabold text-[#2D1C14] text-base">
                ${Math.round(
                  (Math.max(0, Number(editItemPrecio) || 0) * Math.max(1, Number(editItemCantidad) || 1)) *
                  (1 - (Math.min(100, Math.max(0, Number(editItemDescuento) || 0)) / 100))
                ).toLocaleString('es-CO')}
              </span>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setItemAEditar(null)}
                className="w-1/2 p-3 rounded-xl border border-[#EADBCE] text-[#6F4A39] font-bold hover:bg-[#FAF5F0] text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="w-1/2 p-3 rounded-xl bg-[#2D1C14] hover:bg-[#3E271D] text-white font-bold shadow-xs text-sm"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal para Editar Producto del Catálogo */}
      {prodAEditar && (
        <Modal
          isOpen={Boolean(prodAEditar)}
          onClose={() => setProdAEditar(null)}
          title="Editar Producto del Catálogo"
        >
          <form onSubmit={guardarEdicionProductoCatalogo} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-[#8D6B57] uppercase tracking-wider block mb-1">
                Nombre del producto
              </label>
              <input
                type="text"
                value={editProdNombre}
                onChange={(e) => setEditProdNombre(e.target.value)}
                className="w-full p-2.5 border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 focus:bg-white focus:border-[#2D1C14] text-[#2D1C14] outline-none font-bold text-xs"
                required
              />
            </div>

            <div className="flex gap-2">
              <div className="relative w-1/2">
                <label className="text-[10px] font-bold text-[#8D6B57] uppercase tracking-wider block mb-1">
                  Precio de referencia
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-[#8D6B57] font-bold text-xs">$</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={editProdPrecio}
                    onChange={(e) => setEditProdPrecio(e.target.value)}
                    className="w-full p-2.5 pl-6 border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 focus:bg-white focus:border-[#2D1C14] text-[#2D1C14] outline-none font-bold text-xs"
                    required
                  />
                </div>
              </div>

              <div className="w-1/2">
                <label className="text-[10px] font-bold text-[#8D6B57] uppercase tracking-wider block mb-1">
                  Unidad
                </label>
                <select
                  value={editProdUnidad}
                  onChange={(e) => setEditProdUnidad(e.target.value)}
                  className="w-full p-2.5 border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 text-[#2D1C14] font-bold outline-none text-xs"
                >
                  <option value="und">Unidad</option>
                  <option value="lb">Libras (lb)</option>
                  <option value="kg">Kilos (kg)</option>
                  <option value="pack">Bandeja/Pack</option>
                  <option value="lt">Litros (L)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#8D6B57] uppercase tracking-wider block mb-1.5">
                Tipo de producto / Categoría
              </label>
              <select
                value={editProdCat}
                onChange={(e) => {
                  setEditProdCat(e.target.value);
                  if (e.target.value !== 'Otro') {
                    setEditProdCatPersonalizada('');
                  }
                }}
                className="w-full p-2.5 border border-[#EADBCE] rounded-xl bg-[#FAF5F0]/50 focus:bg-white focus:border-[#2D1C14] text-[#2D1C14] font-bold outline-none text-xs"
              >
                {categoriasSugeridas.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>

              {editProdCat === 'Otro' && (
                <input
                  type="text"
                  placeholder="Categoría personalizada..."
                  value={editProdCatPersonalizada}
                  onChange={(e) => setEditProdCatPersonalizada(e.target.value)}
                  className="w-full mt-2 p-2.5 border border-[#EADBCE] rounded-xl bg-white focus:border-[#2D1C14] text-[#2D1C14] font-bold outline-none text-xs"
                  required
                />
              )}
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setProdAEditar(null)}
                className="w-1/2 p-3 rounded-xl border border-[#EADBCE] text-[#6F4A39] font-bold hover:bg-[#FAF5F0] text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoEdicionProd}
                className="w-1/2 p-3 rounded-xl bg-[#2D1C14] hover:bg-[#3E271D] text-white font-bold shadow-xs text-sm disabled:opacity-50"
              >
                {guardandoEdicionProd ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal para Confirmar Eliminación de Producto del Catálogo */}
      {prodAEliminar && (
        <Modal
          isOpen={Boolean(prodAEliminar)}
          onClose={() => setProdAEliminar(null)}
          title="Eliminar de Productos Frecuentes"
        >
          <div className="space-y-4">
            <p className="text-sm text-[#6F4A39]">
              ¿Estás seguro de que deseas eliminar <strong className="text-[#2D1C14]">{prodAEliminar.nombre}</strong> del catálogo de productos frecuentes?
            </p>
            <div className="pt-2 flex gap-3">
              <button 
                type="button" 
                onClick={() => setProdAEliminar(null)} 
                className="w-1/2 p-3 rounded-xl border border-[#EADBCE] text-[#6F4A39] font-bold hover:bg-[#FAF5F0] text-sm"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={() => eliminarProductoCatalogo(prodAEliminar.id)} 
                className="w-1/2 p-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs text-sm"
              >
                Eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal para Confirmar Vaciado de Lista de Compras */}
      {modalVaciar && (
        <Modal
          isOpen={modalVaciar}
          onClose={() => setModalVaciar(false)}
          title="Vaciar Lista de Compras"
        >
          <div className="space-y-4">
            <p className="text-sm text-[#6F4A39]">
              ¿Estás seguro de que deseas vaciar todos los artículos de tu lista actual de compras?
            </p>
            <p className="text-xs text-[#8D6B57] bg-[#FAF5F0] p-3 rounded-xl border border-[#EADBCE]">
              Los productos guardados en tu catálogo frecuente y las compras guardadas en el historial se mantendrán intactos.
            </p>
            <div className="pt-2 flex gap-3">
              <button 
                type="button" 
                onClick={() => setModalVaciar(false)} 
                className="w-1/2 p-3 rounded-xl border border-[#EADBCE] text-[#6F4A39] font-bold hover:bg-[#FAF5F0] text-sm"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setModalVaciar(false);
                  onLimpiarCarrito();
                }} 
                className="w-1/2 p-3 rounded-xl bg-[#2D1C14] hover:bg-[#3E271D] text-white font-bold shadow-xs text-sm"
              >
                Sí, Vaciar Lista
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
