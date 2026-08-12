import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { showSuccess, showError } from '@/utils/toast';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function InstagramCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleProcessCallback = async () => {
      const code = searchParams.get('code');
      const storeId = searchParams.get('state');

      if (!code || !storeId) {
        setStatus('error');
        setErrorMessage('Código de autorização ou ID da loja não fornecidos pela Meta.');
        return;
      }

      try {
        // Chama a Edge Function do Supabase para processar a troca do token com o secret
        if (supabase) {
          const { data, error } = await supabase.functions.invoke('instagram-auth', {
            body: { code, store_id: storeId },
          });

          if (error || data?.error) {
            throw new Error(error?.message || data?.error || 'Erro ao validar autorização na Meta.');
          }
        }

        setStatus('success');
        showSuccess('Instagram conectado com sucesso!');
        setTimeout(() => navigate('/storage'), 2000);
      } catch (err: any) {
        console.error('Erro no callback do Instagram:', err);
        setStatus('error');
        setErrorMessage(err.message || 'Falha ao registrar autorização do Instagram.');
        showError('Erro ao conectar conta do Instagram.');
      }
        console.error('Erro no callback do Instagram:', err);
        setStatus('error');
        setErrorMessage('Falha ao registrar autorização do Instagram no banco.');
        showError('Erro ao conectar conta do Instagram.');
      }
    };

    handleProcessCallback();
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md rounded-3xl bg-slate-950 p-8 text-center shadow-2xl border border-slate-800 space-y-4">
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
            <h2 className="text-lg font-bold text-white">Conectando sua conta do Instagram...</h2>
            <p className="text-xs text-slate-400">Aguarde enquanto validamos suas credenciais na Meta.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 animate-bounce" />
            <h2 className="text-lg font-bold text-white">Instagram Conectado!</h2>
            <p className="text-xs text-slate-400">Redirecionando você de volta ao seu painel...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="h-12 w-12 text-rose-500" />
            <h2 className="text-lg font-bold text-white">Falha na Conexão</h2>
            <p className="text-xs text-rose-400">{errorMessage}</p>
            <button
              onClick={() => navigate('/storage')}
              className="mt-4 rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700"
            >
              Voltar ao Armazenamento
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
