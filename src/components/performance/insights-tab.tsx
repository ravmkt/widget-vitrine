  if (loading || data.views === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-[#1a1f35]/30 rounded-3xl border-2 border-dashed border-slate-100 dark:border-white/5 h-auto py-12">
        {/* Quadrado Laranja com Ícone Branco Correto */}
        <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center mb-5 shadow-lg shadow-orange-500/30">
          <Sparkles className="w-9 h-9 text-white animate-pulse" />
        </div>
        
        <h3 className="text-xl font-black text-slate-800 dark:text-white">Aguardando primeiras interações...</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 max-w-md leading-relaxed">
          Seus relatórios e diagnósticos de <strong>{benchmark.sector_name}</strong> ficarão ativos assim que o widget registrar as primeiras visualizações de stories na sua loja.
        </p>

        {/* Cards 1, 2 e 3 com Ícones Maiores, Textos Maiores e Padding Melhorado */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-10 pt-8 border-t border-slate-100 dark:border-white/5">
          {/* Card 1 - Script Instalado */}
          <div className="flex flex-col items-center text-center p-6 bg-white dark:bg-[#1a1f35]/50 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-300">
            <Code className="w-8 h-8 text-[#0094EB] mb-3" />
            <span className="text-sm font-black text-slate-800 dark:text-white">1. Script Instalado?</span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Garanta que o código do widget foi adicionado nas páginas do seu site.
            </p>
          </div>

          {/* Card 2 - Publique Vídeos */}
          <div className="flex flex-col items-center text-center p-6 bg-white dark:bg-[#1a1f35]/50 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-300">
            <PlayCircle className="w-8 h-8 text-emerald-500 mb-3" />
            <span className="text-sm font-black text-slate-800 dark:text-white">2. Publique Vídeos</span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Ative um ou mais Stories no painel de controle do Vidlytics.
            </p>
          </div>

          {/* Card 3 - Faça um Teste */}
          <div className="flex flex-col items-center text-center p-6 bg-white dark:bg-[#1a1f35]/50 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-300">
            <TrendingUp className="w-8 h-8 text-[#ff7a29] mb-3" />
            <span className="text-sm font-black text-slate-800 dark:text-white">3. Faça um Teste</span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Abra sua loja em uma aba anônima e assista aos stories para gerar os primeiros dados.
            </p>
          </div>
        </div>
      </div>
    )
  }
