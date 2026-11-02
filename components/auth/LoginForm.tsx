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
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
      <form onSubmit={iniciarSesion} className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-gray-100 w-full max-w-md transition-all">
        <div className="w-16 h-16 bg-gradient-to-br from-slate-900 to-slate-700 text-white rounded-2xl flex items-center justify-center text-3xl shadow-lg mb-6 mx-auto">⚙️</div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-2 text-center tracking-tight">JG Hábits Pro</h2>
        <p className="text-sm text-gray-500 mb-8 text-center">Tu sistema operativo personal</p>
        
        {errorLogin && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium text-center">
            {errorLogin}
          </div>
        )}
        
        <input 
          type="email" 
          placeholder="Correo electrónico" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          className="w-full p-4 border border-gray-200 rounded-2xl mb-4 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white transition-all" 
          required 
        />
        <input 
          type="password" 
          placeholder="Contraseña" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          className="w-full p-4 border border-gray-200 rounded-2xl mb-6 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white transition-all" 
          required 
        />
        <button 
          type="submit" 
          disabled={cargando}
          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 active:scale-95 transition-all shadow-md disabled:opacity-50"
        >
          {cargando ? 'Accediendo...' : 'Acceder al Sistema'}
        </button>
      </form>
    </main>
  );
}
