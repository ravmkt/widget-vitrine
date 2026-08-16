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
    <div className="min-h-screen flex items-center justify-center bg-[#F7FAFC] p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-sm border border-slate-200 space-y-4">
        <h1 className="text-2xl font-black text-slate-900">Criar conta</h1>
        <input className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <input className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="Nome da empresa/loja" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
        {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
        <button disabled={loading} className="w-full rounded-xl bg-[#0094EB] py-3 font-black text-white">{loading ? 'Criando...' : 'Criar conta'}</button>
        <button type="button" onClick={() => navigate('/login')} className="w-full text-sm font-bold text-[#0094EB]">Já tenho conta</button>
      </form>
    </div>
  );
};

export default RegisterPage;
