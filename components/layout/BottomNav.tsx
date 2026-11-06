import React from 'react';
import type { NavItem, TabType } from '@/types';

interface BottomNavProps {
  pestañaActiva: TabType;
  setPestañaActiva: (tab: TabType) => void;
  navItems: NavItem[];
}

export default function BottomNav({ pestañaActiva, setPestañaActiva, navItems }: BottomNavProps) {
  return (
    <nav className="md:hidden fixed bottom-3 inset-x-2 sm:inset-x-4 max-w-md mx-auto z-50">
      {/* Dock Liquid Glass Container - Asegura que las 5 pestañas queden 100% dentro del cuadro */}
      <div className="bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_12px_32px_rgba(45,28,20,0.12),inset_0_1px_1px_rgba(255,255,255,0.95)] rounded-2xl sm:rounded-3xl p-1 sm:p-1.5 flex items-center justify-between gap-0.5 sm:gap-1 ring-1 ring-black/5 overflow-hidden">
        {navItems.map(item => {
          const isActive = pestañaActiva === item.id;
          return (
            <button 
              key={item.id}
              onClick={() => setPestañaActiva(item.id)} 
              className={`relative flex flex-col items-center justify-center py-1.5 px-0.5 sm:px-1.5 rounded-xl sm:rounded-2xl transition-all duration-200 active:scale-95 flex-1 min-w-0 ${
                isActive 
                  ? 'bg-white/95 text-[#2D1C14] shadow-[0_3px_12px_rgba(45,28,20,0.08),inset_0_1px_1px_rgba(255,255,255,1)] border border-white/90' 
                  : 'text-[#8D6B57] hover:text-[#2D1C14] hover:bg-white/20 border border-transparent'
              }`}
            >
              {/* Reflejo de cristal superior para botón activo */}
              {isActive && (
                <div className="absolute top-0.5 inset-x-2 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
              )}
              
              {/* Icono en Blanco y Negro de Alto Contraste */}
              <span className={`text-lg sm:text-xl transition-all duration-200 inline-block filter grayscale contrast-150 leading-none ${
                isActive ? 'scale-105 brightness-50 opacity-100 drop-shadow-2xs' : 'opacity-40 brightness-75'
              }`}>
                {item.icon}
              </span>
              
              <span className={`text-[8px] sm:text-[9px] uppercase tracking-tighter sm:tracking-tight mt-0.5 block truncate max-w-full text-center leading-tight transition-all ${
                isActive ? 'text-[#2D1C14] opacity-100 font-black' : 'text-[#8D6B57] opacity-60 font-bold'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
