(function() {
  // 1. Evitar renderização duplicada se o script for injetado várias vezes
  if (window.__vc_widget_initialized) {
    console.warn('[Vidlytics] Script de stories já inicializado nesta página.');
    return;
  }
  window.__vc_widget_initialized = true;

  // 2. Extrair licenseId/storeId da URL do script ou configuração global
  let licenseId = null;
  if (document.currentScript) {
    try {
      const scriptUrl = new URL(document.currentScript.src);
      licenseId = scriptUrl.searchParams.get('licenseId');
    } catch (e) {
      console.error('[Vidlytics] Erro ao extrair licenseId da tag script.', e);
    }
  }

  // Fallback para Google Tag Manager se carregado via window.VideoCommerceConfig
  if (!licenseId && window.VideoCommerceConfig) {
    licenseId = window.VideoCommerceConfig.licenseId;
  }

  // Fallback secundário escaneando os scripts da página se document.currentScript for nulo
  if (!licenseId) {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const src = scripts[i].src;
      if (src && src.includes('widget.js')) {
        try {
          const url = new URL(src);
          licenseId = url.searchParams.get('licenseId');
          if (licenseId) break;
        } catch(e){}
      }
    }
  }

  // Se mesmo assim não achar, utiliza a loja padrão Useanny para exibição demo
  if (!licenseId) {
    licenseId = '11111111-1111-1111-1111-111111111111';
    console.warn('[Vidlytics] licenseId não detectada. Usando identificador padrão Useanny.');
  }

  // 3. Buscar configurações do Banco de Dados no LocalStorage (ou simulação de API)
  const getStorageItem = (key, fallback) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch(e) {
      return fallback;
    }
  };

  const generalSettingsList = getStorageItem('vidlytics_general_settings', []);
  const settings = generalSettingsList.find(s => s.store_id === licenseId) || generalSettingsList[0];

  // Verificar se o app geral está ativo
  if (!settings || !settings.app_enabled) {
    console.log('[Vidlytics] Widget inativo ou desativado nas Configurações Gerais.');
    return;
  }

  // Carregar demais coleções
  const stories = getStorageItem('vidlytics_stories', []).filter(s => s.store_id === licenseId && s.active);
  const storyVideos = getStorageItem('vidlytics_story_videos', []);
  const videos = getStorageItem('vidlytics_videos', []);
  const appearances = getStorageItem('vidlytics_appearances', []);
  const products = getStorageItem('vidlytics_products', []);
  const storyProducts = getStorageItem('vidlytics_story_products', []);
  const displayLocations = getStorageItem('vidlytics_display_locations', []);
  const pageRules = getStorageItem('vidlytics_page_rules', []);

  const defaultAppearance = appearances.find(a => a.id === settings.default_appearance_id) || appearances[0];

  if (stories.length === 0) {
    console.log('[Vidlytics] Nenhum story ativo encontrado para esta loja.');
    return;
  }

  const currentPath = window.location.pathname || '/';

  // 4. Validar Regras de Página para a URL Atual
  const shouldRenderStoryOnPage = (storyId) => {
    const rules = pageRules.filter(r => r.story_id === storyId);
    if (rules.length === 0) return true; // Sem regras, aparece em todas

    return rules.some(rule => {
      const value = String(rule.value || '').toLowerCase().trim();
      const path = currentPath.toLowerCase().trim();

      switch (rule.condition_type) {
        case 'all_pages':
          return true;
        case 'home_only':
          return path === '/' || path === '/home' || path === '/index.html' || path === '';
        case 'product_pages':
          return path.includes('/produto') || path.includes('/product');
        case 'category_pages':
          return path.includes('/categoria') || path.includes('/collection') || path.includes('/colecao');
        case 'contains':
          return path.includes(value);
        case 'equals':
          return path === value;
        case 'not_equals':
          return path !== value;
        case 'starts_with':
          return path.startsWith(value);
        case 'ends_with':
          return path.endsWith(value);
        case 'regex':
          try {
            const rx = new RegExp(value);
            return rx.test(path);
          } catch(e) {
            return false;
          }
        default:
          return true;
      }
    });
  };

  // Filtrar stories permitidos nesta página
  const allowedStories = stories.filter(s => shouldRenderStoryOnPage(s.id)).sort((a,b) => a.position - b.position);

  if (allowedStories.length === 0) {
    console.log('[Vidlytics] Sem stories qualificados para a URL atual do site.');
    return;
  }

  // 5. Função de gravação de logs de eventos analíticos
  const trackEvent = (eventType, storyId, videoId = null, productId = null) => {
    try {
      const metrics = getStorageItem('vidlytics_metrics', []);
      const newMetric = {
        id: `ev-${Math.random().toString(36).substr(2, 9)}`,
        story_id: storyId,
        video_id: videoId,
        product_id: productId,
        event_type: eventType,
        page_url: currentPath,
        device_type: window.innerWidth < 768 ? 'mobile' : 'desktop',
        browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Safari') ? 'Safari' : 'Outro',
        referrer: document.referrer || 'Direto',
        created_at: new Date().toISOString()
      };
      metrics.push(newMetric);
      localStorage.setItem('vidlytics_metrics', JSON.stringify(metrics));

      // Se for visualização ou clique principal, incrementa contador agregado
      if (eventType === 'view') {
        const sIndex = stories.findIndex(s => s.id === storyId);
        if (sIndex >= 0) {
          stories[sIndex].view_count = (stories[sIndex].view_count || 0) + 1;
          localStorage.setItem('vidlytics_stories', JSON.stringify(stories));
        }
      }
      if (eventType === 'cta_click') {
        const sIndex = stories.findIndex(s => s.id === storyId);
        if (sIndex >= 0) {
          stories[sIndex].click_count = (stories[sIndex].click_count || 0) + 1;
          localStorage.setItem('vidlytics_stories', JSON.stringify(stories));
        }
      }
    } catch(e) {
      console.error('[Vidlytics] Erro ao registrar métrica.', e);
    }
  };

  // Helper para abrir links
  const navigateToCta = (url, openInNewTab) => {
    if (!url) return;
    if (openInNewTab) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
  };

  // 6. Preparar renderização e criar elementos no DOM respeitando os locais de exibição
  const injectStoryIntoTarget = (story, elementToRender) => {
    const locations = displayLocations.filter(dl => dl.story_id === story.id);
    
    // Se não tiver local mapeado para o carrossel/grade, joga no body por padrão se for flutuante
    if (locations.length === 0) {
      if (story.format === 'floating_widget') {
        document.body.appendChild(elementToRender);
      } else {
        console.warn(`[Vidlytics] Sem local de exibição CSS configurado para o story: "${story.title}".`);
      }
      return;
    }

    locations.forEach(loc => {
      let retryCount = 0;
      const maxRetries = 10; // Tenta por até 5 segundos (10 * 500ms)

      const tryInject = () => {
        // Se for posição fixa, injeta direto no body
        if (['fixed_bottom_right', 'fixed_bottom_left', 'fixed_top_right', 'fixed_top_left'].includes(loc.position)) {
          document.body.appendChild(elementToRender);
          return true;
        }

        const targetNode = document.querySelector(loc.selector);
        if (!targetNode) {
          return false;
        }

        // Respeitar locais específicos
        switch (loc.position) {
          case 'before_element':
            targetNode.parentNode.insertBefore(elementToRender, targetNode);
            break;
          case 'after_element':
            targetNode.parentNode.insertBefore(elementToRender, targetNode.nextSibling);
            break;
          case 'inside_start':
            targetNode.insertBefore(elementToRender, targetNode.firstChild);
            break;
          case 'inside_end':
            targetNode.appendChild(elementToRender);
            break;
          case 'replace_element':
            targetNode.parentNode.replaceChild(elementToRender, targetNode);
            break;
        }
        return true;
      };

      if (!tryInject()) {
        const interval = setInterval(() => {
          retryCount++;
          if (tryInject()) {
            clearInterval(interval);
          } else if (retryCount >= maxRetries) {
            clearInterval(interval);
            console.warn(`[Vidlytics] Não foi possível injetar o widget. Seletor CSS "${loc.selector}" não encontrado na página.`);
          }
        }, 500);
      }
    });
  };

  // 7. Renderizar a bolinha do Story ou o Card do Carrossel utilizando Shadow DOM
  allowedStories.forEach(story => {
    const container = document.createElement('div');
    container.className = `vc-story-container-${story.id}`;
    
    // Criando Shadow Root para isolamento completo de CSS
    const shadow = container.attachShadow({ mode: 'open' });

    // Obter aparência
    const appearance = appearances.find(a => a.id === story.appearance_id) || defaultAppearance || {
      primary_color: '#8B5CF6',
      secondary_color: '#EC4899',
      button_color: '#8B5CF6',
      border_radius: '12px',
      font_family: 'Inter, sans-serif'
    };

    // Obter vídeo de capa do story
    const relations = storyVideos.filter(sv => sv.story_id === story.id).sort((a,b) => a.position - b.position);
    const firstRelation = relations.find(r => r.is_cover) || relations[0];
    const firstVideo = firstRelation ? videos.find(v => v.id === firstRelation.video_id) : null;
    const thumbnail = firstVideo ? firstVideo.thumbnail_url : 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=250';

    // Gerar CSS do Shadow DOM
    const style = document.createElement('style');
    style.textContent = `
      .vc-bubble-wrapper {
        font-family: ${appearance.font_family || 'sans-serif'};
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        margin: 10px;
        cursor: pointer;
        user-select: none;
        transition: transform 0.2s ease-in-out;
      }
      .vc-bubble-wrapper:hover {
        transform: scale(1.05);
      }
      .vc-ring {
        padding: 3px;
        border-radius: 50%;
        background: linear-gradient(45deg, ${appearance.primary_color}, ${appearance.secondary_color});
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: ${appearance.shadow_enabled ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'};
      }
      .vc-image-frame {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        border: 2.5px solid #fff;
        overflow: hidden;
        background-color: #e2e8f0;
      }
      .vc-thumb {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .vc-title {
        margin-top: 6px;
        font-size: 11px;
        font-weight: 700;
        color: #1e293b;
        max-width: 80px;
        text-align: center;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* Estilos para Widget Flutuante */
      .vc-floating {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 99999;
      }
      .vc-floating-left {
        position: fixed;
        bottom: 24px;
        left: 24px;
        z-index: 99999;
      }
    `;
    shadow.appendChild(style);

    // Estrutura HTML da bolinha/widget
    const widget = document.createElement('div');
    widget.className = 'vc-bubble-wrapper';

    // Se for flutuante, ajusta posição fixa
    const locations = displayLocations.filter(dl => dl.story_id === story.id);
    const hasFloating = locations.some(l => l.position.startsWith('fixed_'));
    if (story.format === 'floating_widget' || hasFloating) {
      const loc = locations.find(l => l.position.startsWith('fixed_')) || { position: 'fixed_bottom_right' };
      if (loc.position === 'fixed_bottom_left') widget.classList.add('vc-floating-left');
      else widget.classList.add('vc-floating');
    }

    widget.innerHTML = `
      <div class="vc-ring">
        <div class="vc-image-frame">
          <img src="${thumbnail}" class="vc-thumb" alt="${story.title}" />
        </div>
      </div>
      <span class="vc-title" style="color: ${appearance.text_color || '#1e293b'}">${story.title}</span>
    `;

    // Registrar a visualização inicial no log analítico
    trackEvent('view', story.id, firstVideo ? firstVideo.id : null);

    // Ao clicar na bolinha, abre o player de vídeo interativo
    widget.addEventListener('click', () => {
      trackEvent('click', story.id, firstVideo ? firstVideo.id : null);
      openVideoPlayer(story, relations, appearance);
    });

    shadow.appendChild(widget);
    injectStoryIntoTarget(story, container);
  });

  // 8. Criar e gerenciar a abertura do Modal / Player de Vídeo Responsivo
  const openVideoPlayer = (story, relations, appearance) => {
    // Garantir que não existam múltiplos players abertos duplicados
    const oldPlayer = document.getElementById('vc-player-modal');
    if (oldPlayer) oldPlayer.remove();

    let currentIndex = 0;

    const modal = document.createElement('div');
    modal.id = 'vc-player-modal';
    
    // Injetar estilos de isolamento do modal e animações responsivas
    modal.innerHTML = `
      <style>
        #vc-player-modal {
          position: fixed;
          inset: 0;
          background-color: rgba(0,0,0,0.95);
          z-index: 9999999;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: ${appearance.font_family || 'sans-serif'};
        }
        .vc-player-card {
          position: relative;
          width: 100%;
          max-width: 410px;
          height: 100%;
          max-height: 800px;
          background-color: #000;
          border-radius: 20px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
        }
        @media(max-width: 500px) {
          .vc-player-card {
            max-width: 100%;
            height: 100%;
            max-height: 100%;
            border-radius: 0;
          }
        }
        .vc-video-element {
          width: 100%;
          height: 100%;
          object-fit: cover;
          cursor: pointer;
        }
        .vc-video-header {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to bottom, rgba(0,0,0,0.7), transparent);
          padding: 20px 16px;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #fff;
        }
        .vc-header-title {
          font-size: 13px;
          font-weight: 800;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }
        .vc-header-close {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: rgba(0,0,0,0.4);
          border: none;
          color: #fff;
          font-weight: bold;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
        }
        .vc-header-close:hover {
          background-color: rgba(0,0,0,0.7);
        }
        
        /* Barra de Progresso do Vídeo */
        .vc-progress-container {
          position: absolute;
          top: 10px;
          left: 16px;
          right: 16px;
          height: 3px;
          background-color: rgba(255,255,255,0.3);
          border-radius: 2px;
          overflow: hidden;
          z-index: 25;
        }
        .vc-progress-bar {
          height: 100%;
          background-color: #fff;
          width: 0%;
        }

        /* Botões Laterais Tridimensionais */
        .vc-actions-bar {
          position: absolute;
          right: 14px;
          bottom: 110px;
          z-index: 30;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .vc-action-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: none;
          background-color: rgba(0,0,0,0.45);
          backdrop-filter: blur(6px);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(0,0,0,0.25);
          transition: all 0.2s;
        }
        .vc-action-btn:hover {
          background-color: rgba(255,255,255,0.15);
          transform: scale(1.05);
        }

        /* Botão do CTA de Checkout */
        .vc-cta-container {
          position: absolute;
          bottom: 24px;
          left: 14px;
          right: 14px;
          z-index: 30;
        }
        .vc-cta-btn {
          width: 100%;
          background-color: ${appearance.button_color || '#8B5CF6'};
          color: #fff;
          font-weight: 800;
          font-size: 13px;
          text-align: center;
          padding: 14px 20px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          box-shadow: 0 10px 20px rgba(0,0,0,0.3);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          transition: transform 0.2s;
        }
        .vc-cta-btn:hover {
          transform: translateY(-2px);
          opacity: 0.95;
        }
      </style>

      <div class="vc-player-card">
        <div class="vc-progress-container">
          <div class="vc-progress-bar" id="vc-progress-bar-el"></div>
        </div>

        <div class="vc-video-header">
          <span class="vc-header-title">${story.title}</span>
          <button class="vc-header-close" id="vc-close-player-btn">&times;</button>
        </div>

        <video class="vc-video-element" id="vc-video-player-el" playsinline></video>

        <!-- Botões Interativos Verticais -->
        <div class="vc-actions-bar">
          ${appearance.show_like_button ? `
            <button class="vc-action-btn" id="vc-like-btn" title="Curtir">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
          ` : ''}

          ${appearance.show_comment_button ? `
            <button class="vc-action-btn" id="vc-comment-btn" title="Comentar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.38 0 0 1 8 8v.5z"/></svg>
            </button>
          ` : ''}

          ${appearance.show_share_button ? `
            <button class="vc-action-btn" id="vc-share-btn" title="Compartilhar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </button>
          ` : ''}

          ${appearance.show_whatsapp_button ? `
            <button class="vc-action-btn" id="vc-whatsapp-btn" style="background-color: #25D366" title="Falar no WhatsApp">
              <svg width="22" height="22" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path fill="#FFFFFF" d="M16.02 26.74h-.01c-1.81 0-3.58-.49-5.12-1.42l-.37-.22-4.1 1.07 1.09-4-.24-.41c-1.01-1.67-1.54-3.59-1.54-5.56 0-5.67 4.61-10.28 10.29-10.28 2.75 0 5.33 1.07 7.27 3.01 1.94 1.94 3.01 4.52 3.01 7.27 0 5.67-4.61 10.28-10.28 10.28z"/>
                <path fill="#25D366" d="M21.88 18.96c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.5-.16-.71.16-.21.32-.82 1.04-1 1.25-.18.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.58-.95-.85-1.59-1.9-1.78-2.22-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.55.16-.18.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.71-1.71-.97-2.34-.26-.62-.52-.54-.71-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.09-1.11 2.66s1.14 3.08 1.3 3.29c.16.21 2.24 3.42 5.43 4.8.76.33 1.35.52 1.81.67.76.24 1.45.21 2 .13.61-.09 1.89-.77 2.16-1.52.27-.75.27-1.39.19-1.52-.08-.13-.29-.21-.61-.37z"/>
              </svg>
            </button>
          ` : ''}
        </div>

        <!-- Botão CTA -->
        ${story.cta_enabled ? `
          <div class="vc-cta-container">
            <button class="vc-cta-btn" id="vc-player-cta-btn">${story.cta_text || 'Comprar Agora'}</button>
          </div>
        ` : ''}
      </div>
    `;

    document.body.appendChild(modal);

    const videoEl = modal.querySelector('#vc-video-player-el');
    const progressBar = modal.querySelector('#vc-progress-bar-el');
    const closeBtn = modal.querySelector('#vc-close-player-btn');
    const ctaBtn = modal.querySelector('#vc-player-cta-btn');
    const likeBtn = modal.querySelector('#vc-like-btn');
    const commentBtn = modal.querySelector('#vc-comment-btn');
    const shareBtn = modal.querySelector('#vc-share-btn');
    const whatsappBtn = modal.querySelector('#vc-whatsapp-btn');

    // Mapear primeiro vídeo
    const loadVideoOfIndex = (idx) => {
      const relation = relations[idx];
      if (!relation) return;

      const video = videos.find(v => v.id === relation.video_id);
      if (video) {
        videoEl.src = video.video_url;
        
        // Configurações do comportamento do player
        videoEl.muted = settings.muted_by_default;
        videoEl.autoplay = settings.autoplay;
        videoEl.controls = settings.show_video_controls;

        videoEl.play().catch(e => {
          console.log('[Vidlytics] Autoplay bloqueado pelo navegador. Iniciando silenciado.');
          videoEl.muted = true;
          videoEl.play();
        });

        trackEvent('play', story.id, video.id);
      }
    };

    loadVideoOfIndex(currentIndex);

    // Monitorar a barra de progresso em tempo real
    videoEl.addEventListener('timeupdate', () => {
      if (videoEl.duration) {
        const percentage = (videoEl.currentTime / videoEl.duration) * 100;
        progressBar.style.width = `${percentage}%`;
      }
    });

    // Passar para o próximo vídeo se o atual finalizar
    videoEl.addEventListener('ended', () => {
      if (currentIndex < relations.length - 1) {
        currentIndex++;
        loadVideoOfIndex(currentIndex);
      } else {
        closePlayer();
      }
    });

    const closePlayer = () => {
      videoEl.pause();
      trackEvent('close', story.id);
      modal.remove();
    };

    closeBtn.addEventListener('click', closePlayer);

    // Clique direto no vídeo realiza pause/play
    videoEl.addEventListener('click', () => {
      if (videoEl.paused) {
        videoEl.play();
        trackEvent('play', story.id);
      } else {
        videoEl.pause();
        trackEvent('pause', story.id);
      }
    });

    // Ações de Botões Laterais
    if (likeBtn) {
      likeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        trackEvent('like', story.id);
        likeBtn.style.color = '#F43F5E';
        likeBtn.querySelector('svg').setAttribute('fill', '#F43F5E');
        showSuccess('Story curtido!');
      });
    }

    if (commentBtn) {
      commentBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        trackEvent('comment', story.id);
        const commentMsg = window.prompt("Escreva seu comentário:");
        if (commentMsg && commentMsg.trim()) {
          const commentList = getStorageItem('vidlytics_comments', []);
          commentList.push({
            id: `c-${Math.random().toString(36).substr(2, 9)}`,
            story_id: story.id,
            user_name: 'Cliente da Loja',
            text: commentMsg.trim(),
            status: 'pending',
            created_at: new Date().toISOString()
          });
          localStorage.setItem('vidlytics_comments', JSON.stringify(commentList));
          showSuccess('Comentário enviado para aprovação!');
        }
      });
    }

    if (shareBtn) {
      shareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        trackEvent('share', story.id);
        const shareUrl = story.cta_url || window.location.href;
        navigator.clipboard.writeText(shareUrl);
        showSuccess('Link de compartilhamento copiado!');
      });
    }

    if (whatsappBtn) {
      whatsappBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        trackEvent('whatsapp_click', story.id);
        
        const number = settings.whatsapp_number || '5545999629702';
        const templateMessage = story.whatsapp_message || settings.whatsapp_default_message || 'Olá! Tenho interesse no produto: {{story_title}}';
        const formattedMessage = templateMessage.replace('{{story_title}}', story.title);

        const waLink = `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(formattedMessage)}`;
        window.open(waLink, '_blank');
      });
    }

    if (ctaBtn) {
      ctaBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        trackEvent('cta_click', story.id);
        
        let destinationUrl = story.cta_url;

        // Se for do tipo Produto, busca o link do produto vinculado
        if (story.cta_type === 'product') {
          const relation = storyProducts.find(sp => sp.story_id === story.id);
          if (relation) {
            const prod = products.find(p => p.id === relation.product_id);
            if (prod) destinationUrl = prod.product_url;
          }
        }

        if (destinationUrl) {
          navigateToCta(destinationUrl, settings.open_product_new_tab);
        } else {
          alert('Este story não possui link ou produto associado.');
        }
      });
    }

    // Configurar observador Intersection Observer se pause_on_invisible estiver ativado nas configurações
    if (settings.pause_on_invisible) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting && !videoEl.paused) {
            videoEl.pause();
            trackEvent('pause', story.id);
          }
        });
      }, { threshold: 0.1 });
      observer.observe(modal);
    }
  };

})();