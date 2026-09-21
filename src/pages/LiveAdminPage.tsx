import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useLiveChat } from '@/hooks/useLiveChat';
import { useLiveSpotlight } from '@/hooks/useLiveSpotlight';
import { MODULES } from '@/lib/modules';
import {
  Smartphone, Monitor, Star, Tag, Gift, AlertTriangle, Send, Users,
  TrendingUp, MessageSquare, MousePointerClick, ShoppingBag, DollarSign,
  X, Volume2, Share2, Calendar, ShoppingCart, MessageCircle, Loader2
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  originalPrice: number;
  price: number;
  image: string;
}

interface Coupon {
  code: string;
  description: string;
}

interface Advantage {
  title: string;
  description: string;
}

export default function LiveAdmin() {
  const { liveId } = useParams<{ liveId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [liveTitle, setLiveTitle] = useState('');
  const [accentColor, setAccentColor] = useState('#0099ff');
  const [storeId, setStoreId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('mobile');

  const [isUrgentAlertActive, setIsUrgentAlertActive] = useState<boolean>(false);
  const [urgentAlertText, setUrgentAlertText] = useState<string>('ÚLTIMAS PEÇAS DISPONÍVEIS!');

  const [products, setProducts] = useState<Product[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [advantages, setAdvantages] = useState<Advantage[]>([]);

  const [metrics, setMetrics] = useState({
    activeViewers: 0,
    peakViewers: 0,
    messagesCount: 0,
    productClicks: 0,
    salesTotal: 0,
    lostSalesTotal: 0
  });

  const [chatInput, setChatInput] = useState('');

  // Spotlight sincronizado em tempo real (produto, cupom, vantagem)
  const [initialSpotlight, setInitialSpotlight] = useState<{
    productId: string | null;
    couponCode: string | null;
    advantageIdx: number | null;
  }>({ productId: null, couponCode: null, advantageIdx: null });

  const { spotlight, updateSpotlight, error: spotlightError } = useLiveSpotlight(liveId || null, initialSpotlight);
  const { messages, sendMessage, error: chatError } = useLiveChat(liveId || null, storeId);

  useEffect(() => {
    if (!liveId) return;

    const loadLiveData = async () => {
      setLoading(true);

      const { data: live, error } = await supabase
        .from('lives')
        .select('title, store_id, featured_product_ids, coupons, advantages, live_widget_config, spotlight_product_id, spotlight_coupon_code, spotlight_advantage_idx')
        .eq('id', liveId)
        .maybeSingle();

      if (error || !live) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setLiveTitle(live.title || 'Live sem título');
      setStoreId(live.store_id || null);

      const widgetConfig = live.live_widget_config as any;
      const themeColor =
        widgetConfig?.aoVivo?.desktop?.ctaBgColor ||
        widgetConfig?.divulgacao?.desktop?.borderColor ||
        '#0099ff';
      setAccentColor(themeColor);

      setCoupons(Array.isArray(live.coupons) ? live.coupons : []);
      setAdvantages(Array.isArray(live.advantages) ? live.advantages : []);

      const productIds: string[] = live.featured_product_ids || [];
      let defaultProductId: string | null = live.spotlight_product_id || null;

      if (productIds.length > 0) {
        const { data: prods } = await supabase
          .from('products')
          .select('id, name, price, image_url')
          .in('id', productIds);

        if (prods) {
          const mapped: Product[] = prods.map((p: any) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            originalPrice: p.price,
            image: p.image_url || 'https://placehold.co/300x300?text=Produto'
          }));
          setProducts(mapped);
          if (!defaultProductId && mapped.length > 0) {
            defaultProductId = mapped[0].id;
          }
        }
      }

      setInitialSpotlight({
        productId: defaultProductId,
        couponCode: live.spotlight_coupon_code || null,
        advantageIdx: live.spotlight_advantage_idx ?? null
      });

      setLoading(false);
    };

    loadLiveData();
  }, [liveId]);

  useEffect(() => {
    setMetrics((m) => ({ ...m, messagesCount: messages.length }));
  }, [messages.length]);

  const activeProduct = products.find(p => p.id === spotlight.productId);
  const activeCoupon = coupons.find(c => c.code === spotlight.couponCode);
  const activeAdvantage = spotlight.advantageIdx !== null ? advantages[spotlight.advantageIdx] : undefined;

  const toggleProduct = (id: string) => {
    updateSpotlight({ productId: spotlight.productId === id ? null : id });
  };

  const toggleCoupon = (coupon: Coupon) => {
    if (spotlight.couponCode === coupon.code) {
      updateSpotlight({ couponCode: null });
    } else {
      updateSpotlight({ couponCode: coupon.code });
      sendMessage('Loja Oficial', `🏷️ Cupom ativado: use ${coupon.code} para ${coupon.description}!`, true).catch(console.error);
    }
  };

  const toggleAdvantage = (idx: number) => {
    updateSpotlight({ advantageIdx: spotlight.advantageIdx === idx ? null : idx });
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;
    sendMessage('Você (Loja Oficial)', chatInput, true).catch(console.error);
    setChatInput('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-[#0a0f1d] text-slate-300">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando painel da live...
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full bg-[#0a0f1d] text-slate-300 gap-3">
        <AlertTriangle className="w-8 h-8 text-rose-500" />
        <p className="text-sm">Live não encontrada ou você não tem acesso a ela.</p>
        <button
          onClick={() => navigate('/live-commerce')}
          className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700"
        >
          Voltar para Live Commerce
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#0a0f1d] text-slate-100 overflow-hidden font-sans p-3 md:p-4 select-none">

      {(spotlightError || chatError) && (
        <div className="flex items-center gap-2 bg-rose-950/60 border border-rose-600/40 text-rose-300 text-xs px-3 py-2 rounded-lg mb-2 mx-1">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{spotlightError || chatError}</span>
        </div>
      )}

      <header className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 px-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-red-600/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full text-xs font-bold tracking-wider">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block" />
            AO VIVO
          </div>
          <h1 className="text-sm md:text-base font-bold text-white tracking-wide">
            {liveTitle.toUpperCase()}{' '}
            <span className="text-xs text-slate-400 font-normal ml-1">ID: {liveId?.slice(0, 8)}</span>
          </h1>
        </div>

        <button
          onClick={() => navigate('/live-commerce')}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition"
        >
          <X className="w-4 h-4" /> Fechar Painel
        </button>
      </header>

      <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden min-h-0">

        <section className="col-span-12 lg:col-span-5 flex flex-col bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden p-3 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Monitor ao Vivo
            </span>

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

          <div className="flex-1 bg-black/90 rounded-xl relative overflow-hidden flex items-center justify-center border border-slate-800/80 p-2">
            <div className={`relative transition-all duration-300 h-full max-h-[580px] overflow-hidden ${
              viewMode === 'mobile'
                ? 'aspect-[9/16] rounded-[28px] border-4 border-slate-700 shadow-2xl'
                : 'w-full rounded-lg'
            }`}>

              <img
                src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80"
                alt="Feed da Live"
                className="w-full h-full object-cover"
              />

              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 bg-gradient-to-b from-black/40 via-transparent to-black/60">

                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold text-[10px] shadow border border-white/40"
                      style={{ backgroundColor: accentColor }}
                    >
                      USE
                    </div>
                    <span className="text-white font-bold text-xs drop-shadow">{liveTitle}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className="flex items-center gap-1 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow"
                      style={{ backgroundColor: accentColor }}
                    >
                      <span className="w-1.5 h-1.5 bg-white rounded-sm inline-block" /> LIVE
                    </div>
                    <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full border border-white/20">
                      <Users className="w-2.5 h-2.5" /> {metrics.activeViewers}
                    </div>
                  </div>
                </div>

                <div className="absolute top-12 left-3 flex flex-col gap-2 z-20">
                  {activeCoupon && (
                    <div className="w-28 rounded-md overflow-hidden shadow-xl border border-sky-300/40 text-center animate-fadeIn">
                      <div
                        className="text-white font-black text-[9px] py-0.5 tracking-wider uppercase"
                        style={{ backgroundColor: accentColor }}
                      >
                        {activeCoupon.code}
                      </div>
                      <div className="bg-white text-slate-900 font-extrabold text-[10px] py-0.5">
                        {activeCoupon.description}
                      </div>
                    </div>
                  )}

                  {activeAdvantage && (
                    <div className="w-28 rounded-md overflow-hidden shadow-xl border border-sky-300/40 text-center animate-fadeIn">
                      <div
                        className="text-white font-black text-[9px] py-0.5 tracking-wider uppercase"
                        style={{ backgroundColor: accentColor }}
                      >
                        {activeAdvantage.title}
                      </div>
                      <div className="bg-white text-slate-700 font-bold text-[9px] py-0.5 leading-tight px-1">
                        {activeAdvantage.description}
                      </div>
                    </div>
                  )}
                </div>

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

                <div className="w-full flex flex-col gap-1.5 z-20 mt-auto">

                  {isUrgentAlertActive && (
                    <div className="w-full bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white font-black text-center text-[10px] py-1 px-2 rounded-md shadow-xl uppercase tracking-wider animate-pulse flex items-center justify-center gap-1.5 border border-red-300">
                      <AlertTriangle className="w-3 h-3 text-white fill-white" />
                      {urgentAlertText}
                    </div>
                  )}

                  {activeProduct && (
                    <div
                      className="w-full bg-white text-slate-900 rounded-xl p-2 shadow-2xl border-2 flex items-center gap-2 animate-slideUp"
                      style={{ borderColor: accentColor }}
                    >
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
                          <span
                            className="text-[9px] font-black bg-sky-100 px-1 py-0.2 rounded shrink-0"
                            style={{ color: accentColor }}
                          >
                            NA LIVE
                          </span>
                        </div>
                        <span className="text-xs font-black block" style={{ color: accentColor }}>
                          Por: R$ {activeProduct.price.toFixed(2).replace('.', ',')}
                        </span>
                      </div>

                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md shrink-0"
                        style={{ backgroundColor: accentColor }}
                      >
                        <ShoppingCart className="w-4 h-4 fill-white" />
                      </div>
                    </div>
                  )}

                </div>

              </div>
            </div>
          </div>

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

        <section className="col-span-12 lg:col-span-4 flex flex-col bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden p-3 shadow-lg">
          <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-emerald-400" /> Produtos na Live ({products.length})
                </h3>
                {spotlight.productId && (
                  <button onClick={() => updateSpotlight({ productId: null })} className="text-[11px] text-slate-400 hover:text-rose-400 transition">
                    Remover Destaque
                  </button>
                )}
              </div>

              {products.length === 0 ? (
                <p className="text-xs text-slate-500 italic px-1">Nenhum produto vinculado a esta live.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {products.map(prod => {
                    const isSelected = spotlight.productId === prod.id;
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
              )}
            </div>

            <div className="pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-sky-400" /> Cupons Cadastrados ({coupons.length})
                </h3>
                {spotlight.couponCode && (
                  <button onClick={() => updateSpotlight({ couponCode: null })} className="text-[11px] text-slate-400 hover:text-rose-400 transition">
                    Desativar Cupom
                  </button>
                )}
              </div>

              {coupons.length === 0 ? (
                <p className="text-xs text-slate-500 italic px-1">Nenhum cupom cadastrado para esta live.</p>
              ) : (
                <div className="grid grid-cols-1 gap-1.5">
                  {coupons.map(coupon => {
                    const isSelected = spotlight.couponCode === coupon.code;
                    return (
                      <button
                        key={coupon.code}
                        onClick={() => toggleCoupon(coupon)}
                        className={`flex items-center justify-between p-2 rounded-lg text-left text-xs transition border ${
                          isSelected
                            ? 'bg-sky-500/15 border-sky-500 text-sky-300 font-semibold'
                            : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-sky-400" />
                          <span><strong>{coupon.code}</strong> — {coupon.description}</span>
                        </div>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded font-bold"
                          style={isSelected ? { backgroundColor: accentColor, color: '#fff' } : { backgroundColor: '#1e293b', color: '#94a3b8' }}
                        >
                          {isSelected ? 'ATIVO' : 'ATIVAR'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-indigo-400" /> Vantagens e Benefícios ({advantages.length})
                </h3>
                {spotlight.advantageIdx !== null && (
                  <button onClick={() => updateSpotlight({ advantageIdx: null })} className="text-[11px] text-slate-400 hover:text-rose-400 transition">
                    Desativar
                  </button>
                )}
              </div>

              {advantages.length === 0 ? (
                <p className="text-xs text-slate-500 italic px-1">Nenhuma vantagem cadastrada para esta live.</p>
              ) : (
                <div className="grid grid-cols-1 gap-1.5">
                  {advantages.map((adv, idx) => {
                    const isSelected = spotlight.advantageIdx === idx;
                    return (
                      <button
                        key={`${adv.title}-${idx}`}
                        onClick={() => toggleAdvantage(idx)}
                        className={`flex items-center justify-between p-2 rounded-lg text-left text-xs transition border ${
                          isSelected
                            ? 'bg-sky-500/15 border-sky-500 text-sky-300 font-semibold'
                            : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Gift className="w-3.5 h-3.5 text-sky-400" />
                          <span><strong>{adv.title}</strong> — {adv.description}</span>
                        </div>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded font-bold"
                          style={isSelected ? { backgroundColor: accentColor, color: '#fff' } : { backgroundColor: '#1e293b', color: '#94a3b8' }}
                        >
                          {isSelected ? 'EXIBINDO' : 'EXIBIR'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </section>

        <section className="col-span-12 lg:col-span-3 flex flex-col gap-3 overflow-hidden">

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

          <div className="flex-1 flex flex-col bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden p-3 min-h-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" /> Chat ao Vivo
              </span>
              <span className="text-[10px] text-slate-400">Canal Oficial</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
              {messages.length === 0 ? (
                <p className="text-slate-500 italic text-center pt-4">Nenhuma mensagem ainda.</p>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`p-2 rounded-lg ${
                      msg.is_from_store
                        ? 'bg-slate-950/60 border border-amber-700/40 text-slate-200'
                        : 'bg-slate-950/60 border border-slate-800/70 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-[11px] text-white flex items-center gap-1">
                        {msg.is_from_store && <span className="text-amber-400">★</span>} {msg.author_name}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="break-words">{msg.message}</p>
                  </div>
                ))
              )}
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



