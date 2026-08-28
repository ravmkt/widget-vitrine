# corrigir-storydetails.ps1
$ErrorActionPreference = "Stop"

$path = "src/pages/StoryDetailsPage.tsx"

function Read-FileUtf8($p) {
    $raw = [System.IO.File]::ReadAllText($p, [System.Text.UTF8Encoding]::new($false))
    return $raw -replace "`r`n", "`n"
}
function Write-FileUtf8($p, $c) {
    $withCrlf = $c -replace "`n", "`r`n"
    [System.IO.File]::WriteAllText($p, $withCrlf, [System.Text.UTF8Encoding]::new($false))
}

function Remove-ExtraDuplicates($content, $blockText) {
    $normalizedBlock = $blockText -replace "`r`n", "`n"
    $escaped = [regex]::Escape($normalizedBlock)
    $matches = [regex]::Matches($content, $escaped)
    if ($matches.Count -le 1) {
        return $content
    }
    Write-Host "   Encontradas $($matches.Count) ocorrencias - mantendo apenas a primeira"
    # Mantem a primeira ocorrencia, remove as demais
    $result = $content
    for ($i = $matches.Count - 1; $i -ge 1; $i--) {
        $m = $matches[$i]
        $result = $result.Remove($m.Index, $m.Length)
    }
    return $result
}

Write-Host "-> Lendo StoryDetailsPage.tsx..."
$content = Read-FileUtf8 $path

# 1) Corrige import triplicado do Rocket
$content = $content -replace "(?m)^\s*Rocket,\s*\n\s*Rocket,\s*\n\s*Rocket,\s*\n", "  Rocket,`n"
Write-Host "   [OK] Import Rocket corrigido"

# 2) Remove blocos duplicados "Simular Preview"
$blockPreview = @'
{/* ── SIMULAR PREVIEW ── */}
{!isCreate && (
  <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-[#0094EB]">
        <Rocket size={20} />
      </div>
      <div>
        <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">
          Simular Preview
        </h3>
        <p className="text-xs font-bold text-slate-400">
          Veja como ficará na sua loja sem publicar
        </p>
      </div>
    </div>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <input
        type="url"
        placeholder={storeRealUrl || currentStore?.url ? `Ex: ${storeRealUrl || currentStore?.url}` : "Cole a URL de teste (ex: link de um produto)..."}
        value={previewUrl}
        onChange={(e) => setPreviewUrl(e.target.value)}
        className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB] placeholder:text-slate-400"
      />
      <button
        type="button"
        onClick={() => {
          let targetUrl = previewUrl.trim() || storeRealUrl.trim() || currentStore?.url?.trim() || "";
          if (!targetUrl) {
            alert("Por favor, configure a URL da sua loja nas Configurações ou digite uma URL de teste.");
            return;
          }
          if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = "https://" + targetUrl;
          }
          const connector = targetUrl.includes("?") ? "&" : "?";
          const finalPreviewUrl = targetUrl + connector + "vidlytics_preview_story_id=" + stableStoryId;
          window.open(finalPreviewUrl, "_blank", "noopener,noreferrer");
        }}
        className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3.5 text-sm font-black text-white shadow-xl transition-all hover:bg-slate-800 shrink-0"
      >
        🚀 Simular Preview
      </button>
    </div>
  </div>
)}
'@
$content = Remove-ExtraDuplicates $content $blockPreview

# 3) Remove blocos duplicados "BOTÃO SALVAR NO FINAL"
$blockSalvar = @'
{/* ── BOTÃO SALVAR NO FINAL ── */}
<div className="flex justify-end pt-4">
  <button
    type="button"
    onClick={handleSave}
    disabled={isSaving}
    className="flex items-center gap-2 rounded-2xl bg-[#0094EB] px-8 py-3.5 text-sm font-black text-white shadow-xl shadow-blue-100 transition-all hover:bg-[#0E4787] disabled:opacity-60"
  >
    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
  </button>
</div>
'@
$content = Remove-ExtraDuplicates $content $blockSalvar

Write-FileUtf8 $path $content
Write-Host "`n✅ StoryDetailsPage.tsx corrigido e salvo."
Write-Host "Execute 'npm run build' para verificar."
