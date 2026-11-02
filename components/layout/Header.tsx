import React from 'react';
import type { NavItem, TabType } from '@/types';

interface HeaderProps {
  pestañaActiva: TabType;
  setPestañaActiva: (tab: TabType) => void;
  navItems: NavItem[];
  onSignOut: () => void;
}

export default function Header({ pestañaActiva, setPestañaActiva, navItems, onSignOut }: HeaderProps) {
  return (
    <header className="max-w-6xl mx-auto mb-6 md:mb-8 pt-4 md:pt-0">
      <div className="flex justify-between items-center bg-white p-4 md:p-6 rounded-3xl shadow-[0_2px_16px_rgba(45,28,20,0.03)] border border-[#EADBCE]/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#2D1C14] border border-[#4A3225] rounded-xl flex flex-col items-center justify-center shadow-xs select-none">
            <span className="text-[11px] font-black tracking-widest text-white leading-none">JGM</span>
            <span className="text-[7px] font-bold tracking-widest text-[#E5C8B4] leading-none mt-0.5">GOALS</span>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-[#2D1C14] tracking-tight">JGM Goals</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8D6B57] block -mt-0.5">Sistema Operativo Personal</span>
          </div>
        </div>
        <button 
          onClick={onSignOut} 
          className="text-xs font-bold text-[#8D6B57] hover:text-rose-700 transition-colors bg-[#FAF5F0] hover:bg-rose-50 px-3.5 py-2 rounded-xl active:scale-95 border border-[#EADBCE]/60"
        >
          Cerrar Sesión
        </button>
      </div>
      
      {/* Navegación Desktop con Letras en Marrón Elegante y Blanco */}
      <div className="hidden md:flex gap-1.5 mt-5 bg-white p-1.5 rounded-2xl shadow-[0_2px_16px_rgba(45,28,20,0.03)] border border-[#EADBCE]/80 w-max">
        {navItems.map(item => {
          const isActive = pestañaActiva === item.id;
          return (
            <button 
              key={item.id}
              onClick={() => setPestañaActiva(item.id)} 
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 active:scale-95 ${
                isActive 
                  ? 'bg-[#2D1C14] text-white shadow-xs' 
                  : 'text-[#6F4A39] hover:bg-[#FAF5F0] hover:text-[#2D1C14]'
              }`}
            >
              <span className={`text-base transition-all filter grayscale contrast-150 inline-block ${
                isActive ? 'invert brightness-200' : 'brightness-75 opacity-75'
              }`}>
                {item.icon}
              </span> 
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
