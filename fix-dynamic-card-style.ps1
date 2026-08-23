# ============================================================
#  Vidlytics - FIX ESTRUTURAL do Dynamic Carousel
#  Conecta TODAS as props (borda, highlight, card de produto)
# ============================================================
$ErrorActionPreference = 'Stop'
$file = 'public\widget.js'
if (-not (Test-Path $file)) { Write-Host "ERRO: $file não encontrado" -ForegroundColor Red; exit 1 }

$content = Get-Content $file -Raw
$applied = 0

# ========== CONFIG: adicionar props faltantes (borderRadius do card, botão, etc) ==========
$findConfig = "    productCardNameColor: rcv('product_card_name_color', '#FFFFFF') || '#FFFFFF',
    showProduct: toBoolean(rcv('show_product', false), false),
  };
}"
$replConfig = "    productCardNameColor: rcv('product_card_name_color', '#FFFFFF') || '#FFFFFF',
    showProduct: toBoolean(rcv('show_product', false), false),

    // Estilo visual do card (item 5)
    productCardBorderColor: rcv('product_card_border_color', '#E2E8F0') || '#E2E8F0',
    productCardBorderWidth: toNumber(rcv('product_card_border_width', '0'), 0),
    showPlayIcon: toBoolean(rcv('show_play_icon', true), true),
    showTitle: toBoolean(rcv('show_title', true), true),
  };
}"
if ($content.Contains($findConfig)) {
  $content = $content.Replace($findConfig, $replConfig)
  Write-Host "OK: props extras adicionadas ao config" -ForegroundColor Green
  $applied++
} else {
  Write-Host "FALHOU: ancora do config não encontrada" -ForegroundColor Red
}

# ========== CARD: injetar borda, fundo, raio, sombra ==========
$findCard = "      borderRadius: isCircle ? '50%' : cfg.borderRadius + 'px',
      overflow: 'hidden',
      background: cfg.bgColor,
      transition: 'transform ' + cfg.transitionMs + 'ms ease, box-shadow ' + cfg.transitionMs + 'ms ease, opacity ' + cfg.transitionMs + 'ms ease',
      cursor: 'pointer',
    });"

$replCard = "      borderRadius: isCircle ? (cfg.productCardRadius + 'px') : Math.max(cfg.borderRadius, cfg.productCardRadius) + 'px',
      overflow: 'hidden',
      background: cfg.productCardBg || cfg.bgColor,
      border: cfg.productCardBorderWidth + 'px solid ' + cfg.productCardBorderColor,
      boxShadow: cfg.highlightShadow ? '0 4px 14px rgba(0,0,0,0.15)' : 'none',
      transition: 'transform ' + cfg.transitionMs + 'ms ease, box-shadow ' + cfg.transitionMs + 'ms ease, opacity ' + cfg.transitionMs + 'ms ease',
      cursor: 'pointer',
    });"

if ($content.Contains($findCard)) {
  $content = $content.Replace($findCard, $replCard)
  Write-Host "OK: card aplica borda, fundo, raio e sombra" -ForegroundColor Green
  $applied++
} else {
  Write-Host "FALHOU: ancora do card.style não encontrada" -ForegroundColor Red
}

[System.IO.File]::WriteAllText((Resolve-Path $file), $content)

Write-Host ("`n=== Resultado ===")
Write-Host "Patches aplicados: $applied/2"
Write-Host ""
Write-Host "Validando sintaxe..." -ForegroundColor Cyan
node --check $file
if ($LASTEXITCODE -eq 0) { Write-Host "Sintaxe OK" -ForegroundColor Green }
else { Write-Host "ERRO de sintaxe" -ForegroundColor Red }
