import React, { useState, useEffect } from 'react';
import { 
  Tv, 
  Smartphone, 
  Monitor, 
  Star, 
  Tag, 
  Gift, 
  AlertTriangle, 
  Send, 
  Users, 
  TrendingUp, 
  MessageSquare, 
  MousePointerClick, 
  ShoppingBag, 
  DollarSign, 
  X, 
  CheckCircle2, 
  Flame, 
  Heart, 
  Smile
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  url?: string;
  is_active?: boolean;
}

interface Coupon {
  id: string;
  code: string;
  discount: string;
  description?: string;
}

interface Advantage {
  id: string;
  title: string;
  icon?: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  isOfficial?: boolean;
  type?: 'text' | 'coupon' | 'alert';
}

export default function LiveAdmin() {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  
  // Destaques e Estados Ativos
  const [activeProductId, setActiveProductId] = useState<string | null>('prod-2');
  const [activeCouponId, setActiveCouponId] = useState<string | null>(null);
  const [activeAdvantageId, setActiveAdvantageId] = useState<string | null>(null);
  const [isUrgentAlertActive, setIsUrgentAlertActive] = useState<boolean>(false);
  const [urgentAlertText, setUrgentAlertText] = useState<string>('ÚLTIMAS PEÇAS DISPONÍVEIS!');

  // Mock inicial de dados (integrados à live)
  const [products] = useState<Product[]>([
    { id: 'prod-1', name: 'Calça Confort Bicolor Preto e Rosa Pink 46/48 - G', price: 154.95, image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=150&auto=format&fit=crop&q=60' },
    { id: 'prod-2', name: 'Blusa Confort - Verde Jade 46/48 - G', price: 149.95, image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=150&auto=format&fit=crop&q=60' },
    { id: 'prod-3', name: 'Calça Confort - Rosa Pink 42/44 - M', price: 149.95, image: 'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?w=150&auto=format&fit=crop&q=60' },
    { id: 'prod-4', name: 'Blusa Manga Longa Canelada Soft', price: 299.90, image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=150&auto=format&fit=crop&q=60' }
  ]);

  const [coupons] = useState<Coupon[]>([
    { id: 'c-1', code: 'LIVE10', discount: '10% OFF' },
    { id: 'c-2', code: 'FRETEGRATIS', discount: 'Frete Grátis acima de R$ 199' },
    { id: 'c-3', code: 'PRIMEIRACOMPRA', discount: 'R$ 20 OFF' }
  ]);

  const [advantages] = useState<Advantage[]>([
    { id: 'adv-1', title: 'Frete Grátis para todo Brasil' },
    { id: 'adv-2', title: 'Parcele em até 6x Sem Juros' },
    { id: 'adv-3', title: 'Brinde exclusivo nas compras de hoje' }
  ]);

  // Métricas
  const [metrics, setMetrics] = useState({
    activeViewers: 15,
    peakViewers: 42,
    messagesCount: 1,
    productClicks: 10,
    salesCount: 2,
    salesTotal: 200.00,
    lostSalesTotal: 800.00 // Pessoas que clicaram no produto mas não concluíram
  });

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'Você (Loja Oficial)', text: 'AVISO: Bem-vindos à nossa Super Live!', time: '10:00', isOfficial: true, type: 'alert' }
  ]);
  const [chatInput, setChatInput] = useState('');

  const activeProduct = products.find(p => p.id === activeProductId);
  const activeCoupon = coupons.find(c => c.id === activeCouponId);
  const activeAdvantage = advantages.find(a => a.id === activeAdvantageId);

  // Toggle Produto
  const toggleProduct = (id: string) => {
    setActiveProductId(prev => prev === id ? null : id);
  };

  // Toggle Cupom
  const toggleCoupon = (coupon: Coupon) => {
    if (activeCouponId === coupon.id) {
      setActiveCouponId(null);
    } else {
      setActiveCouponId(coupon.id);
      // Dispara aviso no chat oficial
      const msg: ChatMessage = {
        id: String(Date.now()),
        sender: 'Loja Oficial',
        text: `🏷️ Cupom ativado: use ${coupon.code} para ${coupon.discount}!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOfficial: true,
        type: 'coupon'
      };
      setMessages(prev => [...prev, msg]);
      setMetrics(m => ({ ...m, messagesCount: m.messagesCount + 1 }));
    }
  };

  // Toggle Vantagem
  const toggleAdvantage = (adv: Advantage) => {
    if (activeAdvantageId === adv.id) {
      setActiveAdvantageId(null);
    } else {
      setActiveAdvantageId(adv.id);
    }
  };

  // Enviar Mensagem Chat
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'Você (Loja Oficial)',
      text: chatInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOfficial: true,
      type: 'text'
    };

    setMessages(prev => [...prev, newMsg]);
    setMetrics(m => ({ ...m, messagesCount: m.messagesCount + 1 }));
    setChatInput('');
  };

  const handleQuickEmoji = (emoji: string) => {
    setChatInput(prev => prev + emoji);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0a0f1d] text-slate-100 overflow-hidden font-sans p-3 md:p-5 select-none">
      
      {/* BARRA DE TOPO */}
      <header className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3 px-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-red-600/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full text-xs font-bold tracking-wider">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block" />
            AO VIVO
          </div>
          <h1 className="text-base md:text-lg font-bold text-white tracking-wide">
            LIVE TRANSMISSÃO <span className="text-xs text-slate-400 font-normal ml-1">ID: 6461b26d</span>
          </h1>
        </div>

        <button 
          onClick={() => window.history.back()}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition"
        >
          <X className="w-4 h-4" /> Fechar Painel
        </button>
      </header>

      {/* ÁREA PRINCIPAL (3 COLUNAS) */}
      <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden min-h-0">
        
        {/* COLUNA 1: MONITOR DE TRANSMISSÃO AO VIVO (5 COLUNAS) */}
        <section className="col-span-12 lg:col-span-5 flex flex-col bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden p-3 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Monitor ao Vivo
            </span>

            {/* Alternador Desktop / Mobile */}
            <div className="flex bg-slate-800/90 p-1 rounded-lg border border-slate-700/60 text-xs">
              <button 
                onClick={() => setViewMode('desktop')} 
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${viewMode === 'desktop' ? 'bg-red-600 text-white font-medium shadow' : 'text-slate-400 hover:text-white'}`}
              >
                <Monitor className="w-3.5 h-3.5" /> Desktop
              </button>
              <button 
                onClick={() => setViewMode('mobile')} 
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${viewMode === 'mobile' ? 'bg-red-600 text-white font-medium shadow' : 'text-slate-400 hover:text-white'}`}
              >
                <Smartphone className="w-3.5 h-3.5" /> Mobile
              </button>
            </div>
          </div>

          {/* Player Viewport */}
          <div className="flex-1 bg-black rounded-lg relative overflow-hidden flex items-center justify-center border border-slate-800">
            {/* Imagem do feed ou stream */}
            <div className={`relative transition-all duration-300 h-full flex items-center justify-center ${viewMode === 'mobile' ? 'w-[280px] border-x border-slate-800' : 'w-full'}`}>
              <img 
                src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80" 
                alt="Feed da Live" 
                className="w-full h-full object-cover opacity-80"
              />

              {/* OVERLAYS NA TELA DO MONITOR */}

              {/* Topo do Player: Cupom e Vantagens Ativas */}
              <div className="absolute top-3 left-3 right-3 flex flex-col gap-1.5 z-20 pointer-events-none">
                {activeCoupon && (
                  <div className="self-start bg-amber-500/90 backdrop-blur-md text-slate-950 font-bold text-xs px-3 py-1 rounded-md shadow-lg flex items-center gap-1.5 animate-bounce">
                    <Tag className="w-3.5 h-3.5" /> CUPOM: {activeCoupon.code} ({activeCoupon.discount})
                  </div>
                )}
                {activeAdvantage && (
                  <div className="self-start bg-indigo-600/90 backdrop-blur-md text-white font-semibold text-xs px-3 py-1 rounded-md shadow flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-indigo-200" /> {activeAdvantage.title}
                  </div>
                )}
              </div>

              {/* Rodapé do Player: Alertas e Card de Produto */}
              <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-2 z-20 pointer-events-none">
                
                {/* Alerta Urgente (Posicionado em cima do produto se houver produto ativo) */}
                {isUrgentAlertActive && (
                  <div className="w-full bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white font-extrabold text-center text-xs py-1.5 px-3 rounded-lg shadow-xl uppercase tracking-wider animate-pulse border border-red-300 flex items-center justify-center gap-2">
                    <AlertTriangle className="w-4 h-4 fill-white text-red-600" />
                    {urgentAlertText}
                  </div>
                )}

                {/* Card de Produto Destacado */}
                {activeProduct && (
                  <div className="bg-slate-950/85 backdrop-blur-md border border-emerald-500/60 p-2.5 rounded-xl shadow-2xl flex items-center gap-3">
                    <img 
                      src={activeProduct.image} 
                      alt={activeProduct.name} 
                      className="w-12 h-12 object-cover rounded-lg border border-slate-700" 
                    />
                    <div className="flex-1 min-w-0 text-left">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">★ DESTAQUE ATIVO</span>
                      <h4 className="text-xs font-semibold text-white truncate">{activeProduct.name}</h4>
                      <p className="text-xs font-black text-emerald-400">R$ {activeProduct.price.toFixed(2).replace('.', ',')}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Barra de Ação Rápida de Alerta Urgente */}
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center gap-2">
            <input 
              type="text" 
              value={urgentAlertText}
              onChange={(e) => setUrgentAlertText(e.target.value)}
              placeholder="Aviso urgente (ex: Últimas 3 peças!)" 
              className="flex-1 bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
            />
            <button 
              onClick={() => setIsUrgentAlertActive(!isUrgentAlertActive)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow ${
                isUrgentAlertActive 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {isUrgentAlertActive ? 'Remover Alerta' : 'Lançar Alerta'}
            </button>
          </div>
        </section>

        {/* COLUNA 2: PRODUTOS, CUPONS E VANTAGENS (4 COLUNAS) */}
        <section className="col-span-12 lg:col-span-4 flex flex-col bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden p-3 shadow-lg">
          
          <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
            
            {/* 1. SEÇÃO DE PRODUTOS */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-emerald-400" /> Produtos na Live ({products.length})
                </h3>
                {activeProductId && (
                  <button 
                    onClick={() => setActiveProductId(null)} 
                    className="text-[11px] text-slate-400 hover:text-rose-400 transition"
                  >
                    Remover Destaque
                  </button>
                )}
              </div>
              
              <div className="flex flex-col gap-2">
                {products.map(prod => {
                  const isSelected = activeProductId === prod.id;
                  return (
                    <div 
                      key={prod.id} 
                      onClick={() => toggleProduct(prod.id)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition border ${
                        isSelected 
                          ? 'bg-emerald-950/40 border-emerald-500/80 shadow' 
                          : 'bg-slate-950/50 hover:bg-slate-800/60 border-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img src={prod.image} alt={prod.name} className="w-10 h-10 object-cover rounded-md border border-slate-800" />
                        <div className="min-w-0">
                          <h4 className="text-xs font-medium text-slate-200 truncate">{prod.name}</h4>
                          <span className="text-xs font-bold text-slate-100">R$ {prod.price.toFixed(2).replace('.', ',')}</span>
                          {isSelected && (
                            <span className="block text-[10px] text-emerald-400 font-medium">● Ao vivo no player</span>
                          )}
                        </div>
                      </div>
                      <button className={`p-1.5 rounded-full ${isSelected ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 hover:text-slate-300'}`}>
                        <Star className={`w-4 h-4 ${isSelected ? 'fill-emerald-400' : ''}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. SEÇÃO DE CUPONS CADASTRADOS */}
            <div className="pt-3 border-t border-slate-800/70">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-amber-400" /> Cupons Cadastrados ({coupons.length})
                </h3>
                {activeCouponId && (
                  <button 
                    onClick={() => setActiveCouponId(null)} 
                    className="text-[11px] text-slate-400 hover:text-rose-400 transition"
                  >
                    Desativar Cupom
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {coupons.map(coupon => {
                  const isSelected = activeCouponId === coupon.id;
                  return (
                    <button
                      key={coupon.id}
                      onClick={() => toggleCoupon(coupon)}
                      className={`flex items-center justify-between p-2 rounded-lg text-left text-xs transition border ${
                        isSelected 
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-semibold' 
                          : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-amber-400" />
                        <span><strong>{coupon.code}</strong> — {coupon.discount}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded ${isSelected ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}>
                        {isSelected ? 'ATIVO' : 'ATIVAR'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. SEÇÃO DE VANTAGENS / BENEFÍCIOS */}
            <div className="pt-3 border-t border-slate-800/70">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-indigo-400" /> Vantagens e Benefícios ({advantages.length})
                </h3>
                {activeAdvantageId && (
                  <button 
                    onClick={() => setActiveAdvantageId(null)} 
                    className="text-[11px] text-slate-400 hover:text-rose-400 transition"
                  >
                    Desativar
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {advantages.map(adv => {
                  const isSelected = activeAdvantageId === adv.id;
                  return (
                    <button
                      key={adv.id}
                      onClick={() => toggleAdvantage(adv)}
                      className={`flex items-center justify-between p-2 rounded-lg text-left text-xs transition border ${
                        isSelected 
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-medium' 
                          : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Gift className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{adv.title}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded ${isSelected ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800 text-slate-400'}`}>
                        {isSelected ? 'EXIBINDO' : 'EXIBIR'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </section>

        {/* COLUNA 3: MÉTRICAS GRANDES + CHAT COMPACTO (3 COLUNAS) */}
        <section className="col-span-12 lg:col-span-3 flex flex-col gap-3 overflow-hidden">
          
          {/* CARDS DE MÉTRICAS ROBUSTOS (QUADRADINHOS) */}
          <div className="grid grid-cols-2 gap-2">
            
            {/* Espectadores Ao Vivo */}
            <div className="bg-slate-900/70 border border-slate-800 p-2.5 rounded-xl flex flex-col">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-1 font-medium">
                <Users className="w-3.5 h-3.5 text-cyan-400" /> Ao Vivo
              </span>
              <span className="text-xl font-black text-white">{metrics.activeViewers}</span>
            </div>

            {/* Pico de Audiência */}
            <div className="bg-slate-900/70 border border-slate-800 p-2.5 rounded-xl flex flex-col">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-1 font-medium">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" /> Pico
              </span>
              <span className="text-xl font-black text-white">{metrics.peakViewers}</span>
            </div>

            {/* Cliques em Produtos */}
            <div className="bg-slate-900/70 border border-slate-800 p-2.5 rounded-xl flex flex-col">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-1 font-medium">
                <MousePointerClick className="w-3.5 h-3.5 text-indigo-400" /> Cliques Prod.
              </span>
              <span className="text-xl font-black text-white">{metrics.productClicks}</span>
            </div>

            {/* Total Mensagens */}
            <div className="bg-slate-900/70 border border-slate-800 p-2.5 rounded-xl flex flex-col">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-1 font-medium">
                <MessageSquare className="w-3.5 h-3.5 text-pink-400" /> Mensagens
              </span>
              <span className="text-xl font-black text-white">{metrics.messagesCount}</span>
            </div>

            {/* Vendas Realizadas */}
            <div className="bg-emerald-950/30 border border-emerald-500/40 p-2.5 rounded-xl flex flex-col">
              <span className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Vendido
              </span>
              <span className="text-base font-black text-emerald-400">
                R$ {metrics.salesTotal.toFixed(2).replace('.', ',')}
              </span>
            </div>

            {/* Vendas Perdidas / Oportunidade */}
            <div className="bg-rose-950/30 border border-rose-500/40 p-2.5 rounded-xl flex flex-col">
              <span className="text-[11px] text-rose-300 font-semibold flex items-center gap-1 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Não Comprado
              </span>
              <span className="text-base font-black text-rose-400">
                R$ {metrics.lostSalesTotal.toFixed(2).replace('.', ',')}
              </span>
            </div>

          </div>

          {/* CHAT AO VIVO (ALTURA OTIMIZADA) */}
          <div className="flex-1 flex flex-col bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden p-3 min-h-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" /> Chat ao Vivo
              </span>
              <span className="text-[10px] text-slate-400">Canal Oficial</span>
            </div>

            {/* Lista de Mensagens */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
              {messages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`p-2 rounded-lg ${
                    msg.type === 'coupon' 
                      ? 'bg-amber-950/40 border border-amber-500/50 text-amber-200' 
                      : msg.type === 'alert'
                      ? 'bg-rose-950/40 border border-rose-500/50 text-rose-200'
                      : 'bg-slate-950/60 border border-slate-800/70 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-[11px] text-white flex items-center gap-1">
                      {msg.isOfficial && <span className="text-amber-400">★</span>} {msg.sender}
                    </span>
                    <span className="text-[9px] text-slate-400">{msg.time}</span>
                  </div>
                  <p className="break-words">{msg.text}</p>
                </div>
              ))}
            </div>

            {/* Reações e Atalhos */}
            <div className="flex items-center gap-1 pt-2 pb-1 text-xs">
              {['🔥', '❤️', '👏', '🎉'].map(emoji => (
                <button 
                  key={emoji}
                  onClick={() => handleQuickEmoji(emoji)} 
                  className="bg-slate-800/60 hover:bg-slate-700 px-2 py-0.5 rounded text-xs transition"
                >
                  {emoji}
                </button>
              ))}
              <button 
                onClick={() => setChatInput('Corre que está acabando!')}
                className="bg-slate-800/60 hover:bg-slate-700 px-2 py-0.5 rounded text-[10px] text-slate-300 ml-auto"
              >
                Corre que tá acabando!
              </button>
            </div>

            {/* Input de Envio */}
            <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 pt-1">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Responder como Loja Oficial..." 
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
              <button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded-lg transition"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

        </section>

      </div>
    </div>
  );
}
