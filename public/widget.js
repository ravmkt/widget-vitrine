(function() {
  console.log('[Vidlytics] Inicializando widget de stories...');

  // 1. Identificar o domínio atual
  const currentDomain = window.location.hostname;
  console.log(`[Vidlytics] Domínio identificado: ${currentDomain}`);

  // 2. Configurações e dados de fallback (Useanny)
  const fallbackStoreId = '11111111-1111-1111-1111-111111111111';
  
  const fallbackStories = [
    {
      id: 's1',
      title: 'Nova Coleção Outono 🍂',
      video_url: 'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-light-in-a-futuristic-setting-41809-large.mp4',
      thumbnail_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=250&auto=format&fit=crop&q=60',
      cta_link: 'https://useanny.com.br/collections/outono',
      active: true,
      position: 1,
    },
    {
      id: 's2',
      title: 'Unboxing Especial 🎁',
      video_url: 'https://assets.mixkit.co/videos/preview/mixkit-hands-opening-a-gift-box-41604-large.mp4',
      thumbnail_url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=250&auto=format&fit=crop&q=60',
      cta_link: 'https://useanny.com.br/products/vestido-especial',
      active: true,
      position: 2,
    },
    {
      id: 's3',
      title: 'Provador Fashion ✨',
      video_url: 'https://assets.mixkit.co/videos/preview/mixkit-woman-holding-shopping-bags-and-smiling-40358-large.mp4',
      thumbnail_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=250&auto=format&fit=crop&q=60',
      cta_link: 'https://useanny.com.br/collections/novidades',
      active: true,
      position: 3,
    },
    {
      id: 's4',
      title: 'Cupom de Desconto 🏷️',
      video_url: 'https://assets.mixkit.co/videos/preview/mixkit-holding-a-smartphone-with-a-green-screen-41618-large.mp4',
      thumbnail_url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=250&auto=format&fit=crop&q=60',
      cta_link: 'https://useanny.com.br/discount/PROMO10',
      active: true,
      position: 4,
    }
  ];

  const fallbackSettings = {
    position: 'bottom-center',
    theme_color: '#8B5CF6',
    display_mode: 'carousel',
    active: true
  };

  // Tentar carregar dados do localStorage do painel administrativo se estiver no mesmo domínio
  let stories = fallbackStories;
  let settings = fallbackSettings;

  try {
    const localStories = localStorage.getItem('vidlytics_stories');
    const localSettings = localStorage.getItem('vidlytics_settings');
    if (localStories) stories = JSON.parse(localStories);
    if (localSettings) {
      const parsedSettings = JSON.parse(localSettings);
      if (parsedSettings && parsedSettings.length > 0) {
        settings = parsedSettings[0];
      }
    }
  } catch (e) {
    console.log('[Vidlytics] Usando dados padrão de fallback.');
  }

  // Filtrar apenas stories ativos
  const activeStories = stories.filter(s => s.active).sort((a, b) => a.position - b.position);

  if (!settings.active || activeStories.length === 0) {
    console.log('[Vidlytics] Widget inativo ou sem stories ativos.');
    return;
  }

  // 3. Criar container do Widget com Shadow DOM para isolamento de CSS
  const widgetContainer = document.createElement('div');
  widgetContainer.id = 'vidlytics-stories-widget';
  document.body.appendChild(widgetContainer);

  const shadowRoot = widgetContainer.attachShadow({ mode: 'open' });

  // 4. Estilos CSS isolados do Shadow DOM
  const style = document.createElement('style');
  style.textContent = `
    :host {
      --theme-color: ${settings.theme_color};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    /* Posições do Widget */
    .widget-wrapper {
      position: fixed;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 100%;
      box-sizing: border-box;
      padding: 12px;
      transition: all 0.3s ease;
    }

    .position-bottom-center {
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
    }

    .position-bottom-right {
      bottom: 20px;
      right: 20px;
    }

    .position-bottom-left {
      bottom: 20px;
      left: 20px;
    }

    .position-top-right {
      top: 20px;
      right: 20px;
    }

    .position-top-left {
      top: 20px;
      left: 20px;
    }

    /* Carrossel de Stories */
    .stories-carousel {
      display: flex;
      gap: 12px;
      overflow-x: auto;
      padding: 4px;
      scrollbar-width: none; /* Firefox */
      max-width: 360px;
    }

    .stories-carousel::-webkit-scrollbar {
      display: none; /* Chrome/Safari */
    }

    .story-bubble {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
      outline: none;
    }

    .story-ring {
      padding: 2px;
      border-radius: 50%;
      background: linear-gradient(45deg, var(--theme-color), #EC4899);
      transition: transform 0.2s ease;
    }

    .story-bubble:hover .story-ring {
      transform: scale(1.05);
    }

    .story-thumb {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: 2px solid #fff;
      object-fit: cover;
      display: block;
    }

    .story-title {
      font-size: 10px;
      font-weight: 600;
      color: #1e293b;
      max-width: 64px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-align: center;
    }

    /* Modal do Player de Vídeo */
    .video-modal {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.9);
      z-index: 1000000;
      display: none;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .video-modal.active {
      display: flex;
      opacity: 1;
    }

    .modal-content {
      position: relative;
      width: 100%;
      max-width: 420px;
      height: 100%;
      max-height: 780px;
      background: #000;
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }

    @media (max-width: 480px) {
      .modal-content {
        max-width: 100%;
        height: 100%;
        max-height: 100%;
        border-radius: 0;
      }
    }

    .video-player {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .modal-header {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      padding: 16px;
      background: linear-gradient(to bottom, rgba(0,0,0,0.6), transparent);
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: #fff;
      z-index: 10;
    }

    .modal-title {
      font-size: 14px;
      font-weight: 700;
      text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    }

    .close-btn {
      background: rgba(0, 0, 0, 0.4);
      border: none;
      color: #fff;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 18px;
      font-weight: bold;
      transition: background 0.2s;
    }

    .close-btn:hover {
      background: rgba(0, 0, 0, 0.6);
    }

    .modal-footer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 20px;
      background: linear-gradient(to top, rgba(0,0,0,0.6), transparent);
      z-index: 10;
    }

    .cta-btn {
      width: 100%;
      background: var(--theme-color);
      color: #fff;
      border: none;
      padding: 14px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
      transition: transform 0.2s, opacity 0.2s;
    }

    .cta-btn:hover {
      transform: translateY(-1px);
      opacity: 0.95;
    }

    /* Barra de Progresso */
    .progress-bar-container {
      position: absolute;
      top: 8px;
      left: 16px;
      right: 16px;
      height: 3px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 2px;
      overflow: hidden;
      z-index: 11;
    }

    .progress-bar {
      height: 100%;
      background: #fff;
      width: 0%;
      transition: width 0.1s linear;
    }
  `;

  shadowRoot.appendChild(style);

  // 5. Renderizar estrutura do Widget
  const wrapper = document.createElement('div');
  wrapper.className = `widget-wrapper position-${settings.position}`;

  const carousel = document.createElement('div');
  carousel.className = 'stories-carousel';

  activeStories.forEach((story) => {
    const bubble = document.createElement('button');
    bubble.className = 'story-bubble';
    bubble.innerHTML = `
      <div class="story-ring">
        <img class="story-thumb" src="${story.thumbnail_url}" alt="${story.title}">
      </div>
      <span class="story-title">${story.title}</span>
    `;

    bubble.addEventListener('click', () => openPlayer(story));
    carousel.appendChild(bubble);
  });

  wrapper.appendChild(carousel);
  shadowRoot.appendChild(wrapper);

  // 6. Criar Modal do Player de Vídeo
  const modal = document.createElement('div');
  modal.className = 'video-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="progress-bar-container">
        <div class="progress-bar" id="vidlytics-progress"></div>
      </div>
      <div class="modal-header">
        <span class="modal-title" id="vidlytics-title"></span>
        <button class="close-btn" id="vidlytics-close">&times;</button>
      </div>
      <video class="video-player" id="vidlytics-video" playsinline></video>
      <div class="modal-footer">
        <button class="cta-btn">Comprar Agora</button>
      </div>
    </div>
  `;

  shadowRoot.appendChild(modal);

  const videoElement = modal.querySelector('#vidlytics-video');
  const titleElement = modal.querySelector('#vidlytics-title');
  const closeBtn = modal.querySelector('#vidlytics-close');
  const progressBar = modal.querySelector('#vidlytics-progress');
  const ctaBtn = modal.querySelector('.cta-btn');

  let currentStory = null;

  function openPlayer(story) {
    console.log(`[Vidlytics] Abrindo story: ${story.title}`);
    currentStory = story;
    titleElement.textContent = story.title;
    videoElement.src = story.video_url;
    modal.classList.add('active');
    videoElement.play();

    // Atualizar barra de progresso
    videoElement.addEventListener('timeupdate', updateProgress);
    videoElement.addEventListener('ended', closePlayer);
  }

  function updateProgress() {
    if (videoElement.duration) {
      const percentage = (videoElement.currentTime / videoElement.duration) * 100;
      progressBar.style.width = `${percentage}%`;
    }
  }

  function closePlayer() {
    console.log('[Vidlytics] Fechando player.');
    videoElement.pause();
    videoElement.src = '';
    modal.classList.remove('active');
    progressBar.style.width = '0%';
    videoElement.removeEventListener('timeupdate', updateProgress);
    videoElement.removeEventListener('ended', closePlayer);
    currentStory = null;
  }

  closeBtn.addEventListener('click', closePlayer);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closePlayer();
  });

  ctaBtn.addEventListener('click', () => {
    console.log('[Vidlytics] Clique no botão de CTA!');
    if (currentStory && currentStory.cta_link) {
      window.open(currentStory.cta_link, '_blank');
    } else {
      alert('Redirecionando para o produto...');
    }
  });

})();