import { Link } from 'react-router-dom';
import { BarChart3, Link2, ShoppingBag, Sparkles } from 'lucide-react';

const Index = () => {
  const modules = [
    {
      icon: BarChart3,
      title: 'Medidas',
      description:
        'Área avançada de Analytics com funis completos e logs detalhados de eventos.',
    },
    {
      icon: Link2,
      title: 'Integração',
      description:
        'Instale o widget de stories em qualquer plataforma de e-commerce com script direto ou GTM.',
    },
    {
      icon: ShoppingBag,
      title: 'Produtos',
      description:
        'Gerencie os produtos da loja e vincule-os diretamente às chamadas de ação dos vídeos.',
    },
  ];

  return (
    <main className="min-h-screen bg-[#111524] text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8">
        <header className="flex items-center justify-between border-b border-[#ff7a29]/30 pb-6">
          <div>
            <p className="text-sm font-medium text-[#0091ff]">Bem-vindo</p>

            <h1 className="mt-1 text-[18px] font-black tracking-tight text-white">
              Painel Principal
            </h1>
          </div>

          <Link
            to="/settings"
            className="rounded-2xl border border-[#ff7a29]/30 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition-all duration-300 hover:border-[#ff7a29]/60 hover:shadow-md"
          >
            Configurações
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-8 py-12 lg:grid-cols-2">
          <div>
            <div className="mb-6 inline-flex rounded-full border border-[#ff7a29]/30 bg-[#ff7a29]/10 px-4 py-2 text-sm text-[#ff7a29]">
              Seu app está funcionando
            </div>

            <h2 className="max-w-2xl text-4xl font-black leading-tight tracking-tight md:text-5xl text-white">
              Organize seus stories em um só lugar.
            </h2>

            <p className="mt-5 max-w-xl text-base leading-7 text-slate-400">
              Esta é a tela inicial do aplicativo. A partir daqui, você poderá
              acessar seus stories, criar novos conteúdos, gerenciar vídeos,
              produtos, customizar aparências e ajustar as configurações do
              sistema.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/dashboard"
                className="rounded-2xl bg-[#0091ff] px-6 py-3 text-center font-black text-white shadow-lg shadow-[#0091ff]/20 transition-all duration-300 hover:bg-[#0070f3] hover:scale-[1.02]"
              >
                Ver Dashboard
              </Link>

              <Link
                to="/stories"
                className="rounded-2xl border border-[#ff7a29]/30 bg-white/5 px-6 py-3 text-center font-black text-white transition-all duration-300 hover:border-[#ff7a29]/60 hover:shadow-md"
              >
                Gerenciar Stories
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-[#ff7a29]/30 bg-[#1a1f35] p-6 shadow-xs">
            <div className="grid gap-4">
              {modules.map((mod) => (
                <div
                  key={mod.title}
                  className="group rounded-2xl border border-[#ff7a29]/20 bg-[#111524] p-5 transition-all duration-300 hover:border-[#ff7a29]/60 hover:shadow-md"
                >
                  <p className="text-[14px] font-black uppercase tracking-wider text-slate-500">Módulo</p>

                  <h3 className="mt-2 flex items-center gap-3 text-xl font-black text-white">
                    <span className="w-[45px] h-[45px] rounded-2xl flex items-center justify-center bg-[#0091ff]/10 dark:bg-[#ff7a29]/10 border border-[#0091ff]/20 dark:border-[#ff7a29]/20 text-[#0091ff] dark:text-[#ff7a29] shrink-0 transition-transform duration-300 group-hover:scale-105">
                      <mod.icon className="w-[22px] h-[22px]" />
                    </span>
                    {mod.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {mod.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-center gap-2 border-t border-[#ff7a29]/20 pt-6 text-xs text-slate-500">
          <Sparkles className="h-3.5 w-3.5 text-[#ff7a29]" />
          Vidlytics Stories — Social Video Commerce B2B2C
        </footer>
      </section>
    </main>
  );
};

export default Index;
