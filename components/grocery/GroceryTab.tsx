import React, { useState } from 'react';
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
  // Catálogo nuevo
  const [catNombre, setCatNombre] = useState('');
  const [catPrecio, setCatPrecio] = useState('');
  const [catUnidad, setCatUnidad] = useState('und');
  const [catCat, setCatCat] = useState('Abarrotes');
  const [guardandoProd, setGuardandoProd] = useState(false);

  // Buscador de catálogo
  const [busquedaCatalogo, setBusquedaCatalogo] = useState('');
  // Producto de catálogo a eliminar
  const [prodAEliminar, setProdAEliminar] = useState<MercadoProducto | null>(null);

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
    const { error } = await supabase.from('mercado_catalogo').insert([{ 
      nombre: catNombre, 
      categoria: catCat || 'General', 
      precio_referencia: Number(catPrecio), 
      unidad: catUnidad, 
      user_id: sesion.user.id 
    }]);

    setGuardandoProd(false);
    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      setCatNombre('');
      setCatPrecio('');
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
      
      {/* Métricas Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Límite Presupuesto */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Límite Presupuesto</span>
            {presupuestoMercado > 0 && (
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${presupuestoExcedido ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {presupuestoExcedido ? `Excedido -$${Math.abs(saldoPresupuesto).toLocaleString('es-CO')}` : `Disponible $${saldoPresupuesto.toLocaleString('es-CO')}`}
              </span>
            )}
          </div>
          <div className="flex items-center mt-2">
            <span className="text-2xl font-black text-gray-300 mr-2">$</span>
            <input 
              type="number" 
              value={presupuestoMercado || ''} 
              onChange={(e) => setPresupuestoMercado(Number(e.target.value))} 
              className="text-3xl font-black text-slate-900 bg-transparent outline-none w-full border-b-2 border-dashed border-gray-200 focus:border-blue-500 transition-all" 
              placeholder="0" 
            />
          </div>
          {presupuestoMercado > 0 && (
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-3">
              <div 
                className={`h-full transition-all duration-500 ${presupuestoExcedido ? 'bg-red-500' : 'bg-emerald-500'}`} 
                style={{ width: `${Math.min(100, porcentajePresupuesto)}%` }}
              ></div>
            </div>
          )}
        </div>

        {/* Total Proyectado */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl shadow-lg text-white flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Proyectado</span>
          <p className="text-3xl md:text-4xl font-black mt-2 tracking-tight">${totalProyectado.toLocaleString('es-CO')}</p>
          <span className="text-xs text-slate-400 mt-2 font-medium">{mercadoLista.length} artículos en lista</span>
        </div>

        {/* En Carrito */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-3xl shadow-lg text-white flex flex-col justify-between">
          <span className="text-xs font-bold text-emerald-100 uppercase tracking-widest">En Carrito ✔️</span>
          <p className="text-3xl md:text-4xl font-black mt-2 tracking-tight">${totalCarrito.toLocaleString('es-CO')}</p>
          <span className="text-xs text-emerald-100 mt-2 font-medium">{mercadoLista.filter(i => i.comprado).length} de {mercadoLista.length} recogidos</span>
        </div>

        {/* Falta por recoger */}
        <div className="bg-gradient-to-br from-amber-400 to-amber-500 p-6 rounded-3xl shadow-lg text-white flex flex-col justify-between">
          <span className="text-xs font-bold text-amber-100 uppercase tracking-widest">Falta por Recoger</span>
          <p className="text-3xl md:text-4xl font-black mt-2 tracking-tight">${pendientes.toLocaleString('es-CO')}</p>
          <span className="text-xs text-amber-100 mt-2 font-medium">{mercadoLista.filter(i => !i.comprado).length} pendientes</span>
        </div>
      </div>

      {/* Resumen por Categorías con filtro interactivo */}
      {Object.keys(resumenCategoriasMercado).length > 0 && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Resumen de Inversión por Categoría</h3>
            {categoriaFiltro && (
              <button 
                onClick={() => setCategoriaFiltro(null)}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                ✕ Ver todas
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2.5">
            {Object.entries(resumenCategoriasMercado).map(([cat, total]) => (
              <button 
                key={cat} 
                onClick={() => setCategoriaFiltro(categoriaFiltro === cat ? null : cat)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all active:scale-95 text-xs ${
                  categoriaFiltro === cat 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                    : 'bg-gray-50 text-slate-700 border-gray-100 hover:border-gray-300'
                }`}
              >
                <span className="font-bold">{cat}</span>
                <span className={`font-black ${categoriaFiltro === cat ? 'text-blue-300' : 'text-blue-600'}`}>${Number(total).toLocaleString('es-CO')}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sección Principal: Catálogo y Lista Activa */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Izquierda: Formulario y Catálogo Frecuente */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* Formulario Agregar Producto al Catálogo */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-black text-slate-800 mb-5">📚 Agregar al Catálogo</h3>
            <form onSubmit={crearProductoCatalogo} className="space-y-4">
              <input 
                type="text" 
                placeholder="Nombre del producto..." 
                value={catNombre} 
                onChange={(e) => setCatNombre(e.target.value)} 
                className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold" 
                required 
              />
              <div className="flex gap-2">
                <div className="relative w-1/2">
                  <span className="absolute left-3 top-3 text-gray-400 font-bold">$</span>
                  <input 
                    type="number" 
                    placeholder="Precio" 
                    value={catPrecio} 
                    onChange={(e) => setCatPrecio(e.target.value)} 
                    className="w-full p-3 pl-7 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold" 
                    required 
                  />
                </div>
                <select 
                  value={catUnidad} 
                  onChange={(e) => setCatUnidad(e.target.value)} 
                  className="w-1/2 p-3 border border-gray-200 rounded-xl bg-gray-50 font-bold outline-none"
                >
                  <option value="und">Unidad</option>
                  <option value="lb">Libras (lb)</option>
                  <option value="kg">Kilos (kg)</option>
                  <option value="pack">Bandeja/Pack</option>
                  <option value="lt">Litros (L)</option>
                </select>
              </div>
              <input 
                type="text" 
                placeholder="Categoría (ej. Frutas, Carnes, Abarrotes)" 
                value={catCat} 
                onChange={(e) => setCatCat(e.target.value)} 
                className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" 
              />
              <button 
                type="submit" 
                disabled={guardandoProd}
                className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl active:scale-95 transition-all shadow-md disabled:opacity-50"
              >
                {guardandoProd ? 'Guardando...' : 'Guardar en Catálogo'}
              </button>
            </form>
          </div>

          {/* Lista de Catálogo Frecuente con Buscador */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col max-h-[500px]">
            <div className="sticky top-0 bg-white pb-3 border-b border-gray-100 z-10 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-800">Productos Frecuentes</h3>
                <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
                  {mercadoCatalogo.length}
                </span>
              </div>
              <input 
                type="text" 
                placeholder="Buscar en catálogo..." 
                value={busquedaCatalogo} 
                onChange={(e) => setBusquedaCatalogo(e.target.value)} 
                className="w-full p-2.5 text-xs border border-gray-200 rounded-xl bg-gray-50 focus:bg-white outline-none"
              />
            </div>

            <ul className="space-y-3 overflow-y-auto pt-3 flex-grow">
              {catalogoFiltrado.length === 0 && (
                <p className="text-sm font-medium text-gray-400 p-6 border-2 border-dashed border-gray-100 rounded-xl text-center">
                  No hay productos en catálogo.
                </p>
              )}
              {catalogoFiltrado.map(prod => (
                <li key={prod.id} className="flex justify-between items-center p-3.5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-blue-300 hover:shadow-xs transition-all group">
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="font-bold text-slate-800 text-sm truncate">{prod.nombre}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-black text-slate-600">${Number(prod.precio_referencia).toLocaleString('es-CO')} / {prod.unidad}</span>
                      {prod.categoria && (
                        <span className="text-[9px] font-bold text-gray-400 bg-gray-200/60 px-1.5 py-0.5 rounded">
                          {prod.categoria}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={() => setProdAEliminar(prod)}
                      className="w-8 h-8 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors text-xs active:scale-90"
                      title="Eliminar de catálogo"
                    >
                      🗑️
                    </button>
                    <button 
                      onClick={() => onAgregarAlCarrito(prod)} 
                      className="bg-white border-2 border-gray-200 text-slate-800 w-9 h-9 rounded-full font-black text-lg group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white active:scale-90 transition-all shadow-xs flex items-center justify-center"
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
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 min-h-[600px] flex flex-col justify-between">
            <div>
              {/* Encabezado y Filtros de la Lista */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <span>🛒</span> Compra Actual
                  </h3>
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl">
                    {listaFiltrada.length} ítems
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200 text-xs font-bold">
                    <button
                      onClick={() => setFiltroLista('todos')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${filtroLista === 'todos' ? 'bg-slate-900 text-white' : 'text-gray-500 hover:text-slate-800'}`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setFiltroLista('pendientes')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${filtroLista === 'pendientes' ? 'bg-amber-500 text-white' : 'text-gray-500 hover:text-amber-600'}`}
                    >
                      Pendientes
                    </button>
                    <button
                      onClick={() => setFiltroLista('carrito')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${filtroLista === 'carrito' ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:text-emerald-600'}`}
                    >
                      En Carrito
                    </button>
                  </div>

                  {mercadoLista.length > 0 && (
                    <button 
                      onClick={() => setModalVaciar(true)} 
                      className="text-xs font-bold text-red-500 bg-red-50 hover:bg-red-500 hover:text-white px-3.5 py-2 rounded-xl transition-all active:scale-95 shadow-xs"
                    >
                      🗑️ Vaciar
                    </button>
                  )}
                </div>
              </div>
              
              {/* Tabla de Artículos */}
              {listaFiltrada.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-80 text-gray-400 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                   <span className="text-6xl mb-4 opacity-50">🛍️</span>
                   <p className="font-bold text-lg text-gray-600">No hay productos en esta vista.</p>
                   <p className="text-sm">Agrega productos desde tu catálogo a la izquierda.</p>
                 </div>
              ) : (
                <div className="overflow-x-auto scrollbar-hide">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-100 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                        <th className="p-3 w-10 text-center">Listo</th>
                        <th className="p-3">Producto</th>
                        <th className="p-3 text-center w-24">Cant.</th>
                        <th className="p-3 text-center w-24">Dcto (%)</th>
                        <th className="p-3 text-right">Subtotal</th>
                        <th className="p-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {listaFiltrada.map(item => {
                        const finalPrice = (item.cantidad * item.precio_unitario) - ((item.cantidad * item.precio_unitario) * ((item.descuento_porcentaje || 0) / 100));
                        return (
                          <tr key={item.id} className={`border-b border-gray-50 transition-all hover:bg-gray-50/60 ${item.comprado ? 'opacity-60 bg-green-50/20' : ''}`}>
                            <td className="p-3 text-center">
                              <div className="relative flex items-center justify-center">
                                <input 
                                  type="checkbox" 
                                  checked={item.comprado} 
                                  onChange={(e) => onActualizarItem(item.id, 'comprado', e.target.checked)} 
                                  className="peer appearance-none w-7 h-7 border-2 border-gray-300 rounded-lg checked:bg-emerald-500 checked:border-emerald-500 cursor-pointer transition-all" 
                                />
                                <span className="absolute text-white font-bold text-sm pointer-events-none opacity-0 peer-checked:opacity-100">✓</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`font-black text-base block ${item.comprado ? 'text-gray-400 line-through' : 'text-slate-800'}`}>
                                {item.producto_nombre}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 font-medium">
                                <span>${Number(item.precio_unitario).toLocaleString('es-CO')} c/u</span>
                                {item.categoria && <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">{item.categoria}</span>}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <input 
                                type="number" 
                                min="1" 
                                value={item.cantidad} 
                                onChange={(e) => onActualizarItem(item.id, 'cantidad', Math.max(1, Number(e.target.value)))} 
                                className="w-16 p-2 border-2 border-gray-200 rounded-xl text-center text-sm font-bold text-slate-800 bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all" 
                                disabled={item.comprado} 
                              />
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center border-2 border-gray-200 rounded-xl bg-gray-50 overflow-hidden w-20 focus-within:border-blue-500 focus-within:bg-white transition-all mx-auto">
                                <input 
                                  type="number" 
                                  min="0" 
                                  max="100" 
                                  value={item.descuento_porcentaje} 
                                  onChange={(e) => onActualizarItem(item.id, 'descuento_porcentaje', Math.min(100, Math.max(0, Number(e.target.value))))} 
                                  className="w-full p-2 text-center text-sm font-bold text-blue-600 bg-transparent outline-none" 
                                  disabled={item.comprado} 
                                />
                                <span className="pr-2 text-gray-400 font-black text-xs">%</span>
                              </div>
                            </td>
                            <td className="p-3 text-right font-black text-slate-800 text-base">
                              ${Math.round(finalPrice).toLocaleString('es-CO')}
                            </td>
                            <td className="p-3 text-center">
                              <button 
                                onClick={() => onEliminarItem(item.id)} 
                                className="w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white active:scale-90 transition-all flex items-center justify-center" 
                                title="Quitar de lista"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
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

            {/* Pie de Tabla con Resumen de Compra */}
            {mercadoLista.length > 0 && (
              <div className="mt-8 pt-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50 p-4 rounded-2xl">
                <span className="text-sm font-bold text-slate-600">
                  Progreso de compra: <strong className="text-emerald-600 font-black">{mercadoLista.filter(i => i.comprado).length} de {mercadoLista.length} productos recogidos</strong>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-bold text-gray-400">Total Proyectado:</span>
                  <span className="text-xl font-black text-slate-900">${totalProyectado.toLocaleString('es-CO')}</span>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Modal para Confirmar Eliminación de Producto del Catálogo */}
      {prodAEliminar && (
        <Modal
          isOpen={Boolean(prodAEliminar)}
          onClose={() => setProdAEliminar(null)}
          title="Eliminar de Productos Frecuentes"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ¿Estás seguro de que deseas eliminar <strong className="text-slate-800">{prodAEliminar.nombre}</strong> del catálogo de productos frecuentes?
            </p>
            <div className="pt-2 flex gap-3">
              <button 
                type="button" 
                onClick={() => setProdAEliminar(null)} 
                className="w-1/2 p-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={() => eliminarProductoCatalogo(prodAEliminar.id)} 
                className="w-1/2 p-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md"
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
            <p className="text-sm text-gray-600">
              ¿Estás seguro de que deseas vaciar todos los artículos de tu lista actual de compras?
            </p>
            <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
              Los productos guardados en tu catálogo frecuente se mantendrán intactos para futuras compras.
            </p>
            <div className="pt-2 flex gap-3">
              <button 
                type="button" 
                onClick={() => setModalVaciar(false)} 
                className="w-1/2 p-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setModalVaciar(false);
                  onLimpiarCarrito();
                }} 
                className="w-1/2 p-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md"
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
