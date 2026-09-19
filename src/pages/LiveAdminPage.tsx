import React, { useState } from 'react';
import { 
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
  Volume2,
  Share2,
  Calendar,
  ShoppingCart,
  MessageCircle
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  originalPrice: number;
  price: number;
  image: string;
}

interface Coupon {
  id: string;
  code: string;
  discount: string;
}

interface Advantage {
  id: string;
  title: string;
  subtitle: string;
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
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('mobile');
  
  // Destaques e Estados Ativos
  const [activeProductId, setActiveProductId] = useState<string | null>('prod-1');
  const [activeCouponId, setActiveCouponId] = useState<string | null>('c-1');
  const [activeAdvantageId, setActiveAdvantageId] = useState<string | null>('adv-1');
  const [isUrgentAlertActive, setIsUrgentAlertActive] = useState<boolean>(false);
  const [urgentAlertText, setUrgentAlertText] = useState<string>('ÚLTIMAS PEÇAS DISPONÍVEIS!');

  // Produtos
  const [products] = useState<Product[]>([
    { 
      id: 'prod-1', 
      name: 'Bolsa Couro Legítimo Alça Dupla Luxo', 
      originalPrice: 399.90, 
      price: 299.00, 
      image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300&auto=format&fit=crop&q=80' 
    },
    { 
      id: 'prod-2', 
      name: 'Calça Confort Bicolor Preto e Rosa Pink 46/48 - G', 
      originalPrice: 199.90, 
      price: 154.95, 
      image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=300&auto=format&fit=crop&q=80' 
    },
    { 
      id: 'prod-3', 
      name: 'Blusa Confort - Verde Jade 46/48 - G', 
      originalPrice: 189.90, 
      price: 149.95, 
      image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=300&auto=format&fit=crop&q=80' 
    },
    { 
      id: 'prod-4', 
      name: 'Blusa Manga Longa Canelada Soft', 
      originalPrice: 350.00, 
      price: 299.90, 
      image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=300&auto=format&fit=crop&q=80' 
    }
  ]);

  // Cupons
  const [coupons] = useState<Coupon[]>([
    { id: 'c-1', code: 'VIDLYTICS10', discount: '10% OFF' },
    { id: 'c-2', code: 'FRETEGRATIS', discount: 'Frete Grátis' },
    { id: 'c-3', code: 'LIVE20', discount: 'R$ 20 OFF' }
  ]);

  // Vantagens / Benefícios
  const [advantages] = useState<Advantage[]>([
    { id: 'adv-1', title: 'FRETE GRÁTIS', subtitle: 'Acima de R$ 199,00' },
    { id: 'adv-2', title: 'PARCELAMENTO', subtitle: 'Até 6x Sem Juros' },
    { id: 'adv-3', title: 'BRINDE ESPECIAL', subtitle: 'Nas compras de hoje' }
  ]);

  // Métricas
  const [metrics, setMetrics] = useState({
    activeViewers: 15,
    peakViewers: 42,
    messagesCount: 4,
    productClicks: 10,
    salesTotal: 200.00,
    lostSalesTotal: 800.00
  });

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'Você (Loja Oficial)', text: 'AVISO: Bem-vindos à nossa Super Live!', time: '10:00', isOfficial: true, type: 'alert' },
    { id: '2', sender: 'Loja Oficial', text: '🏷️ Cupom ativado: use VIDLYTICS10 para 10% OFF!', time: '10:02', isOfficial: true, type: 'coupon' }
  ]);
  const [chatInput, setChatInput] = useState('');

  const activeProduct = products.find(p => p.id === activeProductId);
  const activeCoupon = coupons.find(c => c.id === activeCouponId);
  const activeAdvantage = advantages.find(a => a.id === activeAdvantageId);

  const toggleProduct = (id: string) => {
    setActiveProductId(prev => prev === id ? null : id);
  };

  const toggleCoupon = (coupon: Coupon) => {
    if (activeCouponId === coupon.id) {
      setActiveCouponId(null);
    } else {
      setActiveCouponId(coupon.id);
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

  const toggleAdvantage = (adv: Advantage) => {
    setActiveAdvantageId(prev => prev === adv.id ? null : adv.id);
  };

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

  return (
    <div className="flex flex-col h-screen w-full bg-[#0a0f1d] text-slate-100 overflow-hidden font-sans p-3 md:p-4 select-none">
      
      {/* HEADER SUPERIOR */}
      <header className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 px-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-red-600/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full text-xs font-bold tracking-wider">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block" />
            AO VIVO
          </div>
          <h1 className="text-sm md:text-base font-bold text-white tracking-wide">
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

      {/* ÁREA DE CONTEÚDO (3 COLUNAS) */}
      <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden min-h-0">
        
        {/* COLUNA 1: MONITOR DE TRANSMISSÃO */}
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

          {/* VIEWPORT DO MONITOR COM PROPORÇÃO CORRETA */}
          <div className="flex-1 bg-black/90 rounded-xl relative overflow-hidden flex items-center justify-center border border-slate-800/80 p-2">
            
            {/* CONTAINER COM PROPORÇÃO MOBILE 9:16 OU FULL NO DESKTOP */}
            <div className={`relative transition-all duration-300 h-full max-h-[580px] overflow-hidden ${
              viewMode === 'mobile' 
                ? 'aspect-[9/16] rounded-[28px] border-4 border-slate-700 shadow-2xl' 
                : 'w-full rounded-lg'
            }`}>
              
              {/* FEED DA LIVE */}
              <img 
                src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80" 
                alt="Feed da Live" 
                className="w-full h-full object-cover"
              />

              {/* OVERLAY DE SIMULAÇÃO MOBILE (IGUAL AO SEU PRINT 2) */}
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 bg-gradient-to-b from-black/40 via-transparent to-black/60">
                
                {/* 1. TOPO: HEADER DA LIVE MOBILE */}
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#0284c7] text-white flex items-center justify-center font-bold text-[10px] shadow border border-white/40">
                      USE
                    </div>
                    <span className="text-white font-bold text-xs drop-shadow">Vidlytics Live</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-[#0284c7] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                      <span className="w-1.5 h-1.5 bg-white rounded-sm inline-block" /> LIVE
                    </div>
                    <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full border border-white/20">
                      <Users className="w-2.5 h-2.5" /> {metrics.activeViewers}
                    </div>
                  </div>
                </div>

                {/* 2. LATERAL ESQUERDA: CUPOM E VANTAGEM (ESTILO DO SEU PRINT 2) */}
                <div className="absolute top-12 left-3 flex flex-col gap-2 z-20">
                  {/* Card Cupom Idêntico ao Print */}
                  {activeCoupon && (
                    <div className="w-28 rounded-md overflow-hidden shadow-xl border border-sky-300/40 text-center animate-fadeIn">
                      <div className="bg-[#0099ff] text-white font-black text-[9px] py-0.5 tracking-wider uppercase">
                        {activeCoupon.code}
                      </div>
                      <div className="bg-white text-slate-900 font-extrabold text-[10px] py-0.5">
                        {activeCoupon.discount}
                      </div>
                    </div>
                  )}

                  {/* Card Vantagem Idêntico ao Print */}
                  {activeAdvantage && (
                    <div className="w-28 rounded-md overflow-hidden shadow-xl border border-sky-300/40 text-center animate-fadeIn">
                      <div className="bg-[#0099ff] text-white font-black text-[9px] py-0.5 tracking-wider uppercase">
                        {activeAdvantage.title}
                      </div>
                      <div className="bg-white text-slate-700 font-bold text-[9px] py-0.5 leading-tight px-1">
                        {activeAdvantage.subtitle}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. LATERAL DIREITA: BOTÕES DE INTERAÇÃO FLUTUANTES (PRINT 2) */}
                <div className="absolute right-2.5 top-1/4 flex flex-col items-center gap-2.5 z-20">
                  <div className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white/90 shadow border border-white/10">
                    <Volume2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white/90 shadow border border-white/10">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <div className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white/90 shadow border border-white/10">
                    <Share2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white/90 shadow border border-white/10">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <div className="relative w-7 h-7 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white/90 shadow border border-white/10">
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[8px] font-bold px-1 rounded-full">
                      {products.length}
                    </span>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-[#25D366] flex items-center justify-center text-white shadow">
                    <MessageCircle className="w-4 h-4 fill-white" />
                  </div>
                </div>

                {/* 4. RODAPÉ: AVISO URGENTE + CARD DE PRODUTO IDÊNTICO AO PRINT 2 */}
                <div className="w-full flex flex-col gap-1.5 z-20 mt-auto">
                  
                  {/* Aviso Urgente logo acima do card */}
                  {isUrgentAlertActive && (
                    <div className="w-full bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white font-black text-center text-[10px] py-1 px-2 rounded-md shadow-xl uppercase tracking-wider animate-pulse flex items-center justify-center gap-1.5 border border-red-300">
                      <AlertTriangle className="w-3 h-3 text-white fill-white" />
                      {urgentAlertText}
                    </div>
                  )}

                  {/* Card do Produto Idêntico ao Print de Aparência */}
                  {activeProduct && (
                    <div className="w-full bg-white text-slate-900 rounded-xl p-2 shadow-2xl border-2 border-[#00a6ff] flex items-center gap-2 animate-slideUp">
                      <img 
                        src={activeProduct.image} 
                        alt={activeProduct.name} 
                        className="w-11 h-11 object-cover rounded-md border border-slate-200 shrink-0" 
                      />
                      
                      <div className="flex-1 min-w-0 text-left leading-tight">
                        <div className="flex items-center gap-1">
                          <h4 className="text-[11px] font-bold text-slate-900 truncate">
                            {activeProduct.name}
                          </h4>
                          <span className="text-[9px] font-black text-[#0099ff] bg-sky-100 px-1 py-0.2 rounded shrink-0">
                            NA LIVE
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-400 line-through block mt-0.5">
                          De: R$ {activeProduct.originalPrice.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-xs font-black text-[#0088e0] block">
                          Por: R$ {activeProduct.price.toFixed(2).replace('.', ',')}
                        </span>
                      </div>

                      {/* Botão de Carrinho */}
                      <div className="w-8 h-8 rounded-full bg-[#0099ff] flex items-center justify-center text-white shadow-md shrink-0">
                        <ShoppingCart className="w-4 h-4 fill-white" />
                      </div>
                    </div>
                  )}

                </div>

              </div>
            </div>
          </div>

          {/* Lançamento de Alerta Rápido */}
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center gap-2">
            <input 
              type="text" 
              value={urgentAlertText}
              onChange={(e) => setUrgentAlertText(e.target.value)}
              placeholder="Aviso urgente (ex: Últimas 3 peças!)" 
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
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

        {/* COLUNA 2: PRODUTOS, CUPONS E VANTAGENS */}
        <section className="col-span-12 lg:col-span-4 flex flex-col bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden p-3 shadow-lg">
          <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
            
            {/* 1. PRODUTOS */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-emerald-400" /> Produtos na Live ({products.length})
                </h3>
                {activeProductId && (
                  <button onClick={() => setActiveProductId(null)} className="text-[11px] text-slate-400 hover:text-rose-400 transition">
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
                          ? 'bg-emerald-950/40 border-emerald-500 shadow' 
                          : 'bg-slate-950/50 hover:bg-slate-800/60 border-slate-800'
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

            {/* 2. CUPONS */}
            <div className="pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-sky-400" /> Cupons Cadastrados ({coupons.length})
                </h3>
                {activeCouponId && (
                  <button onClick={() => setActiveCouponId(null)} className="text-[11px] text-slate-400 hover:text-rose-400 transition">
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
                          ? 'bg-sky-500/15 border-sky-500 text-sky-300 font-semibold' 
                          : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-sky-400" />
                        <span><strong>{coupon.code}</strong> — {coupon.discount}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${isSelected ? 'bg-[#0099ff] text-white' : 'bg-slate-800 text-slate-400'}`}>
                        {isSelected ? 'ATIVO' : 'ATIVAR'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. VANTAGENS */}
            <div className="pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-indigo-400" /> Vantagens e Benefícios ({advantages.length})
                </h3>
                {activeAdvantageId && (
                  <button onClick={() => setActiveAdvantageId(null)} className="text-[11px] text-slate-400 hover:text-rose-400 transition">
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
                          ? 'bg-sky-500/15 border-sky-500 text-sky-300 font-semibold' 
                          : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Gift className="w-3.5 h-3.5 text-sky-400" />
                        <span><strong>{adv.title}</strong> — {adv.subtitle}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${isSelected ? 'bg-[#0099ff] text-white' : 'bg-slate-800 text-slate-400'}`}>
                        {isSelected ? 'EXIBINDO' : 'EXIBIR'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </section>

        {/* COLUNA 3: MÉTRICAS + CHAT */}
        <section className="col-span-12 lg:col-span-3 flex flex-col gap-3 overflow-hidden">
          
          {/* CARDS DE MÉTRICAS */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-900/70 border border-slate-800 p-2.5 rounded-xl">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-1 font-medium">
                <Users className="w-3.5 h-3.5 text-cyan-400" /> Ao Vivo
              </span>
              <span className="text-xl font-black text-white">{metrics.activeViewers}</span>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 p-2.5 rounded-xl">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-1 font-medium">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" /> Pico
              </span>
              <span className="text-xl font-black text-white">{metrics.peakViewers}</span>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 p-2.5 rounded-xl">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-1 font-medium">
                <MousePointerClick className="w-3.5 h-3.5 text-indigo-400" /> Cliques Prod.
              </span>
              <span className="text-xl font-black text-white">{metrics.productClicks}</span>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 p-2.5 rounded-xl">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-1 font-medium">
                <MessageSquare className="w-3.5 h-3.5 text-pink-400" /> Mensagens
              </span>
              <span className="text-xl font-black text-white">{metrics.messagesCount}</span>
            </div>

            <div className="bg-emerald-950/30 border border-emerald-500/40 p-2.5 rounded-xl">
              <span className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Vendido
              </span>
              <span className="text-base font-black text-emerald-400">
                R$ {metrics.salesTotal.toFixed(2).replace('.', ',')}
              </span>
            </div>

            <div className="bg-rose-950/30 border border-rose-500/40 p-2.5 rounded-xl">
              <span className="text-[11px] text-rose-300 font-semibold flex items-center gap-1 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Não Comprado
              </span>
              <span className="text-base font-black text-rose-400">
                R$ {metrics.lostSalesTotal.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>

          {/* CHAT */}
          <div className="flex-1 flex flex-col bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden p-3 min-h-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" /> Chat ao Vivo
              </span>
              <span className="text-[10px] text-slate-400">Canal Oficial</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
              {messages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`p-2 rounded-lg ${
                    msg.type === 'coupon' 
                      ? 'bg-sky-950/40 border border-sky-500/50 text-sky-200' 
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

            <div className="flex items-center gap-1 pt-2 pb-1 text-xs">
              {['🔥', '❤️', '👏', '🎉'].map(emoji => (
                <button 
                  key={emoji}
                  onClick={() => setChatInput(prev => prev + emoji)} 
                  className="bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-xs transition"
                >
                  {emoji}
                </button>
              ))}
              <button 
                onClick={() => setChatInput('Corre que está acabando!')}
                className="bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-[10px] text-slate-300 ml-auto"
              >
                Corre que tá acabando!
              </button>
            </div>

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
