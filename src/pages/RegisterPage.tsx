import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signUp, signInWithGoogle } from '@/lib/auth';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não conferem. Por favor, verifique e tente novamente.');
      return;
    }

    setLoading(true);
    try {
      await signUp(name, email, password, storeName);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Não foi possível criar a conta.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Erro ao autenticar com o Google.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7FAFC] dark:bg-[#111524] p-4 transition-colors duration-300">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1a1f35] p-8 shadow-xs border border-slate-200 dark:border-[#ff7a29]/30 space-y-4 transition-all duration-300 hover:shadow-md">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Criar conta</h1>
        <input className="w-full rounded-2xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-[#0091ff]/30 focus:border-[#0091ff] dark:border-[#ff7a29]/30 dark:bg-[#111524] dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-[#ff7a29]/30 dark:focus:border-[#ff7a29] px-4 py-3 outline-none transition-colors" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="w-full rounded-2xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-[#0091ff]/30 focus:border-[#0091ff] dark:border-[#ff7a29]/30 dark:bg-[#111524] dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-[#ff7a29]/30 dark:focus:border-[#ff7a29] px-4 py-3 outline-none transition-colors" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full rounded-2xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-[#0091ff]/30 focus:border-[#0091ff] dark:border-[#ff7a29]/30 dark:bg-[#111524] dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-[#ff7a29]/30 dark:focus:border-[#ff7a29] px-4 py-3 outline-none transition-colors" placeholder="Senha (mínimo 6 caracteres)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <input className="w-full rounded-2xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-[#0091ff]/30 focus:border-[#0091ff] dark:border-[#ff7a29]/30 dark:bg-[#111524] dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-[#ff7a29]/30 dark:focus:border-[#ff7a29] px-4 py-3 outline-none transition-colors" placeholder="Confirme a senha" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        <input className="w-full rounded-2xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-[#0091ff]/30 focus:border-[#0091ff] dark:border-[#ff7a29]/30 dark:bg-[#111524] dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-[#ff7a29]/30 dark:focus:border-[#ff7a29] px-4 py-3 outline-none transition-colors" placeholder="Nome da empresa/loja" value={storeName} onChange={(e) => setStoreName(e.target.value)} required />
        {error && <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{error}</p>}
        <button disabled={loading || googleLoading} className="w-full rounded-2xl bg-[#0091ff] hover:bg-[#0070f3] dark:bg-[#ff7a29] dark:hover:bg-[#e05e10] py-3 font-black text-white transition-all disabled:opacity-50 shadow-xs hover:scale-[1.01]">{loading ? 'Criando...' : 'Criar conta'}</button>

        <div className="relative flex items-center justify-center py-2">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-[#ff7a29]/20"></div></div>
          <span className="relative bg-white dark:bg-[#1a1f35] px-3 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">ou</span>
        </div>

        <button
          type="button"
          disabled={loading || googleLoading}
          onClick={handleGoogleSignUp}
          className="w-full rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 bg-white dark:bg-[#111524] py-3 font-bold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-[#1a1f35] hover:border-[#0091ff]/50 dark:hover:border-[#ff7a29]/60 transition-all flex items-center justify-center gap-3 shadow-xs disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          {googleLoading ? 'Conectando...' : 'Cadastrar com Google'}
        </button>

        <button type="button" onClick={() => navigate('/login')} className="w-full text-sm font-black text-[#0091ff] dark:text-[#ff7a29] hover:underline transition-all pt-2">Já tenho conta</button>
           </form>
    </div>
  );
};

export default RegisterPage;
