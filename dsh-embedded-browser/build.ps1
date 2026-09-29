# Rebuild the DeepSeek Harness desktop app (WebView2 wrapper).
#
# Usage:
#   powershell -File .\build.ps1                        -> build dsh-desktop-new.exe (hot-swap via apply-new.ps1)
#   powershell -File .\build.ps1 -Out dsh-desktop.exe   -> build straight to the live exe (app must be closed)
#
# The old build\packages folder is gone, so reference the WebView2 DLLs that
# already sit next to the exe, falling back to build\packages when it still exists.
# Optional window icon: set $env:DSH_ICON to an .ico path.
param(
    [string]$Out = 'dsh-desktop-new.exe'
)
$ErrorActionPreference = 'Stop'
$app = Split-Path -Parent $MyInvocation.MyCommand.Path
$csc = "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe"

$core = Join-Path $app 'Microsoft.Web.WebView2.Core.dll'
$win  = Join-Path $app 'Microsoft.Web.WebView2.WinForms.dll'
$loaderSrc = Join-Path $app 'WebView2Loader.dll'
$pkRoot = Join-Path $app 'build\packages'
if (Test-Path $pkRoot) {
    $pk = Get-ChildItem $pkRoot -Directory | Sort-Object Name -Descending | Select-Object -First 1
    $core = Join-Path $pk.FullName 'lib\net462\Microsoft.Web.WebView2.Core.dll'
    $win  = Join-Path $pk.FullName 'lib\net462\Microsoft.Web.WebView2.WinForms.dll'
    $loaderSrc = Join-Path $pk.FullName 'build\native\x64\WebView2Loader.dll'
}
foreach ($f in @($core, $win, $loaderSrc, $csc)) {
    if (-not (Test-Path $f)) { Write-Host "MISSING: $f"; exit 1 }
}

$outPath = Join-Path $app $Out
$cscArgs = @(
    '/nologo', '/target:winexe', "/out:$outPath", '/platform:anycpu',
    "/win32manifest:$app\src\app.manifest",
    '/r:System.dll', '/r:System.Core.dll', '/r:System.Windows.Forms.dll',
    '/r:System.Drawing.dll', '/r:System.Web.Extensions.dll',
    "/r:$core", "/r:$win",
    "$app\src\App.cs"
)
if ($env:DSH_ICON -and (Test-Path $env:DSH_ICON)) { $cscArgs = @("/win32icon:$env:DSH_ICON") + $cscArgs }
& $csc @cscArgs
if ($LASTEXITCODE -ne 0) { Write-Host 'BUILD FAILED'; exit 1 }

# Only refresh the loader DLL when it came from a NuGet package (never self-copy).
if ($loaderSrc -notlike "$app\WebView2Loader.dll") {
    Copy-Item $loaderSrc (Join-Path $app 'WebView2Loader.dll') -Force
}
Write-Host ("Build OK: " + $outPath + "  (" + (Get-Item $outPath).Length + " bytes)")
