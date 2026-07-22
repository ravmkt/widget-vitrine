import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn } from '@/lib/auth';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7FAFC] p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-sm border border-slate-200 space-y-4">
        <div className="flex justify-center pb-2">
          <img src="/assets/vidlytics-logo-mark.png" alt="Vidlytics" className="h-36 w-auto" />

        </div>
        <h1 className="text-2xl font-black text-slate-900">Entrar</h1>

        <input className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
        <button disabled={loading} className="w-full rounded-xl bg-[#0094EB] py-3 font-black text-white">{loading ? 'Entrando...' : 'Entrar'}</button>
        <button type="button" onClick={() => navigate('/register')} className="w-full text-sm font-bold text-[#0094EB]">Criar conta</button>
      </form>
    </div>
  );
};

export default LoginPage;
