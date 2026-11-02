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
      <div className="flex justify-between items-center bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center text-lg shadow-md">⚙️</div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">JG Hábits Pro</h1>
        </div>
        <button 
          onClick={onSignOut} 
          className="text-sm font-bold text-gray-400 hover:text-red-500 transition-colors bg-gray-50 px-4 py-2 rounded-xl active:scale-95"
        >
          Log Out
        </button>
      </div>
      
      <div className="hidden md:flex gap-2 mt-6 overflow-x-auto scrollbar-hide bg-white p-2 rounded-2xl shadow-sm border border-gray-100 w-max">
        {navItems.map(item => (
          <button 
            key={item.id}
            onClick={() => setPestañaActiva(item.id)} 
            className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2 active:scale-95 ${pestañaActiva === item.id ? 'bg-slate-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-slate-800'}`}
          >
            <span className="text-lg">{item.icon}</span> {item.label}
          </button>
        ))}
      </div>
    </header>
  );
}
