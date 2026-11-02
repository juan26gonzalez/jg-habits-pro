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
      <div className="flex justify-between items-center bg-white p-4 md:p-6 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-zinc-200/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-900 text-white rounded-xl flex items-center justify-center text-lg shadow-sm">
            ⚙️
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-zinc-900 tracking-tight">JGM Goals</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block -mt-0.5">Sistema Operativo Personal</span>
          </div>
        </div>
        <button 
          onClick={onSignOut} 
          className="text-xs font-bold text-zinc-400 hover:text-rose-600 transition-colors bg-zinc-50 hover:bg-rose-50 px-3.5 py-2 rounded-xl active:scale-95 border border-zinc-200/60"
        >
          Cerrar Sesión
        </button>
      </div>
      
      {/* Navegación Desktop con Emoticones en Blanco y Negro */}
      <div className="hidden md:flex gap-1.5 mt-5 bg-white p-1.5 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-zinc-200/80 w-max">
        {navItems.map(item => {
          const isActive = pestañaActiva === item.id;
          return (
            <button 
              key={item.id}
              onClick={() => setPestañaActiva(item.id)} 
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 active:scale-95 ${
                isActive 
                  ? 'bg-zinc-900 text-white shadow-xs' 
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
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
