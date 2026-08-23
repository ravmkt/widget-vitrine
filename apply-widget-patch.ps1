# ============================================================
#  Vidlytics - Conectar Card de Produto (UI <-> Widget)
#  Aplica os 3 patches no public/widget.js de forma segura
# ============================================================
$ErrorActionPreference = 'Stop'
$file = 'public\widget.js'

# Garantir extensão old não usada
if (-not (Test-Path $file)) { Write-Host "ERRO: $file não encontrado" -ForegroundColor Red; exit 1 }

# ---- Backup ----
$bak = "$file.bak"
if (-not (Test-Path $bak)) { Copy-Item $file $bak; Write-Host "Backup criado: $bak" -ForegroundColor Green }
else { Write-Host "Backup já existe: $bak (mantido)" -ForegroundColor Yellow }

$content = Get-Content $file -Raw

$applied = 0
$failed  = 0

function Apply-Patch {
  param([string]$Content, [string]$Find, [string]$Replacement, [string]$Name)
  if ($Content.Contains($Find)) {
    $Content = $Content.Replace($Find, $Replacement)
    Write-Host "OK: $Name aplicado" -ForegroundColor Green
    return $Content
  } else {
    Write-Host "FALHOU: bloco alvo de '$Name' não encontrado (verifique o arquivo)" -ForegroundColor Red
    return $Content
  }
}

# ---------- PATCH 1: getDynamicCarouselConfig ----------
$p1Find = @'
    autoplayDelay: clampNum(rcv('autoplay_delay', '5000'), 1500, 20000),
  };
'@

$p1Repl = @'
    autoplayDelay: clampNum(rcv('autoplay_delay', '5000'), 1500, 20000),

    // NOVOS: conecta ao Carousel 3 "5. Estilo do Card de Produto"
    productCardBg: rcv('product_card_bg', '#FFFFFF') || '#FFFFFF',
    borderColor: rcv('product_card_border_color', '#E2E8F0') || '#E2E8F0',
    borderWidth: toNumber(rcv('product_card_border_width', '0'), 0),
    productCardRadius: toNumber(rcv('product_card_border_radius', '12'), 0),
    productCardNameSize: toNumber(rcv('product_card_name_size', '11'), 11),
    showProduct: toBoolean(rcv('show_product', false), false),
  };
'@
$content = Apply-Patch $content $p1Find $p1Repl 'PATCH 1 (getDynamicCarouselConfig)'

# ---------- PATCH 2a: borda permanente ----------
$p2aFind = @'
      if (isActive) {
        if (cfg.enlargeActive) scale = cfg.activeScale;
        if (cfg.highlightShadow) boxShadow = '0 12px 30px rgba(0,0,0,.35)';
        if (cfg.highlightMode === 'ring' && cfg.highlightBorderWidth > 0) {
          border = cfg.highlightBorderWidth + 'px solid ' + cfg.highlightBorderColor;
        }
      }
'@

$p2aRepl = @'
      // Borda permanente do card de produto
      if (cfg.borderWidth > 0) {
        border = cfg.borderWidth + 'px solid ' + cfg.borderColor;
      }
      if (isActive) {
        if (cfg.enlargeActive) scale = cfg.activeScale;
        if (cfg.highlightShadow) boxShadow = '0 12px 30px rgba(0,0,0,.35)';
        if (cfg.highlightMode === 'ring' && cfg.highlightBorderWidth > 0) {
          border = cfg.highlightBorderWidth + 'px solid ' + cfg.highlightBorderColor;
        }
      }
'@
$content = Apply-Patch $content $p2aFind $p2aRepl 'PATCH 2a (borda permanente)'

# ---------- PATCH 2b: fundo + raio ----------
$p2bFind = @'
      card.style.transform = 'scale(' + scale + ')';
      card.style.opacity = String(opacity);
      card.style.boxShadow = boxShadow;
      card.style.border = border;
      card.style.zIndex = isActive ? '10' : '1';
'@

$p2bRepl = @'
      card.style.transform = 'scale(' + scale + ')';
      card.style.opacity = String(opacity);
      card.style.boxShadow = boxShadow;
      card.style.border = border;
      card.style.background = cfg.productCardBg;
      card.style.borderRadius = cfg.productCardRadius + 'px';
      card.style.zIndex = isActive ? '10' : '1';
'@
$content = Apply-Patch $content $p2bFind $p2bRepl 'PATCH 2b (fundo + raio)'

# ---------- PATCH 3: renderizar título ----------
$p3Find = @'
    card.appendChild(video);
    track.appendChild(card);
    cardEls.push(card);
    videoEls.push(video);
  });
'@

$p3Repl = @'
    // Card de produto: título (condicionado a show_product)
    if (cfg.showProduct && item.title) {
      var prodLabel = document.createElement('div');
      prodLabel.className = 'vidlytics-dc-product';
      Object.assign(prodLabel.style, {
        position: 'absolute', left: '0', right: '0', bottom: '0',
        padding: '6px 8px', background: 'rgba(0,0,0,.5)',
        color: '#fff', fontSize: cfg.productCardNameSize + 'px',
        textAlign: 'center', whiteSpace: 'nowrap',
        overflow: 'hidden', textOverflow: 'ellipsis',
        pointerEvents: 'none', zIndex: '5',
      });
      prodLabel.textContent = item.title;
      card.appendChild(prodLabel);
    }
    // Certifica posicionamento relativo para overlays
    card.style.position = 'relative';

    card.appendChild(video);
    track.appendChild(card);
    cardEls.push(card);
    videoEls.push(video);
  });
'@
$content = Apply-Patch $content $p3Find $p3Repl 'PATCH 3 (título do produto)'

# ---------- Salvar ----------
[System.IO.File]::WriteAllText((Resolve-Path $file), $content)

Write-Host ""
Write-Host "=== Resultado ===" -ForegroundColor Cyan
Write-Host "Arquivo atualizado: $file"

# ---------- Validar sintaxe ----------
Write-Host ""
Write-Host "Validando sintaxe com node --check..." -ForegroundColor Cyan
node --check $file
if ($LASTEXITCODE -eq 0) {
  Write-Host "Sintaxe OK: node --check passou" -ForegroundColor Green
} else {
  Write-Host "ERRO de sintaxe! Verifique $file (backup: $file.bak)" -ForegroundColor Red
}
