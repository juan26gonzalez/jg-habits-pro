import React from 'react';
import type { NavItem, TabType } from '@/types';

interface BottomNavProps {
  pestañaActiva: TabType;
  setPestañaActiva: (tab: TabType) => void;
  navItems: NavItem[];
}

export default function BottomNav({ pestañaActiva, setPestañaActiva, navItems }: BottomNavProps) {
  return (
    <nav className="md:hidden fixed bottom-4 inset-x-4 max-w-sm mx-auto z-50">
      {/* Dock Liquid Glass Container */}
      <div className="bg-white/55 backdrop-blur-2xl border border-white/70 shadow-[0_16px_36px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.95)] rounded-3xl p-1.5 flex items-center justify-between ring-1 ring-black/5">
        {navItems.map(item => {
          const isActive = pestañaActiva === item.id;
          return (
            <button 
              key={item.id}
              onClick={() => setPestañaActiva(item.id)} 
              className={`relative flex flex-col items-center justify-center py-2 px-3.5 rounded-2xl transition-all duration-300 active:scale-90 flex-1 ${
                isActive 
                  ? 'bg-white/80 text-zinc-900 shadow-[0_4px_16px_rgba(0,0,0,0.08),inset_0_1px_2px_rgba(255,255,255,1)] border border-white/90 scale-102' 
                  : 'text-zinc-400 hover:text-zinc-700 hover:bg-white/20 border border-transparent'
              }`}
            >
              {/* Reflejo de cristal superior para botón activo */}
              {isActive && (
                <div className="absolute top-1 inset-x-3 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
              )}
              
              {/* Icono en Blanco y Negro de Alto Contraste */}
              <span className={`text-xl transition-all duration-300 inline-block filter grayscale contrast-150 ${
                isActive ? 'scale-110 brightness-50 opacity-100 drop-shadow-2xs' : 'opacity-40 brightness-75'
              }`}>
                {item.icon}
              </span>
              
              <span className={`text-[9px] font-extrabold uppercase tracking-tight mt-0.5 transition-all ${
                isActive ? 'text-zinc-900 opacity-100 font-black' : 'text-zinc-400 opacity-60'
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
