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
      
      {/* Métricas Principales en Grises y Blanco */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Límite Presupuesto */}
        <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Límite Presupuesto</span>
            {presupuestoMercado > 0 && (
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${presupuestoExcedido ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-zinc-100 text-zinc-700 border border-zinc-200'}`}>
                {presupuestoExcedido ? `Excedido -$${Math.abs(saldoPresupuesto).toLocaleString('es-CO')}` : `Disponible $${saldoPresupuesto.toLocaleString('es-CO')}`}
              </span>
            )}
          </div>
          <div className="flex items-center mt-2">
            <span className="text-2xl font-bold text-zinc-300 mr-2">$</span>
            <input 
              type="number" 
              value={presupuestoMercado || ''} 
              onChange={(e) => setPresupuestoMercado(Number(e.target.value))} 
              className="text-3xl font-extrabold text-zinc-900 bg-transparent outline-none w-full border-b border-dashed border-zinc-200 focus:border-zinc-900 transition-all" 
              placeholder="0" 
            />
          </div>
          {presupuestoMercado > 0 && (
            <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden mt-3">
              <div 
                className={`h-full transition-all duration-500 ${presupuestoExcedido ? 'bg-rose-600' : 'bg-zinc-900'}`} 
                style={{ width: `${Math.min(100, porcentajePresupuesto)}%` }}
              ></div>
            </div>
          )}
        </div>

        {/* Total Proyectado */}
        <div className="bg-zinc-900 p-6 rounded-3xl shadow-sm text-white flex flex-col justify-between">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Proyectado</span>
          <p className="text-3xl font-extrabold mt-2 tracking-tight">${totalProyectado.toLocaleString('es-CO')}</p>
          <span className="text-xs text-zinc-400 mt-2 font-medium">{mercadoLista.length} artículos en lista</span>
        </div>

        {/* En Carrito */}
        <div className="bg-zinc-800 p-6 rounded-3xl shadow-sm text-white flex flex-col justify-between">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">En Carrito ✔</span>
          <p className="text-3xl font-extrabold mt-2 tracking-tight">${totalCarrito.toLocaleString('es-CO')}</p>
          <span className="text-xs text-zinc-400 mt-2 font-medium">{mercadoLista.filter(i => i.comprado).length} de {mercadoLista.length} listos</span>
        </div>

        {/* Falta por recoger */}
        <div className="bg-zinc-700 p-6 rounded-3xl shadow-sm text-white flex flex-col justify-between">
          <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Falta por Recoger</span>
          <p className="text-3xl font-extrabold mt-2 tracking-tight">${pendientes.toLocaleString('es-CO')}</p>
          <span className="text-xs text-zinc-300 mt-2 font-medium">{mercadoLista.filter(i => !i.comprado).length} pendientes</span>
        </div>
      </div>

      {/* Resumen por Categorías con filtro interactivo */}
      {Object.keys(resumenCategoriasMercado).length > 0 && (
        <div className="bg-white p-5 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-zinc-200/80">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Resumen por Categoría</h3>
            {categoriaFiltro && (
              <button 
                onClick={() => setCategoriaFiltro(null)}
                className="text-xs font-bold text-zinc-900 hover:underline"
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
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-2xs' 
                    : 'bg-zinc-50 text-zinc-700 border-zinc-200/60 hover:border-zinc-300'
                }`}
              >
                <span className="font-semibold">{cat}</span>
                <span className={`font-bold ${categoriaFiltro === cat ? 'text-zinc-300' : 'text-zinc-900'}`}>${Number(total).toLocaleString('es-CO')}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sección Principal: Catálogo y Lista Activa */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna Izquierda: Formulario y Catálogo Frecuente */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* Formulario Agregar Producto al Catálogo */}
          <div className="bg-white p-6 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-zinc-200/80">
            <h3 className="text-base font-bold text-zinc-900 mb-4">📚 Agregar al Catálogo</h3>
            <form onSubmit={crearProductoCatalogo} className="space-y-3">
              <input 
                type="text" 
                placeholder="Nombre del producto..." 
                value={catNombre} 
                onChange={(e) => setCatNombre(e.target.value)} 
                className="w-full p-2.5 border border-zinc-200 rounded-xl bg-zinc-50 focus:bg-white focus:border-zinc-900 outline-none font-bold text-xs" 
                required 
              />
              <div className="flex gap-2">
                <div className="relative w-1/2">
                  <span className="absolute left-3 top-2.5 text-zinc-400 font-bold text-xs">$</span>
                  <input 
                    type="number" 
                    placeholder="Precio" 
                    value={catPrecio} 
                    onChange={(e) => setCatPrecio(e.target.value)} 
                    className="w-full p-2.5 pl-6 border border-zinc-200 rounded-xl bg-zinc-50 focus:bg-white focus:border-zinc-900 outline-none font-bold text-xs" 
                    required 
                  />
                </div>
                <select 
                  value={catUnidad} 
                  onChange={(e) => setCatUnidad(e.target.value)} 
                  className="w-1/2 p-2.5 border border-zinc-200 rounded-xl bg-zinc-50 font-bold outline-none text-xs"
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
                placeholder="Categoría (ej. Frutas, Carnes)" 
                value={catCat} 
                onChange={(e) => setCatCat(e.target.value)} 
                className="w-full p-2.5 border border-zinc-200 rounded-xl bg-zinc-50 focus:bg-white focus:border-zinc-900 outline-none text-xs" 
              />
              <button 
                type="submit" 
                disabled={guardandoProd}
                className="w-full bg-zinc-900 text-white font-bold py-2.5 rounded-xl active:scale-95 transition-all shadow-xs disabled:opacity-50 text-xs"
              >
                {guardandoProd ? 'Guardando...' : 'Guardar en Catálogo'}
              </button>
            </form>
          </div>

          {/* Lista de Catálogo Frecuente con Buscador */}
          <div className="bg-white p-6 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-zinc-200/80 flex flex-col max-h-[480px]">
            <div className="sticky top-0 bg-white pb-3 border-b border-zinc-100 z-10 space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-zinc-900">Productos Frecuentes</h3>
                <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-md">
                  {mercadoCatalogo.length}
                </span>
              </div>
              <input 
                type="text" 
                placeholder="Buscar en catálogo..." 
                value={busquedaCatalogo} 
                onChange={(e) => setBusquedaCatalogo(e.target.value)} 
                className="w-full p-2 text-xs border border-zinc-200 rounded-xl bg-zinc-50 focus:bg-white outline-none"
              />
            </div>

            <ul className="space-y-2.5 overflow-y-auto pt-2.5 flex-grow pr-1">
              {catalogoFiltrado.length === 0 && (
                <p className="text-xs font-medium text-zinc-400 p-6 border border-dashed border-zinc-200 rounded-xl text-center">
                  No hay productos en catálogo.
                </p>
              )}
              {catalogoFiltrado.map(prod => (
                <li key={prod.id} className="flex justify-between items-center p-3 bg-zinc-50 rounded-2xl border border-zinc-200/60 hover:border-zinc-300 transition-all group">
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="font-bold text-zinc-900 text-xs truncate">{prod.nombre}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] font-bold text-zinc-600">${Number(prod.precio_referencia).toLocaleString('es-CO')} / {prod.unidad}</span>
                      {prod.categoria && (
                        <span className="text-[9px] font-medium text-zinc-400 bg-zinc-200/60 px-1 py-0.5 rounded">
                          {prod.categoria}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={() => setProdAEliminar(prod)}
                      className="w-7 h-7 rounded-full text-zinc-300 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors text-xs active:scale-90"
                      title="Eliminar de catálogo"
                    >
                      🗑️
                    </button>
                    <button 
                      onClick={() => onAgregarAlCarrito(prod)} 
                      className="bg-white border border-zinc-200 text-zinc-900 w-7 h-7 rounded-full font-extrabold text-sm hover:bg-zinc-900 hover:border-zinc-900 hover:text-white active:scale-90 transition-all shadow-2xs flex items-center justify-center"
                      title="Agregar a compra"
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
          <div className="bg-white p-6 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-zinc-200/80 min-h-[580px] flex flex-col justify-between">
            <div>
              {/* Encabezado y Filtros de la Lista */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                    <span>🛒</span> Compra Actual
                  </h3>
                  <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-lg">
                    {listaFiltrada.length}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex bg-zinc-100 p-1 rounded-xl text-xs font-bold">
                    <button
                      onClick={() => setFiltroLista('todos')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${filtroLista === 'todos' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'}`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setFiltroLista('pendientes')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${filtroLista === 'pendientes' ? 'bg-white text-zinc-900 shadow-xs font-bold' : 'text-zinc-500 hover:text-zinc-800'}`}
                    >
                      Pendientes
                    </button>
                    <button
                      onClick={() => setFiltroLista('carrito')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${filtroLista === 'carrito' ? 'bg-white text-zinc-900 shadow-xs font-bold' : 'text-zinc-500 hover:text-zinc-800'}`}
                    >
                      En Carrito
                    </button>
                  </div>

                  {mercadoLista.length > 0 && (
                    <button 
                      onClick={() => setModalVaciar(true)} 
                      className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white px-3 py-1.5 rounded-xl transition-all active:scale-95 shadow-2xs"
                    >
                      🗑️ Vaciar
                    </button>
                  )}
                </div>
              </div>
              
              {/* Tabla de Artículos */}
              {listaFiltrada.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-80 text-zinc-400 bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-200">
                   <span className="text-4xl mb-3 opacity-40">🛍️</span>
                   <p className="font-bold text-sm text-zinc-600">No hay productos en esta vista.</p>
                   <p className="text-xs text-zinc-400 mt-1">Agrega productos desde tu catálogo a la izquierda.</p>
                 </div>
              ) : (
                <div className="overflow-x-auto scrollbar-hide">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-100 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        <th className="p-2.5 w-10 text-center">Listo</th>
                        <th className="p-2.5">Producto</th>
                        <th className="p-2.5 text-center w-20">Cant.</th>
                        <th className="p-2.5 text-center w-20">Dcto (%)</th>
                        <th className="p-2.5 text-right">Subtotal</th>
                        <th className="p-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {listaFiltrada.map(item => {
                        const finalPrice = (item.cantidad * item.precio_unitario) - ((item.cantidad * item.precio_unitario) * ((item.descuento_porcentaje || 0) / 100));
                        return (
                          <tr key={item.id} className={`border-b border-zinc-50 transition-all hover:bg-zinc-50/60 ${item.comprado ? 'opacity-50 bg-zinc-50/30' : ''}`}>
                            <td className="p-2.5 text-center">
                              <div className="relative flex items-center justify-center">
                                <input 
                                  type="checkbox" 
                                  checked={item.comprado} 
                                  onChange={(e) => onActualizarItem(item.id, 'comprado', e.target.checked)} 
                                  className="peer appearance-none w-5 h-5 border-2 border-zinc-300 rounded-md checked:bg-zinc-900 checked:border-zinc-900 cursor-pointer transition-all" 
                                />
                                <span className="absolute text-white font-bold text-xs pointer-events-none opacity-0 peer-checked:opacity-100">✓</span>
                              </div>
                            </td>
                            <td className="p-2.5">
                              <span className={`font-bold text-sm block ${item.comprado ? 'text-zinc-400 line-through' : 'text-zinc-900'}`}>
                                {item.producto_nombre}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-zinc-400 font-medium">
                                <span>${Number(item.precio_unitario).toLocaleString('es-CO')} c/u</span>
                                {item.categoria && <span className="bg-zinc-100 px-1 py-0.2 rounded text-[9px]">{item.categoria}</span>}
                              </div>
                            </td>
                            <td className="p-2.5 text-center">
                              <input 
                                type="number" 
                                min="1" 
                                value={item.cantidad} 
                                onChange={(e) => onActualizarItem(item.id, 'cantidad', Math.max(1, Number(e.target.value)))} 
                                className="w-14 p-1.5 border border-zinc-200 rounded-lg text-center text-xs font-bold text-zinc-800 bg-zinc-50 focus:bg-white focus:border-zinc-900 outline-none transition-all" 
                                disabled={item.comprado} 
                              />
                            </td>
                            <td className="p-2.5 text-center">
                              <div className="flex items-center border border-zinc-200 rounded-lg bg-zinc-50 overflow-hidden w-16 focus-within:border-zinc-900 focus-within:bg-white transition-all mx-auto">
                                <input 
                                  type="number" 
                                  min="0" 
                                  max="100" 
                                  value={item.descuento_porcentaje} 
                                  onChange={(e) => onActualizarItem(item.id, 'descuento_porcentaje', Math.min(100, Math.max(0, Number(e.target.value))))} 
                                  className="w-full p-1.5 text-center text-xs font-bold text-zinc-900 bg-transparent outline-none" 
                                  disabled={item.comprado} 
                                />
                                <span className="pr-1.5 text-zinc-400 font-bold text-[10px]">%</span>
                              </div>
                            </td>
                            <td className="p-2.5 text-right font-extrabold text-zinc-900 text-sm">
                              ${Math.round(finalPrice).toLocaleString('es-CO')}
                            </td>
                            <td className="p-2.5 text-center">
                              <button 
                                onClick={() => onEliminarItem(item.id)} 
                                className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 active:scale-90 transition-all flex items-center justify-center text-xs" 
                                title="Quitar"
                              >
                                ✕
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
              <div className="mt-6 pt-3 border-t border-zinc-100 flex flex-col sm:flex-row justify-between items-center gap-2 bg-zinc-50 p-3.5 rounded-2xl text-xs">
                <span className="font-semibold text-zinc-600">
                  Progreso: <strong className="text-zinc-900 font-bold">{mercadoLista.filter(i => i.comprado).length} de {mercadoLista.length} listos</strong>
                </span>
                <div className="flex items-center gap-2">
                  <span className="uppercase font-bold text-zinc-400 text-[10px]">Total Proyectado:</span>
                  <span className="text-lg font-extrabold text-zinc-900">${totalProyectado.toLocaleString('es-CO')}</span>
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
            <p className="text-sm text-zinc-600">
              ¿Estás seguro de que deseas eliminar <strong className="text-zinc-900">{prodAEliminar.nombre}</strong> del catálogo de productos frecuentes?
            </p>
            <div className="pt-2 flex gap-3">
              <button 
                type="button" 
                onClick={() => setProdAEliminar(null)} 
                className="w-1/2 p-3 rounded-xl border border-zinc-200 text-zinc-600 font-bold hover:bg-zinc-50 text-sm"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={() => eliminarProductoCatalogo(prodAEliminar.id)} 
                className="w-1/2 p-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm text-sm"
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
            <p className="text-sm text-zinc-600">
              ¿Estás seguro de que deseas vaciar todos los artículos de tu lista actual de compras?
            </p>
            <p className="text-xs text-zinc-500 bg-zinc-100 p-3 rounded-xl border border-zinc-200">
              Los productos guardados en tu catálogo frecuente se mantendrán intactos para futuras compras.
            </p>
            <div className="pt-2 flex gap-3">
              <button 
                type="button" 
                onClick={() => setModalVaciar(false)} 
                className="w-1/2 p-3 rounded-xl border border-zinc-200 text-zinc-600 font-bold hover:bg-zinc-50 text-sm"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setModalVaciar(false);
                  onLimpiarCarrito();
                }} 
                className="w-1/2 p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold shadow-sm text-sm"
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
