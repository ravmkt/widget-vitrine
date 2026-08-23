# ============================================================
#  Vidlytics - Cor do título do card de produto
#  Adiciona product_card_name_color ao widget.js
# ============================================================
$ErrorActionPreference = 'Stop'
$file = 'public\widget.js'

if (-not (Test-Path $file)) { Write-Host "ERRO: $file não encontrado" -ForegroundColor Red; exit 1 }

# Backup (incremental)
$bak = "public\widget.js.bak2"
if (-not (Test-Path $bak)) { Copy-Item $file $bak; Write-Host "Backup criado: $bak" -ForegroundColor Green }
else { Write-Host "Backup já existe: $bak (mantido)" -ForegroundColor Yellow }

$content = Get-Content $file -Raw
$applied = 0

# ---------- PATCH A: adicionar prop no getDynamicCarouselConfig ----------
$findA = "    showProduct: toBoolean(rcv('show_product', false), false),"
$replA = @"
    productCardNameColor: rcv('product_card_name_color', '#FFFFFF') || '#FFFFFF',
    showProduct: toBoolean(rcv('show_product', false), false),
"@
if ($content.Contains($findA)) {
  $content = $content.Replace($findA, $replA)
  Write-Host "OK: prop productCardNameColor adicionada" -ForegroundColor Green
  $applied++
} else {
  Write-Host "FALHOU: ancora do getDynamicCarouselConfig não encontrada" -ForegroundColor Red
}

# ---------- PATCH B: usar a cor no título (replace color '#fff') ----------
$findB = "        background: 'rgba(0,0,0,.5)',
        color: '#fff', fontSize: cfg.productCardNameSize + 'px',"
$replB = "        background: 'rgba(0,0,0,.5)',
        color: cfg.productCardNameColor, fontSize: cfg.productCardNameSize + 'px',"
if ($content.Contains($findB)) {
  $content = $content.Replace($findB, $replB)
  Write-Host "OK: cor do título conectada a cfg.productCardNameColor" -ForegroundColor Green
  $applied++
} else {
  Write-Host "FALHOU: ancora do prodLabel não encontrada" -ForegroundColor Red
}

# ---------- Salvar ----------
[System.IO.File]::WriteAllText((Resolve-Path $file), $content)
Write-Host ""
Write-Host "=== Resultado ===" -ForegroundColor Cyan
Write-Host "Patches aplicados: $applied/2"

# ---------- Validar sintaxe ----------
Write-Host ""
Write-Host "Validando sintaxe com node --check..." -ForegroundColor Cyan
node --check $file
if ($LASTEXITCODE -eq 0) {
  Write-Host "Sintaxe OK: node --check passou" -ForegroundColor Green
} else {
  Write-Host "ERRO de sintaxe! Verifique $file (backup: $file.bak2)" -ForegroundColor Red
}
