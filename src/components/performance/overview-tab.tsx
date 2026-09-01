      </Card>

      {/* ── CONTEXTO DO MERCADO COM COPYS CORRIGIDAS E MODAL DE ESTUDO ── */}
      <div className="bg-slate-50 dark:bg-[#0f1220] border border-slate-100 dark:border-white/5 p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6">
        <div className="flex items-start gap-3">
          <Compass className="w-5 h-5 text-[#0094EB] dark:text-[#ff7a29] shrink-0 mt-0.5 animate-spin" style={{ animationDuration: '8s' }} />
          <div className="text-xs">
            <h4 className="font-bold text-slate-800 dark:text-slate-200">Como funciona o benchmark do setor?</h4>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed max-w-2xl">
              As metas de comparação do setor de <strong>{benchmark.sector_name}</strong> são baseadas em pesquisas consolidadas de mercado e inteligência competitiva nacional de 2026 (cruzando relatórios oficiais da Ebit/Nielsen, Neotrust e Social Commerce global).
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsBenchmarkModalOpen(true)}
          className="bg-white dark:bg-[#1a1f35] border border-slate-200 dark:border-white/10 hover:border-[#0094EB] dark:hover:border-[#ff7a29] text-slate-700 dark:text-slate-200 hover:text-[#0094EB] dark:hover:text-[#ff7a29] font-black text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs shrink-0 flex items-center gap-1.5 hover:scale-[1.02]"
        >
          <FileText size={14} />
          Ver Estudo de Mercado
        </button>
      </div>

      {/* ── MODAL PREMIUM: ESTUDO DE MERCADO E BENCHMARK 2026 ── */}
      {isBenchmarkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in font-sans">
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#121625] border border-slate-100 dark:border-white/5 rounded-[2.5rem] shadow-2xl p-6 sm:p-8 animate-scale-in max-h-[90vh] overflow-y-auto">
            
            {/* Botão Fechar */}
            <button
              onClick={() => setIsBenchmarkModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Cabeçalho */}
            <div className="space-y-1.5 border-b border-slate-100 dark:border-white/5 pb-5">
              <span className="inline-flex items-center gap-1 bg-[#0094EB]/10 dark:bg-[#ff7a29]/10 text-[#0094EB] dark:text-[#ff7a29] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                <Sparkles className="w-3 h-3" /> Inteligência Setorial 2026
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                Estudo de Mercado: {benchmark.sector_name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Métricas e taxas ideais coletadas do ecossistema de Social Commerce do varejo brasileiro.
              </p>
            </div>

            {/* Grid das Métricas do Benchmark */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              
              <div className="p-4 rounded-2xl bg-blue-500/[0.02] dark:bg-white/[0.01] border border-slate-100 dark:border-white/5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CTR Médio (Cliques)</span>
                <p className="text-2xl font-black text-indigo-500 mt-1">{benchmark.avg_ctr}%</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                  Taxa ideal de visualizadores que clicam em um produto/CTA no story.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/[0.02] dark:bg-white/[0.01] border border-slate-100 dark:border-white/5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CVR Médio (Conversão)</span>
                <p className="text-2xl font-black text-emerald-500 mt-1">{benchmark.avg_cvr}%</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                  Taxa ideal de vendas geradas em relação às visualizações totais.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/[0.02] dark:bg-white/[0.01] border border-slate-100 dark:border-white/5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hook Rate (Fisgada 3s)</span>
                <p className="text-2xl font-black text-amber-500 mt-1">{benchmark.avg_hook_rate}%</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                  Média de retenção de usuários nos primeiros 3s críticos do vídeo.
                </p>
              </div>

            </div>

            {/* Playbook de Ação */}
            <div className="mt-6 space-y-4 bg-slate-50 dark:bg-[#1a1f35]/50 border border-slate-100 dark:border-white/5 p-5 rounded-3xl">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#0094EB] dark:text-[#ff7a29]" />
                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">
                  Playbook de Ação para Alcançar a Meta
                </h4>
              </div>

              <div className="space-y-3.5">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Comportamento do Consumidor:</span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {playbook.audienceBehavior}
                  </p>
                </div>

                <div className="border-t dark:border-white/5 pt-3.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Recomendações Práticas (2026):</span>
                  <div className="space-y-2">
                    {playbook.tips.map((tip, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <div className="p-0.5 bg-emerald-500/10 text-emerald-500 rounded-md shrink-0 mt-0.5">
                          <Check size={12} className="stroke-[3]" />
                        </div>
                        <span className="leading-relaxed">{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Metodologia de Fundo */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 text-[10px] text-slate-400 dark:text-slate-500 text-center leading-relaxed">
              * Estudo metodológico compilado em Janeiro/2026 a partir do cruzamento de pesquisas consolidadas de mercado nacional (Ebit, Nielsen, Neotrust) e taxas empíricas de Social Video Commerce do varejo digital brasileiro B2C.
            </div>

          </div>
        </div>
      )}
    </div> // <--- FECHA O CONTAINER PRINCIPAL DO COMPONENTE
  ) // <--- FECHA O RETURN
} // <--- FECHA A FUNÇÃO OVERVIEWTAB
