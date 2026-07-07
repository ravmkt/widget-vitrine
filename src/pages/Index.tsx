import { Link } from 'react-router-dom';
import { LayoutDashboard, Film, GalleryVertical, Settings, Palette, ShoppingBag, BarChart3, MessageSquare } from 'lucide-react';

const Index = () => {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <div>
            <p className="text-sm font-medium text-violet-400">Bem-vindo</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              Painel Principal
            </h1>
          </div>

          <Link
            to="/settings"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            Configurações
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-8 py-12 lg:grid-cols-2">
          <div>
            <div className="mb-6 inline-flex rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-300">
              Seu app está funcionando
            </div>

            <h2 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              Organize seus stories em um só lugar.
            </h2>

            <p className="mt-5 max-w-xl text-base leading-7 text-slate-400">
              Esta é a tela inicial do aplicativo. A partir daqui, você poderá
              acessar seus stories, criar novos conteúdos, gerenciar vídeos, produtos, customizar aparências e ajustar as
              configurações do sistema.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/dashboard"
                className="rounded-2xl bg-violet-600 px-6 py-3 text-center font-bold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700"
              >
                Ver Dashboard
              </Link>

              <Link
                to="/stories"
                className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-center font-bold text-white transition hover:bg-white/10"
              >
                Gerenciar Stories
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl">
            <div className="grid gap-4">
              <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">Módulo</p>
                <h3 className="mt-2 text-xl font-bold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-violet-400" /> Medidas
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Área avançada de Analytics com funis completos e logs detalhados de eventos.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">Módulo</p>
                <h3 className="mt-2 text-xl font-bold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-violet-400" /> Comentários
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Modere perguntas, interações e envie respostas públicas aos seus clientes.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">Módulo</p>
                <h3 className="mt-2 text-xl font-bold flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-violet-400" /> Produtos
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Gerencie os produtos da loja e vincule-os diretamente às chamadas de ação dos vídeos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Index;