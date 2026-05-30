# Copy Blender export from my-app/src to public so the browser can load it.
# Usage:  cd my-app; .\scripts\sync-cafe-map.ps1
#         .\scripts\sync-cafe-map.ps1 -Source "src\games\speedrun-shooter\Untitled1.glb"

param(
  [string]$Source = "src\games\speedrun-shooter\Untitled1.glb"
)

$myApp = Split-Path $PSScriptRoot -Parent
$srcPath = Join-Path $myApp $Source
$dest = Join-Path $myApp "public\games\speedrun-shooter\cafe-map.glb"

if (-not (Test-Path $srcPath)) {
  Write-Error "Source not found: $srcPath"
  exit 1
}

Copy-Item -Path $srcPath -Destination $dest -Force
Get-Item $dest | Format-List FullName, Length, LastWriteTime
Write-Host "Done. Hard-refresh http://localhost:3000/?arena=1"
