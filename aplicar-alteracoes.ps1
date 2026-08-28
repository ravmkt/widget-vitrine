# aplicar-alteracoes.ps1
$ErrorActionPreference = "Stop"

$root = Get-Location
$settingsPath = Join-Path $root "src/pages/SettingsPage.tsx"

function Read-FileUtf8($path) {
    $raw = [System.IO.File]::ReadAllText($path, [System.Text.UTF8Encoding]::new($false))
    return $raw -replace "`r`n", "`n"
}

function Write-FileUtf8($path, $content) {
    $withCrlf = $content -replace "`n", "`r`n"
    [System.IO.File]::WriteAllText($path, $withCrlf, [System.Text.UTF8Encoding]::new($false))
}

Write-Host "-> Lendo SettingsPage.tsx..."
$content = Read-FileUtf8 $settingsPath
$originalLength = $content.Length

# ============================================================
# EDICAO 1
# ============================================================
$old1 = @'
  return (
    <div className="space-y-8 animate-fade-in pb-20 font-sans">
      {/* ── CABEÇALHO DA PÁGINA COM SELETOR DE TEMA NO CANTO SUPERIOR DIREITO ── */}
'@ -replace "`r`n", "`n"

$new1 = @'
  return (
    <div className="space-y-8 animate-fade-in pb-20 font-sans">
      <form
        noValidate 
        className="space-y-8"
        onSubmit={e => {
          e.preventDefault();
          handleSave();
        }}
      >
        {/* ── CABEÇALHO DA PÁGINA ── */}
'@ -replace "`r`n", "`n"

if ($content.Contains($old1)) {
    $content = $content.Replace($old1, $new1)
    Write-Host "   [OK] Edicao 1"
} else {
    Write-Warning "   [FALHOU] Edicao 1"
}

# ============================================================
# EDICAO 2
# ============================================================
$old2 = @'
        {/* Seletor de Tema Compacto (Pílula) */}
        <div className="flex items-center gap-1 bg-white dark:bg-[#1a1f35]/90 border border-slate-200 dark:border-white/10 p-1.5 rounded-2xl shadow-xs self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setIsDark(false)}
            className={`p-2 rounded-xl transition-all ${!isDark ? 'bg-slate-100 dark:bg-slate-800 text-amber-500 shadow-xs' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            title="Tema Claro"
          >
            <Sun size={18} />
          </button>
          <button
            type="button"
            onClick={() => setIsDark(true)}
            className={`p-2 rounded-xl transition-all ${isDark ? 'bg-slate-100 dark:bg-slate-800 text-[#ff7a29] shadow-xs' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            title="Tema Escuro"
          >
            <Moon size={18} />
          </button>
        </div>
      </div>
'@ -replace "`r`n", "`n"

$new2 = @'
        <Button
          type="submit"
          disabled={saving}
          className="bg-[#0094EB] hover:bg-[#0081cc] dark:bg-[#ff7a29] dark:hover:bg-[#e66c22] text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 dark:shadow-orange-500/30 hover:scale-[1.02] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 self-start sm:self-auto shrink-0"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin !text-white" />
              Salvando...
            </>
          ) : (
            <>
              <Save size={18} />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
'@ -replace "`r`n", "`n"

if ($content.Contains($old2)) {
    $content = $content.Replace($old2, $new2)
    Write-Host "   [OK] Edicao 2"
} else {
    Write-Warning "   [FALHOU] Edicao 2"
}

# ============================================================
# EDICAO 3
# ============================================================
$old3 = @'
      <form
        noValidate 
        className="space-y-8"
        onSubmit={e => {
          e.preventDefault();
          handleSave();
        }}
      >
        {/* ── 1. STATUS GERAL DO VIDLYTICS (Promovido ao topo) ── */}
'@ -replace "`r`n", "`n"

$new3 = @'
        {/* ── 1. STATUS GERAL DO VIDLYTICS (Promovido ao topo) ── */}
'@ -replace "`r`n", "`n"

if ($content.Contains($old3)) {
    $content = $content.Replace($old3, $new3)
    Write-Host "   [OK] Edicao 3"
} else {
    Write-Warning "   [FALHOU] Edicao 3"
}

# ============================================================
# EDICAO 4
# ============================================================
$old4 = @'
              <Switch
                checked={settings?.widget_enabled ?? true}
                onCheckedChange={c =>
                  setSettings(prev => ({ ...prev, widget_enabled: c }))
                }
                className="data-[state=checked]:bg-[#0094EB] dark:data-[state=checked]:!bg-[#ff7a29]"
              />
            </div>
          </div>
        </div>

        {/* ── 1. DADOS DA LOJA ── */}
'@ -replace "`r`n", "`n"

$new4 = @'
              <Switch
                checked={settings?.widget_enabled ?? true}
                onCheckedChange={c =>
                  setSettings(prev => ({ ...prev, widget_enabled: c }))
                }
                className="data-[state=checked]:bg-[#0094EB] dark:data-[state=checked]:!bg-[#ff7a29]"
              />
            </div>
          </div>
        </div>

        {/* ── TEMA DA INTERFACE ── */}
        <div className="rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md shadow-sm p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 dark:border-white/5 pb-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Sun size={20} className="text-[#0094EB] dark:text-[#ff7a29]" /> Tema da Interface
            </h2>
            <p className="text-xs font-medium text-slate-500 dark:text-[#8a90a0] mt-0.5">
              Escolha entre o modo claro ou escuro para o painel administrativo.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setIsDark(false)}
              className={`flex items-center gap-4 rounded-2xl border-2 p-5 transition-all text-left ${!isDark ? 'border-[#0094EB] bg-blue-50/50 dark:bg-[#0f1220]' : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0f1220]/40 hover:border-slate-300 dark:hover:border-white/20'}`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${!isDark ? 'bg-[#0094EB] text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'}`}>
                <Sun size={24} />
              </div>
              <div>
                <span className={`block text-sm font-black ${!isDark ? 'text-[#0094EB] dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                  Tema Claro
                </span>
                <span className="text-xs text-slate-500 dark:text-[#8a90a0]">
                  Interface com cores claras e neutras
                </span>
              </div>
              {!isDark && <CheckCircle2 size={20} className="ml-auto text-[#0094EB]" />}
            </button>

            <button
              type="button"
              onClick={() => setIsDark(true)}
              className={`flex items-center gap-4 rounded-2xl border-2 p-5 transition-all text-left ${isDark ? 'border-[#ff7a29] bg-orange-50/10' : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0f1220]/40 hover:border-slate-300 dark:hover:border-white/20'}`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isDark ? 'bg-[#ff7a29] text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'}`}>
                <Moon size={24} />
              </div>
              <div>
                <span className={`block text-sm font-black ${isDark ? 'text-[#ff7a29]' : 'text-slate-700 dark:text-slate-300'}`}>
                  Tema Escuro
                </span>
                <span className="text-xs text-slate-500 dark:text-[#8a90a0]">
                  Interface com cores escuras e contrastantes
                </span>
              </div>
              {isDark && <CheckCircle2 size={20} className="ml-auto text-[#ff7a29]" />}
            </button>
          </div>
        </div>

        {/* ── 1. DADOS DA LOJA ── */}
'@ -replace "`r`n", "`n"

if ($content.Contains($old4)) {
    $content = $content.Replace($old4, $new4)
    Write-Host "   [OK] Edicao 4"
} else {
    Write-Warning "   [FALHOU] Edicao 4"
}

if ($content.Length -eq $originalLength) {
    Write-Warning "`nNENHUMA alteracao foi aplicada."
} else {
    Write-FileUtf8 $settingsPath $content
    Write-Host "`n✅ Arquivo salvo com sucesso."
}

Write-Host "`nExecute 'npm run build' para verificar."
