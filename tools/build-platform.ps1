param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('yandex', 'vk', 'local')]
  [string]$Platform
)

$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$outputRoot = [IO.Path]::GetFullPath((Join-Path $root 'output'))
$destination = [IO.Path]::GetFullPath((Join-Path $outputRoot $Platform))
$zipPath = [IO.Path]::GetFullPath((Join-Path $outputRoot ("crystal-match-{0}.zip" -f $Platform)))
$outputPrefix = $outputRoot.TrimEnd('\') + '\'

if (-not $destination.StartsWith($outputPrefix, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'Invalid output path'
}

if (Test-Path -LiteralPath $destination) {
  Remove-Item -LiteralPath $destination -Recurse -Force
}

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

New-Item -ItemType Directory -Path $destination -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $destination 'platforms') -Force | Out-Null

Copy-Item -LiteralPath (Join-Path $root 'index.html') -Destination (Join-Path $destination 'index.html')
foreach ($directory in @('css', 'js', 'sounds', 'sprites')) {
  Copy-Item -LiteralPath (Join-Path $root $directory) -Destination (Join-Path $destination $directory) -Recurse
}
Copy-Item -LiteralPath (Join-Path $root ("platforms\{0}" -f $Platform)) -Destination (Join-Path $destination 'platforms') -Recurse

$indexPath = Join-Path $destination 'index.html'
$index = [IO.File]::ReadAllText($indexPath)
if ($Platform -ne 'yandex') {
  $index = $index.Replace('  <script src="/sdk.js"></script>' + [Environment]::NewLine, '')
  $index = $index.Replace('platforms/yandex/', ("platforms/{0}/" -f $Platform))
}
$utf8 = New-Object Text.UTF8Encoding($false)
[IO.File]::WriteAllText($indexPath, $index, $utf8)

Compress-Archive -Path (Join-Path $destination '*') -DestinationPath $zipPath -CompressionLevel Optimal

Write-Output $destination
Write-Output $zipPath
