$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$PluginName = 'in-riproduzione'
$Temp = Join-Path $Root '.decky-package'
$PluginDir = Join-Path $Temp $PluginName
$Zip = Join-Path $Root ($PluginName + '-Decky.zip')

Remove-Item $Temp -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $Zip -Force -ErrorAction SilentlyContinue

New-Item -ItemType Directory -Path $PluginDir | Out-Null

Copy-Item (Join-Path $Root 'plugin.json') $PluginDir -Force
Copy-Item (Join-Path $Root 'package.json') $PluginDir -Force
Copy-Item (Join-Path $Root 'main.py') $PluginDir -Force
Copy-Item (Join-Path $Root 'dist') $PluginDir -Recurse -Force
Copy-Item (Join-Path $Root 'bin') $PluginDir -Recurse -Force

Compress-Archive -Path (Join-Path $Temp '*') -DestinationPath $Zip -Force
Write-Host "Creato: $Zip"