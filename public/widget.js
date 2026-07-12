(function () {
  const currentScript = document.currentScript;

  const config = {
    loja: currentScript?.getAttribute("data-loja") || "Minha Loja",
    cor: currentScript?.getAttribute("data-cor") || "#111827",
    whatsapp: currentScript?.getAttribute("data-whatsapp") || "5541999999999",
  };

  const produtos = [
    {
      nome: "Tênis Esportivo",
      preco: "R$ 199,90",
      imagem: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
      descricao: "Confortável, moderno e ideal para o dia a dia.",
    },
    {
      nome: "Relógio Premium",
      preco: "R$ 349,90",
      imagem: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400",
      descricao: "Design elegante para qualquer ocasião.",
    },
    {
      nome: "Fone Bluetooth",
      preco: "R$ 129,90",
      imagem: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
      descricao: "Som de qualidade com bateria de longa duração.",
    },
  ];

  const style = document.createElement("style");

  style.innerHTML = `
    #vitrine-widget-button {
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 999999;
      background: ${config.cor};
      color: #ffffff;
      border: none;
      border-radius: 999px;
      padding: 14px 20px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
      transition: all 0.2s ease;
    }

    #vitrine-widget-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 14px 30px rgba(0, 0, 0, 0.3);
    }

    #vitrine-widget-panel {
      position: fixed;
      right: 20px;
      bottom: 80px;
      width: 360px;
      max-width: calc(100vw - 40px);
      max-height: 75vh;
      background: #ffffff;
      border-radius: 18px;
      box-shadow: 0 18px 45px rgba(0, 0, 0, 0.25);
      z-index: 999999;
      overflow: hidden;
      font-family: Arial, sans-serif;
      display: none;
      border: 1px solid #e5e7eb;
    }

    #vitrine-widget-panel.vitrine-open {
      display: block;
      animation: vitrineFadeIn 0.2s ease;
    }

    @keyframes vitrineFadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .vitrine-header {
      background: ${config.cor};
      color: #ffffff;
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .vitrine-header-title {
      font-size: 16px;
      font-weight: 700;
      margin: 0;
    }

    .vitrine-header-subtitle {
      font-size: 12px;
      opacity: 0.85;
      margin-top: 4px;
    }

    .vitrine-close {
      background: rgba(255, 255, 255, 0.15);
      color: #ffffff;
      border: none;
      width: 30px;
      height: 30px;
      border-radius: 999px;
      cursor: pointer;
      font-size: 18px;
      line-height: 30px;
    }

    .vitrine-body {
      padding: 14px;
      overflow-y: auto;
      max-height: calc(75vh - 72px);
      background: #f9fafb;
    }

    .vitrine-product {
      display: flex;
      gap: 12px;
      background: #ffffff;
      border-radius: 14px;
      padding: 12px;
      margin-bottom: 12px;
      border: 1px solid #e5e7eb;
    }

    .vitrine-product:last-child {
      margin-bottom: 0;
    }

    .vitrine-product-image {
      width: 82px;
      height: 82px;
      object-fit: cover;
      border-radius: 12px;
      background: #f3f4f6;
      flex-shrink: 0;
    }

    .vitrine-product-info {
      flex: 1;
      min-width: 0;
    }

    .vitrine-product-name {
      font-size: 14px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 4px;
    }

    .vitrine-product-description {
      font-size: 12px;
      color: #6b7280;
      margin: 0 0 8px;
      line-height: 1.3;
    }

    .vitrine-product-price {
      font-size: 15px;
      font-weight: 800;
      color: ${config.cor};
      margin-bottom: 8px;
    }

    .vitrine-buy-button {
      display: inline-block;
      background: ${config.cor};
      color: #ffffff;
      text-decoration: none;
      border-radius: 999px;
      padding: 7px 12px;
      font-size: 12px;
      font-weight: 700;
    }

    .vitrine-footer {
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
      margin-top: 12px;
    }

    @media (max-width: 480px) {
      #vitrine-widget-panel {
        right: 10px;
        bottom: 75px;
        width: calc(100vw - 20px);
      }

      #vitrine-widget-button {
        right: 10px;
        bottom: 15px;
      }
    }
  `;

  document.head.appendChild(style);

  const panel = document.createElement("div");
  panel.id = "vitrine-widget-panel";

  const produtosHtml = produtos
    .map((produto) => {
      const mensagem = encodeURIComponent(
        `Olá! Tenho interesse no produto: ${produto.nome} - ${produto.preco}`
      );

      const whatsappUrl = `https://wa.me/${config.whatsapp}?text=${mensagem}`;

      return `
        <div class="vitrine-product">
          <img 
            class="vitrine-product-image" 
            src="${produto.imagem}" 
            alt="${produto.nome}"
          />

          <div class="vitrine-product-info">
            <h3 class="vitrine-product-name">${produto.nome}</h3>
            <p class="vitrine-product-description">${produto.descricao}</p>
            <div class="vitrine-product-price">${produto.preco}</div>
            <a 
              class="vitrine-buy-button" 
              href="${whatsappUrl}" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Comprar
            </a>
          </div>
        </div>
      `;
    })
    .join("");

  panel.innerHTML = `
    <div class="vitrine-header">
      <div>
        <p class="vitrine-header-title">${config.loja}</p>
        <div class="vitrine-header-subtitle">Veja nossos produtos em destaque</div>
      </div>

      <button class="vitrine-close" type="button" aria-label="Fechar">
        ×
      </button>
    </div>

    <div class="vitrine-body">
      ${produtosHtml}

      <div class="vitrine-footer">
        Widget Vitrine
      </div>
    </div>
  `;

  const button = document.createElement("button");
  button.id = "vitrine-widget-button";
  button.type = "button";
  button.innerText = "Ver produtos";

  document.body.appendChild(panel);
  document.body.appendChild(button);

  const closeButton = panel.querySelector(".vitrine-close");

  button.addEventListener("click", function () {
    panel.classList.toggle("vitrine-open");

    if (panel.classList.contains("vitrine-open")) {
      button.innerText = "Fechar vitrine";
    } else {
      button.innerText = "Ver produtos";
    }
  });

  closeButton.addEventListener("click", function () {
    panel.classList.remove("vitrine-open");
    button.innerText = "Ver produtos";
  });
})();
