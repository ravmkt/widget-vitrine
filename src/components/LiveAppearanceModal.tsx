{device === 'mobile' ? (
  // ==========================================================
  // PREVIEW MOBILE - 3 CELULARES LADO A LADO (Normal / Produtos / Chat)
  // ==========================================================
  <div className="w-full h-full flex items-center justify-center gap-4 sm:gap-8 overflow-x-auto px-2">
    {[
      { id: "normal",   label: "Player" },
      { id: "products", label: "Com Produtos" },
      { id: "chat",     label: "Com Chat" },
    ].map((phone) => (
      <div key={phone.id} className="flex flex-col items-center gap-3 shrink-0">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{phone.label}</span>

        <div
          className="relative bg-[#0a0a0a] rounded-[2.2rem] shadow-[0_0_0_3px_#f4d1c0] border-[6px] border-[#0a0a0a] overflow-hidden shrink-0 select-none"
          style={{ height: 'min(60vh, 520px)', aspectRatio: '9 / 19' }}
        >
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[36%] max-w-[100px] h-[16px] bg-[#0a0a0a] rounded-b-[0.8rem] z-30"></div>

          {/* VÍDEO DE FUNDO ANIMADO */}
          <video
            src="https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-1232-large.mp4"
            autoPlay loop muted playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/75 pointer-events-none z-10"></div>

          {/* TOPO ESQUERDO: Logo + Título */}
          <div className="absolute top-4 left-3 flex items-center gap-1.5 z-20">
            <div className="w-6 h-6 rounded-full bg-[#1b4332] border border-white/40 flex items-center justify-center text-[7px] font-bold text-white shadow shrink-0">USE</div>
            {currentPlayer.showTitle && (
              <span className="font-bold text-[12px] text-white drop-shadow-md tracking-tight leading-none" style={{ color: currentPlayer.titleColor }}>
                {currentPlayer.titleText}
              </span>
            )}
          </div>

          {/* CUPOM */}
          {currentPlayer.showCoupon && (
            <div className="absolute top-[46px] left-3 rounded-[6px] overflow-hidden flex flex-col w-[58px] z-20 shadow-md border" style={{ borderColor: currentPlayer.borderColor }}>
              <div className="text-center py-0.5 text-[8px] font-black uppercase tracking-tight" style={{ backgroundColor: currentPlayer.couponCodeBgColor, color: currentPlayer.couponCodeColor }}>
                {currentPlayer.couponCode}
              </div>
              <div className="text-center py-0.5 text-[8px] font-bold" style={{ backgroundColor: currentPlayer.couponTextBgColor, color: currentPlayer.couponTextColor }}>
                {currentPlayer.couponText}
              </div>
            </div>
          )}

          {/* COLUNA LATERAL DIREITA */}
          <div className="absolute top-4 right-2.5 flex flex-col items-center gap-2 z-20">
            <div className="flex items-center gap-1 bg-[#e7191f] text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
              <PlaySquare className="w-2 h-2 fill-white"/> LIVE
            </div>
            {currentPlayer.showViewerCount && (
              <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md text-white text-[8px] font-semibold px-1.5 py-0.5 rounded-full border border-white/10 shadow-sm">
                <Eye className="w-2.5 h-2.5 text-white/90" /> 1.2k
              </div>
            )}
            {currentPlayer.autoplayMuted && (
              <button className="w-6 h-6 bg-black/45 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 shadow-sm">
                <VolumeX className="w-3 h-3"/>
              </button>
            )}
            {currentPlayer.showChat && (
              <button className={`w-6 h-6 rounded-full flex items-center justify-center text-white border shadow-sm transition ${phone.id === 'chat' ? 'bg-white/20 border-white/60' : 'bg-black/45 border-white/20'}`}>
                <MessageCircle className="w-3 h-3"/>
              </button>
            )}
            {currentPlayer.showShare && (
              <button className="w-6 h-6 bg-black/45 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 shadow-sm">
                <Send className="w-2.5 h-2.5 -ml-0.5 mt-0.5 transform -rotate-12"/>
              </button>
            )}
            <button className="w-6 h-6 bg-black/45 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 shadow-sm">
              <ShoppingBag className="w-3 h-3"/>
            </button>
            {currentPlayer.showProducts && (
              <div className="flex flex-col items-center -mt-0.5">
                <button className={`w-6 h-6 rounded-full flex items-center justify-center text-white border shadow-sm transition ${phone.id === 'products' ? 'bg-white/20 border-white/60' : 'bg-black/45 border-white/20'}`}>
                  <ShoppingCart className="w-3 h-3"/>
                </button>
                <span className="text-white text-[7px] font-bold drop-shadow mt-0.5">3</span>
              </div>
            )}
            <button className="w-6 h-6 bg-[#25D366] rounded-full flex items-center justify-center text-white border border-white shadow-md">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
            </button>
          </div>

          {/* ESTADO: CHAT ABERTO */}
          {phone.id === 'chat' && currentPlayer.showChat && (
            <div className="absolute bottom-[68px] left-2.5 right-11 z-20 flex flex-col justify-end pointer-events-none">
              <div className="flex flex-col gap-1.5 mb-2 overflow-hidden" style={{ maskImage: 'linear-gradient(to top, black 70%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to top, black 70%, transparent 100%)' }}>
                {[1,2,3].map(i => (
                  <div key={i} className="flex items-center gap-1.5 drop-shadow">
                    <img src={`https://i.pravatar.cc/100?img=${i+14}`} className="w-4 h-4 rounded-full border border-white/40 shadow-sm shrink-0"/>
                    <span className="text-white text-[8px] font-medium drop-shadow leading-none">Nononononono</span>
                  </div>
                ))}
              </div>
              <div className="bg-white/90 backdrop-blur-md rounded-full flex items-center justify-between pl-3 pr-1.5 py-1 shadow-sm">
                <span className="text-slate-400 text-[9px]">Chat...</span>
                <Heart className="w-3 h-3 text-rose-500 fill-rose-500 shrink-0" />
              </div>
            </div>
          )}

          {/* ESTADO: PLAYER NORMAL / CHAT -> Card de produto na base */}
          {phone.id !== 'products' && currentPlayer.showProducts && (
            <div className="absolute bottom-2 left-2 right-2 z-20">
              <div className="bg-white rounded-[10px] p-1.5 flex gap-1.5 items-center shadow-lg border" style={{ borderColor: currentPlayer.borderColor }}>
                <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=120&auto=format" className="w-[36px] h-[42px] rounded-md object-cover bg-slate-100 shrink-0"/>
                <div className="flex-1 min-w-0 pr-0.5">
                  <div className="text-[9px] font-bold leading-tight line-clamp-2" style={{ color: currentPlayer.productNameColor }}>
                    Blusa Life Rosê em Malha Tecnológica
                  </div>
                  <div className="text-[7px] text-slate-400 line-through mt-0.5 leading-none">De: R$ 199,90</div>
                  <div className="text-[9px] font-black leading-tight mt-0.5" style={{ color: currentPlayer.productPriceColor }}>
                    Por: R$ 149,90
                  </div>
                </div>
                <div className="shrink-0">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: currentPlayer.borderColor }}>
                    <ShoppingCart className="w-2.5 h-2.5" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ESTADO: LISTA DE PRODUTOS ABERTA (fullscreen dentro do celular) */}
          {phone.id === 'products' && currentPlayer.showProducts && (
            <div className="absolute inset-x-1.5 bottom-1.5 top-5 z-50 flex flex-col overflow-hidden">
              <div className="bg-white flex-1 rounded-2xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden">
                <div className="bg-[#0ea5e9] text-white text-center py-2 font-bold text-[12px] tracking-wide shadow-sm">PRODUTOS</div>
                <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5 scrollbar-hide bg-slate-50">
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="bg-white border border-[#0ea5e9]/30 rounded-lg p-1 flex gap-1.5 items-center shadow-sm">
                      <div className="w-3.5 text-center font-black text-[10px] text-[#0ea5e9]">0{i}</div>
                      <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff" className="w-[32px] h-[38px] object-cover rounded bg-slate-100 shrink-0"/>
                      <div className="flex-1 min-w-0">
                        <div className="text-[9px] font-bold leading-tight line-clamp-1">Blusa Life Rosê</div>
                        <div className="text-[7px] text-slate-400 line-through">De: R$ 199,90</div>
                        <div className="text-[9px] font-bold text-[#0ea5e9]">Por: R$ 149,90</div>
                      </div>
                      <div className="w-5 h-5 bg-[#0ea5e9] rounded-full flex items-center justify-center text-white shadow-sm shrink-0">
                        <ShoppingCart className="w-2.5 h-2.5"/>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-white p-2 border-t flex flex-col items-center">
                  <ChevronDown className="w-4 h-4 text-[#0ea5e9] mb-1"/>
                  <div className="flex justify-between items-center w-full text-[10px] font-bold text-[#0ea5e9]">
                    <span>6 Produtos adicionados</span>
                    <span className="text-slate-600 flex items-center">Finalizar <ExternalLink className="w-2.5 h-2.5 ml-1"/></span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    ))}
  </div>
) : (
