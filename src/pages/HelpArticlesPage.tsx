// src/pages/HelpArticlesPage.tsx
"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  BookOpen, 
  Clock, 
  ChevronRight, 
  HelpCircle,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Article {
  id: string;
  title: string;
  category: string;
  readTime: string;
  summary: string;
  content: React.ReactNode;
}

export default function HelpArticlesPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const articles: Article[] = [
    {
      id: "como-instalar-widget",
      title: "Como instalar o Widget do Vidlytics na sua loja (Shopify, Nuvemshop, etc.)",
      category: "Instalação",
      readTime: "3 min de leitura",
      summary: "Aprenda o passo a passo para colar o script do Vidlytics e ativar os Stories em vídeo no seu e-commerce.",
      content: (
        <div className="space-y-4 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
          <p>
            A instalação do Vidlytics é extremamente simples e não exige conhecimentos de programação. Nosso widget roda de forma isolada usando <strong>Shadow DOM</strong>, o que impede qualquer interferência no design ou velocidade do seu site.
          </p>
          
          <h4 className="text-base font-black text-slate-950 dark:text-white mt-6">Passo 1: Copiar o Script Único</h4>
          <p>
            Vá até a página de <strong>Instalação</strong> no menu lateral do seu painel do Vidlytics e copie o código script gerado exclusivamente para a sua loja. Ele se parece com isso:
          </p>
          <pre className="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4 rounded-2xl overflow-x-auto text-xs font-mono">
            {`<script src="https://cdn.vidlytics.com.br/widget.js" data-store-id="SEU_ID_AQUI" defer></script>`}
          </pre>

          <h4 className="text-base font-black text-slate-950 dark:text-white mt-6">Passo 2: Inserir na sua Plataforma</h4>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Shopify:</strong> Acesse Loja Virtual &gt; Temas &gt; Editar Código. No arquivo <code>theme.liquid</code>, cole o código logo antes do fechamento da tag <code>{`</body>`}</code>.</li>
            <li><strong>Nuvemshop:</strong> Vá em Layout &gt; Configurações Avançadas e cole o script no campo de códigos de rastreamento do rodapé.</li>
            <li><strong>Yampi / Outros Cartões:</strong> Cole na seção de scripts globais do painel administrativo.</li>
          </ul>

          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-2xl mt-6">
            <span className="font-bold text-emerald-800 dark:text-emerald-400 block mb-1">Dica de Ouro:</span>
            O script é assíncrono (<code>defer</code>). Ele não atrasa o carregamento da sua página nem prejudica sua nota no Google PageSpeed.
          </div>
        </div>
      )
    },
    {
      id: "importar-videos",
      title: "Como importar vídeos do Instagram e TikTok automaticamente",
      category: "Vídeos & Integrações",
      readTime: "4 min de leitura",
      summary: "Sincronize suas contas de redes sociais para puxar seus Reels e TikToks diretamente para o Vidlytics em segundos.",
      content: (
        <div className="space-y-4 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
          <p>
            Ter que baixar os vídeos do seu celular e subir um por um no painel toma tempo. Por isso, o Vidlytics possui integração direta para importar seus vídeos de forma 100% automatizada.
          </p>

          <h4 className="text-base font-black text-slate-950 dark:text-white mt-6">Como funciona a importação:</h4>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Acesse a página de <strong>Stories</strong> e clique no botão <strong>Importar Vídeo</strong> ou <strong>Novo Vídeo</strong>.</li>
            <li>Selecione a rede de origem (Instagram ou TikTok).</li>
            <li>Se for a sua primeira vez, você será solicitado a autorizar nossa integração segura oficial (OAuth).</li>
            <li>Após autorizar, selecione os Reels ou TikToks que deseja trazer para sua galeria e clique em <strong>Importar Selecionados</strong>.</li>
          </ol>

          <h4 className="text-base font-black text-slate-950 dark:text-white mt-6">Perguntas Frequentes:</h4>
          <p>
            <strong>Os vídeos perdem qualidade?</strong> Não! Nós mantemos a resolução original de entrega das redes, otimizando o formato para carregar instantaneamente em dispositivos móveis.
          </p>
        </div>
      )
    },
    {
      id: "configurar-pixel",
      title: "Como configurar o Pixel e Conversões de Vendas",
      category: "Analytics & Pixel",
      readTime: "5 min de leitura",
      summary: "Entenda como o Vidlytics mapeia cliques em produtos, compras efetuadas e calcula o ROI dos seus stories em vídeo.",
      content: (
        <div className="space-y-4 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
          <p>
            Saber quantos clientes assistiram seus stories é bom, mas saber <strong>quantas vendas eles geraram</strong> é excelente. Nosso sistema de rastreamento nativo faz exatamente isso.
          </p>

          <h4 className="text-base font-black text-slate-950 dark:text-white mt-6">Como o rastreamento é feito?</h4>
          <p>
            Assim que você instala o nosso script de integração principal na sua loja, ele se encarrega de mapear as interações com o widget (visualização de vídeos, cliques em botões de compra, swipe ups).
          </p>

          <h4 className="text-base font-black text-slate-950 dark:text-white mt-6">Rastreando Conversões na Página de Obrigado</h4>
          <p>
            Para registrar o valor exato das vendas originadas pelos stories, certifique-se de que o script do Vidlytics está ativo também na sua página de checkout concluído (Thank You Page). Ele lê os parâmetros do pedido de forma anônima e segura, atribuindo a conversão ao vídeo assistido.
          </p>
        </div>
      )
    }
  ];

  // Filtro de Busca
  const filteredArticles = articles.filter(art => 
    art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    art.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    art.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in pb-20 font-sans max-w-4xl mx-auto">
      
      {/* Botão Voltar */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => selectedArticle ? setSelectedArticle(null) : navigate('/suporte')}
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} className="stroke-[2.5]" /> 
          {selectedArticle ? 'Voltar aos Artigos' : 'Voltar para Suporte'}
        </button>
      </div>

      {!selectedArticle ? (
        <>
          {/* Cabeçalho da Central */}
          <div className="text-center space-y-4 py-6">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 dark:text-white">
              Central de Ajuda & Artigos
            </h1>
            <p className="text-sm font-semibold text-slate-500 dark:text-[#c0c5d4] max-w-xl mx-auto">
              Pesquise por soluções rápidas para configurar a sua conta, integrar o widget e analisar as suas métricas.
            </p>

            {/* Barra de Busca */}
            <div className="relative max-w-lg mx-auto pt-2">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Ex: Como instalar widget, importar Reels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-[#1a1f35]/80 border border-slate-200 dark:border-slate-800 focus:border-[#0094EB] focus:ring-1 focus:ring-[#0094EB] rounded-2xl pl-12 pr-4 py-3.5 text-sm font-semibold shadow-sm outline-none transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Listagem de Artigos */}
          <div className="space-y-4">
            {filteredArticles.length > 0 ? (
              filteredArticles.map((article) => (
                <div 
                  key={article.id}
                  onClick={() => setSelectedArticle(article)}
                  className="bg-white dark:bg-[#1a1f35]/80 border border-slate-200 dark:border-slate-800 hover:border-[#0094EB] dark:hover:border-[#ff7a29]/30 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group"
                >
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg">
                        {article.category}
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-400 text-[11px] font-medium">
                        <Clock size={12} /> {article.readTime}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white group-hover:text-[#0094EB] dark:group-hover:text-[#ff7a29] transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-xs font-semibold text-slate-400 dark:text-[#8a90a0] line-clamp-2">
                      {article.summary}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-[#0f1220] flex items-center justify-center text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white transition-all shrink-0">
                    <ChevronRight size={18} className="stroke-[2.5]" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-white dark:bg-[#1a1f35]/80 border border-slate-200 dark:border-slate-800 rounded-[2.5rem]">
                <HelpCircle size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Nenhum artigo encontrado</h3>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1">
                  Tente buscar usando termos diferentes.
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Renderizador do Artigo Selecionado */
        <article className="bg-white dark:bg-[#1a1f35]/80 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 sm:p-10 shadow-sm animate-fade-in">
          <div className="space-y-4 border-b border-slate-100 dark:border-slate-800/80 pb-6 mb-6">
            <span className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-xl">
              {selectedArticle.category}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight leading-tight">
              {selectedArticle.title}
            </h1>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
              <Clock size={14} />
              <span>{selectedArticle.readTime}</span>
            </div>
          </div>

          {/* Conteúdo Dinâmico */}
          {selectedArticle.content}

          {/* Rodapé do Artigo */}
          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-6 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-black text-slate-900 dark:text-white">Este artigo foi útil?</h4>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-[#8a90a0]">Seu feedback nos ajuda a melhorar o produto.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-xl font-bold text-xs px-4"
                onClick={() => setSelectedArticle(null)}
              >
                Voltar
              </Button>
              <Button 
                size="sm" 
                className="bg-[#0094EB] hover:bg-[#0094EB]/90 text-white rounded-xl font-bold text-xs px-4"
                onClick={() => {
                  alert("Obrigado pelo feedback!");
                  setSelectedArticle(null);
                }}
              >
                Sim, ajudou!
              </Button>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}
