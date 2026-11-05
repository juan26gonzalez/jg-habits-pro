"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getFechaActualColombia } from '@/lib/dateUtils';
import type { 
  TabType, 
  NavItem, 
  UserSession, 
  Gasto, 
  CuotaAporte,
  Habito, 
  HabitoRegistro, 
  MercadoProducto, 
  MercadoItem 
} from '@/types';

import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import LoginForm from '@/components/auth/LoginForm';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import DashboardTab from '@/components/dashboard/DashboardTab';
import HabitsTab from '@/components/habits/HabitsTab';
import FinancesTab from '@/components/finances/FinancesTab';
import GroceryTab from '@/components/grocery/GroceryTab';

const navItems: NavItem[] = [
  { id: 'calendario', icon: '📅', label: 'Dashboard' },
  { id: 'habitos', icon: '🎯', label: 'Targets' },
  { id: 'finanzas', icon: '💰', label: 'Finances' },
  { id: 'supermercado', icon: '🛒', label: 'Grocery' }
];

export default function Home() {
  const [sesion, setSesion] = useState<UserSession>(null);
  const [cargandoGlobal, setCargandoGlobal] = useState(true);
  const [pestañaActiva, setPestañaActiva] = useState<TabType>('calendario');

  const [mesActual, setMesActual] = useState(0);
  const [anioActual, setAnioActual] = useState(2026);
  const [strHoy, setStrHoy] = useState('');

  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [cuotasFamilia, setCuotasFamilia] = useState<CuotaAporte[]>([]);
  const [habitosCatalogo, setHabitosCatalogo] = useState<Habito[]>([]);
  const [registrosHistoricos, setRegistrosHistoricos] = useState<HabitoRegistro[]>([]);
  const [mercadoCatalogo, setMercadoCatalogo] = useState<MercadoProducto[]>([]);
  const [mercadoLista, setMercadoLista] = useState<MercadoItem[]>([]);
  const [presupuestoMercado, setPresupuestoMercado] = useState(0);

  const cargarDatosGenerales = useCallback(async (mostrarEsqueleto = false) => {
    if (mostrarEsqueleto) setCargandoGlobal(true);
    const { fechaStr, anio, mes } = getFechaActualColombia();
    
    setMesActual(mes);
    setAnioActual(anio);
    setStrHoy(fechaStr);
    
    const [
      { data: dataGastos },
      { data: dataHabitos },
      { data: dataRegistros },
      { data: dataMercadoCat },
      { data: dataMercadoList },
      { data: dataCuotas }
    ] = await Promise.all([
      supabase.from('finanzas_gastos').select('*'),
      supabase.from('habitos_catalogo').select('*').order('hora', { ascending: true }),
      supabase.from('habitos_registros').select('*'),
      supabase.from('mercado_catalogo').select('*').order('nombre', { ascending: true }),
      supabase.from('mercado_lista').select('*').order('creado_en', { ascending: true }),
      supabase.from('finanzas_cuotas_familia').select('*')
    ]);

    if (dataGastos) setGastos(dataGastos as Gasto[]);
    if (dataCuotas) setCuotasFamilia(dataCuotas as CuotaAporte[]);
    if (dataHabitos) setHabitosCatalogo(dataHabitos as Habito[]);
    if (dataRegistros) setRegistrosHistoricos(dataRegistros as HabitoRegistro[]);
    if (dataMercadoCat) setMercadoCatalogo(dataMercadoCat as MercadoProducto[]);
    if (dataMercadoList) setMercadoLista(dataMercadoList as MercadoItem[]);

    setCargandoGlobal(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSesion(session);
      if (session) {
        cargarDatosGenerales();
      } else {
        setCargandoGlobal(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesion(session);
      if (session) {
        cargarDatosGenerales();
      }
    });

    return () => subscription.unsubscribe();
  }, [cargarDatosGenerales]);

  // Manejadores de Hábitos
  async function marcarHabito(habitoId: string, fechaTarget?: string) {
    if (!sesion?.user?.id) return;
    const fecha = fechaTarget || strHoy;
    const registroExistente = registrosHistoricos.find(r => r.habito_id === habitoId && r.fecha === fecha);
    if (registroExistente) {
      const { error } = await supabase.from('habitos_registros').delete().eq('id', registroExistente.id);
      if (!error) {
        setRegistrosHistoricos(registrosHistoricos.filter(r => r.id !== registroExistente.id));
      }
    } else {
      const { data, error } = await supabase
        .from('habitos_registros')
        .insert([{ habito_id: habitoId, fecha, completado: true, user_id: sesion.user.id }])
        .select();

      if (!error && data && data[0]) {
        setRegistrosHistoricos([...registrosHistoricos, data[0] as HabitoRegistro]);
      }
    }
  }

  // Manejadores de Supermercado
  async function agregarAlCarrito(producto: MercadoProducto) {
    if (!sesion?.user?.id) return;
    if (mercadoLista.some(item => item.producto_nombre === producto.nombre)) {
      alert("Este producto ya está en tu lista actual.");
      return;
    }
    const { data, error } = await supabase
      .from('mercado_lista')
      .insert([{ 
        producto_nombre: producto.nombre, 
        categoria: producto.categoria, 
        cantidad: 1, 
        precio_unitario: producto.precio_referencia, 
        descuento_porcentaje: 0, 
        comprado: false, 
        user_id: sesion.user.id 
      }])
      .select();

    if (!error && data && data[0]) {
      setMercadoLista([...mercadoLista, data[0] as MercadoItem]);
    }
  }

  async function actualizarItemLista(id: string, campo: string, valor: any) {
    setMercadoLista(mercadoLista.map(item => item.id === id ? { ...item, [campo]: valor } : item));
    await supabase.from('mercado_lista').update({ [campo]: valor }).eq('id', id);
  }

  async function eliminarDeLista(id: string) {
    setMercadoLista(mercadoLista.filter(item => item.id !== id));
    await supabase.from('mercado_lista').delete().eq('id', id);
  }

  async function limpiarCarrito() {
    if (!sesion?.user?.id) return;
    const { error } = await supabase.from('mercado_lista').delete().eq('user_id', sesion.user.id);
    if (!error) {
      setMercadoLista([]);
    } else {
      alert("Error al limpiar carrito: " + error.message);
    }
  }

  if (!sesion && !cargandoGlobal) {
    return <LoginForm />;
  }

  if (cargandoGlobal) {
    return <LoadingSkeleton />;
  }

  return (
    <main className="min-h-screen bg-[#FAF7F4] pb-28 md:pb-12 p-4 md:p-8">
      <Header 
        pestañaActiva={pestañaActiva} 
        setPestañaActiva={setPestañaActiva} 
        navItems={navItems} 
        onSignOut={() => supabase.auth.signOut()} 
      />

      {pestañaActiva === 'calendario' && (
        <DashboardTab 
          mesActual={mesActual}
          anioActual={anioActual}
          setMesActual={setMesActual}
          setAnioActual={setAnioActual}
          strHoy={strHoy}
          gastos={gastos}
          mercadoLista={mercadoLista}
          habitosCatalogo={habitosCatalogo}
          registrosHistoricos={registrosHistoricos}
          onMarcarHabito={marcarHabito}
        />
      )}

      {pestañaActiva === 'habitos' && (
        <HabitsTab 
          habitosCatalogo={habitosCatalogo}
          registrosHistoricos={registrosHistoricos}
          sesion={sesion}
          strHoy={strHoy}
          onHabitoAgregado={cargarDatosGenerales}
          onMarcarHabito={marcarHabito}
        />
      )}

      {pestañaActiva === 'finanzas' && (
        <FinancesTab 
          gastos={gastos}
          cuotasFamilia={cuotasFamilia}
          setCuotasFamilia={setCuotasFamilia}
          sesion={sesion}
          strHoy={strHoy}
          onGastoAgregado={cargarDatosGenerales}
        />
      )}

      {pestañaActiva === 'supermercado' && (
        <GroceryTab 
          mercadoCatalogo={mercadoCatalogo}
          mercadoLista={mercadoLista}
          presupuestoMercado={presupuestoMercado}
          setPresupuestoMercado={setPresupuestoMercado}
          sesion={sesion}
          gastos={gastos}
          strHoy={strHoy}
          onMercadoActualizado={cargarDatosGenerales}
          onAgregarAlCarrito={agregarAlCarrito}
          onActualizarItem={actualizarItemLista}
          onEliminarItem={eliminarDeLista}
          onLimpiarCarrito={limpiarCarrito}
        />
      )}

      {sesion && (
        <BottomNav 
          pestañaActiva={pestañaActiva} 
          setPestañaActiva={setPestañaActiva} 
          navItems={navItems} 
        />
      )}
    </main>
  );
}
