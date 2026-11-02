import React from 'react';
import type { NavItem, TabType } from '@/types';

interface BottomNavProps {
  pestañaActiva: TabType;
  setPestañaActiva: (tab: TabType) => void;
  navItems: NavItem[];
}

export default function BottomNav({ pestañaActiva, setPestañaActiva, navItems }: BottomNavProps) {
  return (
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
  );
}
