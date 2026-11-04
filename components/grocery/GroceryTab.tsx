import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/ui/Modal';
import type { MercadoProducto, MercadoItem, UserSession } from '@/types';

interface GroceryTabProps {
  mercadoCatalogo: MercadoProducto[];
  mercadoLista: MercadoItem[];
  presupuestoMercado: number;
  setPresupuestoMercado: (val: number) => void;
  sesion: UserSession;
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
  onMercadoActualizado,
  onAgregarAlCarrito,
  onActualizarItem,
  onEliminarItem,
  onLimpiarCarrito
}: GroceryTabProps) {
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

  // Filtros de lista de compra
  const [filtroLista, setFiltroLista] = useState<'todos' | 'pendientes' | 'carrito'>('todos');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);

  // Modal para confirmar vaciado de lista
  const [modalVaciar, setModalVaciar] = useState(false);

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

  // Filtrado de catálogo
  const catalogoFiltrado = mercadoCatalogo.filter(p => 
    p.nombre.toLowerCase().includes(busquedaCatalogo.toLowerCase()) || 
    (p.categoria && p.categoria.toLowerCase().includes(busquedaCatalogo.toLowerCase()))
  );

  // Filtrado de lista de compras
  const listaFiltrada = mercadoLista.filter(item => {
    if (filtroLista === 'pendientes' && item.comprado) return false;
    if (filtroLista === 'carrito' && !item.comprado) return false;
    if (categoriaFiltro && (item.categoria || 'General') !== categoriaFiltro) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-6">
      
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

        {/* Columna Derecha: Tabla Interactiva de Compra Actual con Edición de Valor */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-3xl shadow-[0_2px_16px_rgba(45,28,20,0.03)] border border-[#EADBCE]/80 min-h-[580px] flex flex-col justify-between">
            <div>
              {/* Encabezado y Filtros de la Lista */}
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

                            {/* Campo Editable: Valor / Precio del producto agregado */}
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

            {/* Pie de Tabla con Resumen de Compra */}
            {mercadoLista.length > 0 && (
              <div className="mt-6 pt-3 border-t border-[#EADBCE]/60 flex flex-col sm:flex-row justify-between items-center gap-2 bg-[#FAF5F0] p-3.5 rounded-2xl text-xs">
                <span className="font-semibold text-[#6F4A39]">
                  Progreso: <strong className="text-[#2D1C14] font-bold">{mercadoLista.filter(i => i.comprado).length} de {mercadoLista.length} listos</strong>
                </span>
                <div className="flex items-center gap-2">
                  <span className="uppercase font-bold text-[#8D6B57] text-[10px]">Total Proyectado:</span>
                  <span className="text-lg font-extrabold text-[#2D1C14]">${totalProyectado.toLocaleString('es-CO')}</span>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

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
              Los productos guardados en tu catálogo frecuente se mantendrán intactos para futuras compras.
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
