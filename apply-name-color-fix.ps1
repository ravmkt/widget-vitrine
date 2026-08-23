# ============================================================
#  Vidlytics - Cor do título (FIX da âncora)
# ============================================================
$ErrorActionPreference = 'Stop'
$file = 'public\widget.js'

if (-not (Test-Path $file)) { Write-Host "ERRO: $file não encontrado" -ForegroundColor Red; exit 1 }

$content = Get-Content $file -Raw

# ---------- PATCH B CORRIGIDO: âncora exata (2 linhas, com padding) ----------
$findB = "        padding: '6px 8px', background: 'rgba(0,0,0,.5)',
        color: '#fff', fontSize: cfg.productCardNameSize + 'px',"

$replB = "        padding: '6px 8px', background: 'rgba(0,0,0,.5)',
        color: cfg.productCardNameColor, fontSize: cfg.productCardNameSize + 'px',"

if ($content.Contains($findB)) {
  $content = $content.Replace($findB, $replB)
  Write-Host "OK: cor do título conectada a cfg.productCardNameColor" -ForegroundColor Green
} else {
  Write-Host "FALHOU: ancora ainda não encontrada. Verificando alternativa..." -ForegroundColor Red
  # Fallback: tentar com apenas a linha do color
  $findB2 = "color: '#fff', fontSize: cfg.productCardNameSize + 'px',"
  if ($content.Contains($findB2)) {
    $content = $content.Replace($findB2, "color: cfg.productCardNameColor, fontSize: cfg.productCardNameSize + 'px',")
    Write-Host "OK (fallback): cor do título conectada" -ForegroundColor Green
  } else {
    Write-Host "ERRO: nenhuma ancora encontrada. Arquivo não alterado." -ForegroundColor Red
    exit 1
  }
}

# ---------- Salvar ----------
[System.IO.File]::WriteAllText((Resolve-Path $file), $content)
Write-Host ""
Write-Host "Arquivo atualizado: $file"
Write-Host ""
Write-Host "Validando sintaxe com node --check..." -ForegroundColor Cyan
node --check $file
if ($LASTEXITCODE -eq 0) {
  Write-Host "Sintaxe OK: node --check passou" -ForegroundColor Green
} else {
  Write-Host "ERRO de sintaxe! Verifique $file" -ForegroundColor Red
}
