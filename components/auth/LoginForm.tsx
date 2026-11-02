import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorLogin, setErrorLogin] = useState('');
  const [cargando, setCargando] = useState(false);

  async function iniciarSesion(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setErrorLogin('');
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrorLogin(`Error: ${error.message}`);
    }
    setCargando(false);
  }

  return (
    <main className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
      <form onSubmit={iniciarSesion} className="bg-white p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.04)] border border-zinc-200/80 w-full max-w-md transition-all">
        <div className="w-14 h-14 bg-zinc-900 text-white rounded-2xl flex items-center justify-center text-2xl shadow-sm mb-5 mx-auto">⚙️</div>
        <h2 className="text-2xl font-extrabold text-zinc-900 mb-1 text-center tracking-tight">JG Hábits Pro</h2>
        <p className="text-xs text-zinc-400 mb-8 text-center uppercase font-bold tracking-wider">Sistema Operativo Personal</p>
        
        {errorLogin && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold text-center">
            {errorLogin}
          </div>
        )}
        
        <div className="space-y-3 mb-6">
          <input 
            type="email" 
            placeholder="Correo electrónico" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            className="w-full p-3.5 border border-zinc-200 rounded-2xl text-zinc-900 font-medium focus:border-zinc-900 outline-none bg-zinc-50 focus:bg-white transition-all text-sm" 
            required 
          />
          <input 
            type="password" 
            placeholder="Contraseña" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            className="w-full p-3.5 border border-zinc-200 rounded-2xl text-zinc-900 font-medium focus:border-zinc-900 outline-none bg-zinc-50 focus:bg-white transition-all text-sm" 
            required 
          />
        </div>

        <button 
          type="submit" 
          disabled={cargando}
          className="w-full bg-zinc-900 text-white py-3.5 rounded-2xl font-bold hover:bg-zinc-800 active:scale-95 transition-all shadow-sm disabled:opacity-50 text-sm"
        >
          {cargando ? 'Accediendo...' : 'Acceder al Sistema'}
        </button>
      </form>
    </main>
  );
}
